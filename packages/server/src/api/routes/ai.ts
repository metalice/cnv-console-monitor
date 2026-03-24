/* eslint-disable max-lines */
import { type NextFunction, type Request, type Response, Router } from 'express';

import { getAIService } from '../../ai';
import type { ChatMessage } from '../../ai/types';
import { getSetting, setSetting } from '../../db/store';
import { logger } from '../../logger';
import { requireAdmin } from '../middleware/auth';

const log = logger.child({ module: 'AI-API' });
const router = Router();

type TokenInfoResponse = {
  expires_in: string;
  email: string;
};

type ChatBody = {
  messages: ChatMessage[];
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

type StreamBody = {
  messages: ChatMessage[];
  provider?: string;
  temperature?: number;
  maxTokens?: number;
};

type PromptBody = {
  vars?: Record<string, unknown>;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
};

type ConfigureBody = {
  enabled?: boolean;
  defaultModel?: string;
  defaultModelId?: string;
  geminiKey?: string;
  openaiKey?: string;
  anthropicKey?: string;
  ollamaUrl?: string;
  vertexProjectId?: string;
  vertexRegion?: string;
  vertexAccessToken?: string;
};

type TestConnectionBody = {
  provider: string;
};

type AnalyzeFailureBody = {
  testName: string;
  errorMessage: string;
  component?: string;
  status?: string;
  recentRuns?: unknown[];
  triageHistory?: unknown[];
};

type SuggestTriageBody = {
  testName: string;
  errorMessage: string;
  component?: string;
  consecutiveFailures?: number;
};

type GenerateBugReportBody = {
  testName: string;
  errorMessage?: string;
  component?: string;
  version?: string;
  recentRuns?: unknown[];
};

type NlSearchBody = {
  query: string;
};

const parseAIJson = (content: string): Record<string, unknown> => {
  let cleaned = content.trim();
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\n?```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return { raw: content };
  }
};

router.get('/status', async (_req: Request, res: Response) => {
  const ai = getAIService();
  const defaultModel = (await getSetting('ai.defaultModel')) || 'gemini';
  const defaultModelId = (await getSetting('ai.defaultModelId')) || '';

  const vertexProvider = ai.getVertexProvider();
  const vertexTokenInfo: {
    expiresIn: number | null;
    expiresAt: string | null;
    email: string | null;
    authMode: 'manual' | 'adc' | 'none';
    adcAvailable: boolean;
    hasManualToken: boolean;
  } = {
    adcAvailable: false,
    authMode: 'none',
    email: null,
    expiresAt: null,
    expiresIn: null,
    hasManualToken: false,
  };

  const vertexToken = await getSetting('ai.vertexAccessToken');
  const [authInfo, tokenCheck] = await Promise.all([
    vertexProvider ? vertexProvider.getAuthInfo() : null,
    vertexToken
      ? import('axios')
          .then(({ default: ax }) =>
            ax.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${vertexToken}`, {
              timeout: 3000,
            }),
          )
          .catch(() => null)
      : null,
  ]);

  if (authInfo) {
    vertexTokenInfo.authMode = authInfo.activeMode;
    vertexTokenInfo.adcAvailable = authInfo.adcAvailable;
    vertexTokenInfo.hasManualToken = authInfo.hasManualToken;
  }
  if (tokenCheck?.data) {
    const tokenData = tokenCheck.data as TokenInfoResponse;
    const expiresIn = parseInt(tokenData.expires_in, 10);
    vertexTokenInfo.expiresIn = isNaN(expiresIn) ? null : expiresIn;
    vertexTokenInfo.expiresAt = isNaN(expiresIn)
      ? null
      : new Date(Date.now() + expiresIn * 1000).toISOString();
    vertexTokenInfo.email = tokenData.email || null;
  } else if (vertexToken) {
    vertexTokenInfo.expiresIn = 0;
  }

  res.json({
    defaultModel,
    defaultModelId,
    enabled: ai.isEnabled(),
    models: ai.getAvailableModels(),
    prompts: ai.listPromptTemplates(),
    providers: ai.getAvailableProviders(),
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

router.post('/chat', requireAdmin, async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const { json, maxTokens, messages, provider, temperature } = req.body as ChatBody;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime request body
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'messages array required' });
      return;
    }

    const response = await ai.chat(messages, { json, maxTokens, provider, temperature });
    res.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI chat failed';
    log.error({ err }, msg);
    res.status(502).json({ error: msg });
  }
});

router.post('/stream', requireAdmin, async (req: Request, res: Response) => {
  const ai = getAIService();
  if (!ai.isEnabled()) {
    res.status(400).json({ error: 'AI is not enabled' });
    return;
  }

  const { maxTokens, messages, provider, temperature } = req.body as StreamBody;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime request body
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array required' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    let totalContent = '';
    for await (const chunk of ai.chatStream(messages, { maxTokens, provider, temperature })) {
      totalContent += chunk;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ content: totalContent, done: true })}\n\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Streaming failed';
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }
  res.end();
});

