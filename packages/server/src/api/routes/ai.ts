import { Router, Request, Response, NextFunction } from 'express';
import { getAIService } from '../../ai';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';
import { setSetting, getSetting } from '../../db/store';

const log = logger.child({ module: 'AI-API' });
const router = Router();

const parseAIJson = (content: string): Record<string, unknown> => {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch { return { raw: content }; }
};

router.get('/status', async (_req: Request, res: Response) => {
  const ai = getAIService();
  const defaultModel = (await getSetting('ai.defaultModel')) || 'gemini';
  const defaultModelId = (await getSetting('ai.defaultModelId')) || '';

  const vertexProvider = ai.getVertexProvider();
  let vertexTokenInfo: {
    expiresIn: number | null; expiresAt: string | null; email: string | null;
    authMode: 'manual' | 'adc' | 'none'; adcAvailable: boolean; hasManualToken: boolean;
  } = { expiresIn: null, expiresAt: null, email: null, authMode: 'none', adcAvailable: false, hasManualToken: false };

  const vertexToken = await getSetting('ai.vertexAccessToken');
  const [authInfo, tokenCheck] = await Promise.all([
    vertexProvider ? vertexProvider.getAuthInfo() : null,
    vertexToken
      ? import('axios').then(({ default: ax }) => ax.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${vertexToken}`, { timeout: 3000 })).catch(() => null)
      : null,
  ]);

  if (authInfo) {
    vertexTokenInfo.authMode = authInfo.activeMode;
    vertexTokenInfo.adcAvailable = authInfo.adcAvailable;
    vertexTokenInfo.hasManualToken = authInfo.hasManualToken;
  }
  if (tokenCheck?.data) {
    const expiresIn = parseInt(tokenCheck.data.expires_in, 10);
    vertexTokenInfo.expiresIn = isNaN(expiresIn) ? null : expiresIn;
    vertexTokenInfo.expiresAt = isNaN(expiresIn) ? null : new Date(Date.now() + expiresIn * 1000).toISOString();
    vertexTokenInfo.email = tokenCheck.data.email || null;
  } else if (vertexToken) {
    vertexTokenInfo.expiresIn = 0;
  }

  res.json({
    enabled: ai.isEnabled(),
    defaultModel,
    defaultModelId,
    providers: ai.getAvailableProviders(),
    models: ai.getAvailableModels(),
    prompts: ai.listPromptTemplates(),
    vertexTokenInfo,
  });
});

router.get('/models', (_req: Request, res: Response) => {
  const ai = getAIService();
  res.json(ai.getAvailableModels());
});

router.get('/usage', (_req: Request, res: Response) => {
  const ai = getAIService();
  res.json(ai.getUsageStats());
});

router.post('/chat', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { messages, provider, temperature, maxTokens, json } = req.body;
    if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: 'messages array required' }); return; }

    const response = await ai.chat(messages, { provider, temperature, maxTokens, json });
    res.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI chat failed';
    log.error({ err }, msg);
    res.status(502).json({ error: msg });
  }
});

router.post('/stream', requireAdmin, async (req: Request, res: Response) => {
  const ai = getAIService();
  if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

  const { messages, provider, temperature, maxTokens } = req.body;
  if (!messages || !Array.isArray(messages)) { res.status(400).json({ error: 'messages array required' }); return; }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    let totalContent = '';
    for await (const chunk of ai.chatStream(messages, { provider, temperature, maxTokens })) {
      totalContent += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true, content: totalContent })}\n\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Streaming failed';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }
  res.end();
});

router.post('/prompt/:name', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { name } = req.params;
    const { vars, provider, temperature, maxTokens } = req.body;

    const response = await ai.runPrompt(name as string, vars || {}, { provider, temperature, maxTokens });
    res.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI prompt failed';
    log.error({ err }, msg);
    res.status(502).json({ error: msg });
  }
});

router.post('/configure', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { enabled, defaultModel, defaultModelId, geminiKey, openaiKey, anthropicKey, ollamaUrl, vertexProjectId, vertexRegion, vertexAccessToken } = req.body;
    const by = req.user?.name || 'system';

    if (enabled !== undefined) await setSetting('ai.enabled', String(enabled), by);
    if (defaultModel) await setSetting('ai.defaultModel', defaultModel, by);
    if (defaultModelId !== undefined) await setSetting('ai.defaultModelId', defaultModelId, by);
    if (geminiKey !== undefined) await setSetting('ai.geminiKey', geminiKey, by);
    if (openaiKey !== undefined) await setSetting('ai.openaiKey', openaiKey, by);
    if (anthropicKey !== undefined) await setSetting('ai.anthropicKey', anthropicKey, by);
    if (ollamaUrl !== undefined) await setSetting('ai.ollamaUrl', ollamaUrl, by);
    if (vertexProjectId !== undefined) await setSetting('ai.vertexProjectId', vertexProjectId, by);
    if (vertexRegion !== undefined) await setSetting('ai.vertexRegion', vertexRegion, by);
    if (vertexAccessToken !== undefined) await setSetting('ai.vertexAccessToken', vertexAccessToken, by);

    const ai = getAIService();
    const load = async (key: string, fallback: string) => (await getSetting(key)) || fallback;

    ai.configure({
      enabled: enabled ?? ai.isEnabled(),
      defaultModel: defaultModel || await load('ai.defaultModel', 'gemini'),
      defaultModelId: defaultModelId !== undefined ? defaultModelId : await load('ai.defaultModelId', ''),
      geminiKey: geminiKey !== undefined ? geminiKey : await load('ai.geminiKey', ''),
      openaiKey: openaiKey !== undefined ? openaiKey : await load('ai.openaiKey', ''),
      anthropicKey: anthropicKey !== undefined ? anthropicKey : await load('ai.anthropicKey', ''),
      ollamaUrl: ollamaUrl !== undefined ? ollamaUrl : await load('ai.ollamaUrl', ''),
      vertexProjectId: vertexProjectId !== undefined ? vertexProjectId : await load('ai.vertexProjectId', ''),
      vertexRegion: vertexRegion !== undefined ? vertexRegion : await load('ai.vertexRegion', 'us-east5'),
      vertexAccessToken: vertexAccessToken !== undefined ? vertexAccessToken : await load('ai.vertexAccessToken', ''),
    });

    res.json({ success: true, providers: ai.getAvailableProviders() });
  } catch (err) { next(err); }
});

router.post('/test-connection', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    const { provider } = req.body;
    if (!provider) { res.status(400).json({ error: 'provider required' }); return; }

    const response = await ai.chat(
      [{ role: 'user', content: 'Reply with exactly: "Connection successful"' }],
      { provider, maxTokens: 50, temperature: 0 },
    );
    res.json({ success: true, model: response.model, durationMs: response.durationMs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.json({ success: false, error: msg });
  }
});

router.post('/clear-cache', requireAdmin, (_req: Request, res: Response) => {
  getAIService().clearCache();
  res.json({ success: true });
});

router.post('/analyze-failure', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { testName, component, status, errorMessage, recentRuns, triageHistory } = req.body;
    if (!testName || !errorMessage) { res.status(400).json({ error: 'testName and errorMessage required' }); return; }

    const response = await ai.runPrompt('failure-analysis', {
      testName, component: component || 'Unknown', status: status || 'FAILED',
      errorMessage: errorMessage.substring(0, 3000),
      recentRuns: recentRuns || [],
      triageHistory: triageHistory || [],
    }, { json: true, cacheTtlMs: 60 * 60 * 1000 });

    const analysis = parseAIJson(response.content);
    res.json({ analysis, model: response.model, tokensUsed: response.tokensUsed, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
});

router.post('/suggest-triage', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { testName, component, errorMessage, consecutiveFailures } = req.body;
    if (!testName || !errorMessage) { res.status(400).json({ error: 'testName and errorMessage required' }); return; }

    const response = await ai.runPrompt('smart-triage', {
      testName, component: component || 'Unknown',
      errorMessage: errorMessage.substring(0, 2000),
      consecutiveFailures: consecutiveFailures || 1,
    }, { json: true, cacheTtlMs: 30 * 60 * 1000 });

    const suggestion = parseAIJson(response.content);
    res.json({ suggestion, model: response.model, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Triage suggestion failed' });
  }
});

router.post('/generate-bug-report', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { testName, component, errorMessage, version, recentRuns } = req.body;
    const messages: import('../../ai/types').ChatMessage[] = [
      { role: 'system', content: 'You are a QE engineer writing a Jira bug report for CNV (OpenShift Virtualization). Write a clear, structured bug report with: Title, Description, Steps to Reproduce, Expected Result, Actual Result, Affected Versions, and Component. Output as JSON with keys: title, description, stepsToReproduce, expectedResult, actualResult, affectedVersions, component, priority.' },
      { role: 'user', content: `Test: ${testName}\nComponent: ${component || 'Unknown'}\nVersion: ${version || 'Unknown'}\nError:\n${(errorMessage || '').substring(0, 3000)}\n\nRecent runs: ${JSON.stringify(recentRuns || []).substring(0, 500)}` },
    ];

    const response = await ai.chat(messages, { json: true, cacheTtlMs: 60 * 60 * 1000 });
    const report = parseAIJson(response.content);
    res.json({ report, model: response.model, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Bug report generation failed' });
  }
});

router.post('/daily-digest', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const response = await ai.runPrompt('daily-digest', req.body || {}, { cacheTtlMs: 30 * 60 * 1000 });
    res.json({ digest: response.content, model: response.model, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Digest generation failed' });
  }
});

router.post('/nl-search', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const { query } = req.body;
    if (!query) { res.status(400).json({ error: 'query required' }); return; }

    const response = await ai.runPrompt('nl-search', { query }, { json: true, cacheTtlMs: 5 * 60 * 1000 });
    const result = parseAIJson(response.content);
    res.json({ result, model: response.model, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Search failed' });
  }
});

router.post('/risk-assessment', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }

    const response = await ai.runPrompt('risk-assessment', req.body || {}, { json: true, cacheTtlMs: 60 * 60 * 1000 });
    const assessment = parseAIJson(response.content);
    res.json({ assessment, model: response.model, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk assessment failed' });
  }
});

const genericPromptHandler = (promptName: string, cacheTtlMs = 60 * 60 * 1000) =>
  async (req: Request, res: Response) => {
    try {
      const ai = getAIService();
      if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }
      const response = await ai.runPrompt(promptName, req.body || {}, { json: true, cacheTtlMs });
      const parsed = parseAIJson(response.content);
      res.json({ result: parsed, model: response.model, tokensUsed: response.tokensUsed, cached: response.cached, durationMs: response.durationMs });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : `${promptName} failed` });
    }
  };

router.post('/health-narrative', genericPromptHandler('health-narrative'));
router.post('/standup-summary', genericPromptHandler('standup-summary', 30 * 60 * 1000));
router.post('/post-mortem', genericPromptHandler('post-mortem'));
router.post('/effort-estimation', genericPromptHandler('effort-estimation'));
router.post('/coverage-gap', genericPromptHandler('coverage-gap'));
router.post('/failure-clustering', genericPromptHandler('failure-clustering'));
router.post('/regression-detection', genericPromptHandler('regression-detection'));
router.post('/flaky-analysis', genericPromptHandler('flaky-analysis'));
router.post('/anomaly-detection', genericPromptHandler('anomaly-detection'));
router.post('/cross-version', genericPromptHandler('cross-version'));
router.post('/incident-timeline', genericPromptHandler('incident-timeline'));
router.post('/test-priority', genericPromptHandler('test-priority'));
router.post('/chat-explorer', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) { res.status(400).json({ error: 'AI is not enabled' }); return; }
    const response = await ai.runPrompt('chat-explorer', req.body || {}, { cacheTtlMs: 5 * 60 * 1000 });
    res.json({ response: response.content, model: response.model, tokensUsed: response.tokensUsed, cached: response.cached });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Chat failed' });
  }
});

export default router;