router.post(
  '/prompt/:name',
  requireAdmin,
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const ai = getAIService();
      if (!ai.isEnabled()) {
        res.status(400).json({ error: 'AI is not enabled' });
        return;
      }

      const { name } = req.params;
      const { maxTokens, provider, temperature, vars } = req.body as PromptBody;

      const response = await ai.runPrompt(name as string, vars ?? {}, {
        maxTokens,
        provider,
        temperature,
      });
      res.json(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI prompt failed';
      log.error({ err }, msg);
      res.status(502).json({ error: msg });
    }
  },
);

router.post('/configure', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      anthropicKey,
      defaultModel,
      defaultModelId,
      enabled,
      geminiKey,
      ollamaUrl,
      openaiKey,
      vertexAccessToken,
      vertexProjectId,
      vertexRegion,
    } = req.body as ConfigureBody;
    const by = req.user?.name || 'system';

    if (enabled !== undefined) {
      await setSetting('ai.enabled', String(enabled), by);
    }
    if (defaultModel) {
      await setSetting('ai.defaultModel', defaultModel, by);
    }
    if (defaultModelId !== undefined) {
      await setSetting('ai.defaultModelId', defaultModelId, by);
    }
    if (geminiKey !== undefined) {
      await setSetting('ai.geminiKey', geminiKey, by);
    }
    if (openaiKey !== undefined) {
      await setSetting('ai.openaiKey', openaiKey, by);
    }
    if (anthropicKey !== undefined) {
      await setSetting('ai.anthropicKey', anthropicKey, by);
    }
    if (ollamaUrl !== undefined) {
      await setSetting('ai.ollamaUrl', ollamaUrl, by);
    }
    if (vertexProjectId !== undefined) {
      await setSetting('ai.vertexProjectId', vertexProjectId, by);
    }
    if (vertexRegion !== undefined) {
      await setSetting('ai.vertexRegion', vertexRegion, by);
    }
    if (vertexAccessToken !== undefined) {
      await setSetting('ai.vertexAccessToken', vertexAccessToken, by);
    }

    const ai = getAIService();
    const load = async (key: string, fallback: string) => (await getSetting(key)) || fallback;

    ai.configure({
      anthropicKey: anthropicKey ?? (await load('ai.anthropicKey', '')),
      defaultModel: defaultModel ?? (await load('ai.defaultModel', 'gemini')),
      defaultModelId: defaultModelId ?? (await load('ai.defaultModelId', '')),
      enabled: enabled ?? ai.isEnabled(),
      geminiKey: geminiKey ?? (await load('ai.geminiKey', '')),
      ollamaUrl: ollamaUrl ?? (await load('ai.ollamaUrl', '')),
      openaiKey: openaiKey ?? (await load('ai.openaiKey', '')),
      vertexAccessToken: vertexAccessToken ?? (await load('ai.vertexAccessToken', '')),
      vertexProjectId: vertexProjectId ?? (await load('ai.vertexProjectId', '')),
      vertexRegion: vertexRegion ?? (await load('ai.vertexRegion', 'us-east5')),
    });

    res.json({ providers: ai.getAvailableProviders(), success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/test-connection', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    const { provider } = req.body as TestConnectionBody;
    if (!provider) {
      res.status(400).json({ error: 'provider required' });
      return;
    }

    const modelId = (await getSetting('ai.defaultModelId')) || undefined;
    const response = await ai.chat(
      [{ content: 'Reply with exactly: "Connection successful"', role: 'user' }],
      { maxTokens: 50, model: modelId, provider, temperature: 0, useCache: false },
    );
    res.json({ durationMs: response.durationMs, model: response.model, success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    res.json({ error: msg, success: false });
  }
});

router.post('/clear-cache', requireAdmin, (_req: Request, res: Response) => {
  getAIService().clearCache();
  res.json({ success: true });
});

router.post('/analyze-failure', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const { component, errorMessage, recentRuns, status, testName, triageHistory } =
      req.body as AnalyzeFailureBody;
    if (!testName || !errorMessage) {
      res.status(400).json({ error: 'testName and errorMessage required' });
      return;
    }

    const response = await ai.runPrompt(
      'failure-analysis',
      {
        component: component || 'Unknown',
        errorMessage: errorMessage.substring(0, 3000),
        recentRuns: recentRuns ?? [],
        status: status ?? 'FAILED',
        testName,
        triageHistory: triageHistory ?? [],
      },
      { cacheTtlMs: 60 * 60 * 1000, json: true },
    );

    const analysis = parseAIJson(response.content);
    res.json({
      analysis,
      cached: response.cached,
      model: response.model,
      tokensUsed: response.tokensUsed,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Analysis failed' });
  }
});

router.post('/suggest-triage', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const { component, consecutiveFailures, errorMessage, testName } =
      req.body as SuggestTriageBody;
    if (!testName || !errorMessage) {
      res.status(400).json({ error: 'testName and errorMessage required' });
      return;
    }

    const response = await ai.runPrompt(
      'smart-triage',
      {
        component: component || 'Unknown',
        consecutiveFailures: consecutiveFailures || 1,
        errorMessage: errorMessage.substring(0, 2000),
        testName,
      },
      { cacheTtlMs: 30 * 60 * 1000, json: true },
    );

    const suggestion = parseAIJson(response.content);
    res.json({ cached: response.cached, model: response.model, suggestion });
  } catch (err) {
    res
      .status(502)
      .json({ error: err instanceof Error ? err.message : 'Triage suggestion failed' });
  }
});

router.post('/generate-bug-report', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const { component, errorMessage, recentRuns, testName, version } =
      req.body as GenerateBugReportBody;
    const messages: ChatMessage[] = [
      {
        content:
          'You are a QE engineer writing a Jira bug report for CNV (OpenShift Virtualization). Write a clear, structured bug report with: Title, Description, Steps to Reproduce, Expected Result, Actual Result, Affected Versions, and Component. Output as JSON with keys: title, description, stepsToReproduce, expectedResult, actualResult, affectedVersions, component, priority.',
        role: 'system',
      },
      {
        content: `Test: ${testName}\nComponent: ${component ?? 'Unknown'}\nVersion: ${version ?? 'Unknown'}\nError:\n${(errorMessage ?? '').substring(0, 3000)}\n\nRecent runs: ${JSON.stringify(recentRuns ?? []).substring(0, 500)}`,
        role: 'user',
      },
    ];

    const response = await ai.chat(messages, { cacheTtlMs: 60 * 60 * 1000, json: true });
    const report = parseAIJson(response.content);
    res.json({ cached: response.cached, model: response.model, report });
  } catch (err) {
    res
      .status(502)
      .json({ error: err instanceof Error ? err.message : 'Bug report generation failed' });
  }
});

router.post('/daily-digest', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const response = await ai.runPrompt('daily-digest', body, {
      cacheTtlMs: 30 * 60 * 1000,
    });
    res.json({ cached: response.cached, digest: response.content, model: response.model });
  } catch (err) {
    res
      .status(502)
      .json({ error: err instanceof Error ? err.message : 'Digest generation failed' });
  }
});

router.post('/nl-search', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const { query } = req.body as NlSearchBody;
    if (!query) {
      res.status(400).json({ error: 'query required' });
      return;
    }

    const response = await ai.runPrompt(
      'nl-search',
      { query },
      { cacheTtlMs: 5 * 60 * 1000, json: true },
    );
    const result = parseAIJson(response.content);
    res.json({ cached: response.cached, model: response.model, result });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Search failed' });
  }
});

router.post('/risk-assessment', requireAdmin, async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }

    const riskBody = (req.body || {}) as Record<string, unknown>;
    const response = await ai.runPrompt('risk-assessment', riskBody, {
      cacheTtlMs: 60 * 60 * 1000,
      json: true,
    });
    const assessment = parseAIJson(response.content);
    res.json({ assessment, cached: response.cached, model: response.model });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Risk assessment failed' });
  }
});

const genericPromptHandler =
  (promptName: string, cacheTtlMs = 60 * 60 * 1000) =>
  async (req: Request, res: Response) => {
    try {
      const ai = getAIService();
      if (!ai.isEnabled()) {
        res.status(400).json({ error: 'AI is not enabled' });
        return;
      }
      const promptBody = (req.body || {}) as Record<string, unknown>;
      const response = await ai.runPrompt(promptName, promptBody, { cacheTtlMs, json: true });
      const parsed = parseAIJson(response.content);
      res.json({
        cached: response.cached,
        durationMs: response.durationMs,
        model: response.model,
        result: parsed,
        tokensUsed: response.tokensUsed,
      });
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
    if (!ai.isEnabled()) {
      res.status(400).json({ error: 'AI is not enabled' });
      return;
    }
    const chatBody = (req.body || {}) as Record<string, unknown>;
    const response = await ai.runPrompt('chat-explorer', chatBody, {
      cacheTtlMs: 5 * 60 * 1000,
    });
    res.json({
      cached: response.cached,
      model: response.model,
      response: response.content,
      tokensUsed: response.tokensUsed,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Chat failed' });
  }
});

export default router;
