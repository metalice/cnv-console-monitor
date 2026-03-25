import crypto from 'crypto';

import { logger } from '../logger';

import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { OllamaProvider } from './providers/ollama';
import { OpenAIProvider } from './providers/openai';
import { VertexClaudeProvider } from './providers/vertex-claude';
import { getPrompt, listPrompts } from './PromptManager';
import type {
  AIConfig,
  AIResponse,
  ChatMessage,
  ModelInfo,
  ModelOptions,
  ModelProvider,
  UsageRecord,
} from './types';

const log = logger.child({ module: 'AI' });

class AIService {
  private cache = new Map<string, { response: AIResponse; expiresAt: number }>();
  private defaultModelId = '';
  private defaultProvider = '';
  private enabled = false;
  private providers = new Map<string, ModelProvider>();

  private usageLog: UsageRecord[] = [];

  private computeCacheKey(messages: ChatMessage[], provider: string): string {
    const content = JSON.stringify({ messages, provider });
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async loadFromDbCache(key: string): Promise<AIResponse | null> {
    const { AppDataSource } = await import('../db/data-source');
    const { AICache } = await import('../db/entities/AICache');
    const row = await AppDataSource.getRepository(AICache).findOneBy({ prompt_hash: key });
    if (!row || row.expires_at < Date.now()) {
      return null;
    }
    return JSON.parse(row.response) as AIResponse;
  }

  private logUsage(messages: ChatMessage[], response: AIResponse): void {
    const prompt = messages
      .map(msg => msg.content)
      .join(' ')
      .substring(0, 200);
    this.usageLog.push({
      cached: response.cached,
      durationMs: response.durationMs,
      model: response.model,
      prompt,
      provider: response.provider,
      timestamp: Date.now(),
      tokensUsed: response.tokensUsed,
    });

    if (this.usageLog.length > 1000) {
      this.usageLog = this.usageLog.slice(-500);
    }

    log.info(
      {
        cached: response.cached,
        durationMs: response.durationMs,
        model: response.model,
        provider: response.provider,
        tokens: response.tokensUsed,
      },
      'AI request completed',
    );
  }

  private async saveToDbCache(
    key: string,
    response: AIResponse,
    provider: string,
    expiresAt: number,
  ): Promise<void> {
    const { AppDataSource } = await import('../db/data-source');
    const { AICache } = await import('../db/entities/AICache');
    await AppDataSource.getRepository(AICache).upsert(
      {
        expires_at: expiresAt,
        model: response.model,
        prompt_hash: key,
        provider,
        response: JSON.stringify(response),
        tokens_used: response.tokensUsed,
      },
      { conflictPaths: ['prompt_hash'] },
    );
  }

  async chat(
    messages: ChatMessage[],
    options?: ModelOptions & { provider?: string; useCache?: boolean; cacheTtlMs?: number },
  ): Promise<AIResponse> {
    if (!this.enabled) {
      throw new Error('AI is not enabled');
    }

    const providerName = options?.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(
        `AI provider '${providerName}' not configured. Available: ${[...this.providers.keys()].join(', ')}`,
      );
    }
    if (!provider.isAvailable()) {
      throw new Error(`AI provider '${providerName}' is not available`);
    }

    const useCache = options?.useCache !== false;
    const cacheTtlMs = options?.cacheTtlMs ?? 60 * 60 * 1000;

    const cacheKey = useCache ? this.computeCacheKey(messages, providerName) : '';

    if (useCache) {
      const memCached = this.cache.get(cacheKey);
      if (memCached && memCached.expiresAt > Date.now()) {
        return { ...memCached.response, cached: true };
      }
      try {
        const dbCached = await this.loadFromDbCache(cacheKey);
        if (dbCached) {
          this.cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, response: dbCached });
          return { ...dbCached, cached: true };
        }
      } catch {
        /* DB cache miss */
      }
    }

    const start = Date.now();
    try {
      const modelOpts =
        this.defaultModelId && !options?.model
          ? { ...options, model: this.defaultModelId }
          : options;
      const response = await provider.chat(messages, modelOpts);

      if (useCache) {
        this.cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, response });
        this.saveToDbCache(cacheKey, response, providerName, Date.now() + cacheTtlMs).catch(() => {
          // no-op
        });
      }

      this.logUsage(messages, response);
      return response;
    } catch (err) {
      log.error({ durationMs: Date.now() - start, err, provider: providerName }, 'AI chat failed');
      throw err;
    }
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: ModelOptions & { provider?: string },
  ): AsyncGenerator<string> {
    if (!this.enabled) {
      throw new Error('AI is not enabled');
    }

    const providerName = options?.provider || this.defaultProvider;
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`AI provider '${providerName}' not configured`);
    }
    if (!provider.isAvailable()) {
      throw new Error(`AI provider '${providerName}' is not available`);
    }
    if (!provider.supportsStreaming() || !provider.chatStream) {
      const response = await provider.chat(messages, options);
      yield response.content;
      return;
    }

    const modelOpts =
      this.defaultModelId && !options?.model ? { ...options, model: this.defaultModelId } : options;
    yield* provider.chatStream(messages, modelOpts);
  }

  clearCache(): void {
    this.cache.clear();
    import('../db/data-source')
      .then(({ AppDataSource }) =>
        import('../db/entities/AICache').then(({ AICache }) =>
          AppDataSource.getRepository(AICache).clear(),
        ),
      )
      .catch(() => {
        // no-op
      });
    log.info('AI cache cleared');
  }

  configure(config: AIConfig): void {
    this.enabled = config.enabled;
    this.defaultProvider = config.defaultModel || 'gemini';
    this.defaultModelId = config.defaultModelId || '';
    this.providers.clear();

    if (config.geminiKey) {
      this.providers.set('gemini', new GeminiProvider(config.geminiKey));
    }
    if (config.openaiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openaiKey));
    }
    if (config.anthropicKey) {
      this.providers.set('anthropic', new AnthropicProvider(config.anthropicKey));
    }
    if (config.ollamaUrl) {
      this.providers.set('ollama', new OllamaProvider(config.ollamaUrl));
    }
    if (config.vertexProjectId) {
      this.providers.set(
        'vertex-claude',
        new VertexClaudeProvider({
          accessToken: config.vertexAccessToken,
          projectId: config.vertexProjectId,
          region: config.vertexRegion,
        }),
      );
    }

    log.info(
      { default: this.defaultProvider, providers: [...this.providers.keys()] },
      'AI service configured',
    );
  }

  getAvailableModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.listModels());
    }
    return models;
  }

  getAvailableProviders(): string[] {
    return [...this.providers.keys()].filter(k => this.providers.get(k)?.isAvailable());
  }

  getStreamableProviders(): string[] {
    return [...this.providers.entries()]
      .filter(([, modelProvider]) => modelProvider.supportsStreaming())
      .map(([name]) => name);
  }

  getUsageStats(): {
    total: number;
    last24h: number;
    byProvider: Record<string, number>;
    totalTokens: number;
  } {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const byProvider: Record<string, number> = {};
    let totalTokens = 0;
    let last24h = 0;

    for (const record of this.usageLog) {
      byProvider[record.provider] = (byProvider[record.provider] ?? 0) + 1;
      totalTokens += record.tokensUsed;
      if (now - record.timestamp < day) {
        last24h++;
      }
    }

    return { byProvider, last24h, total: this.usageLog.length, totalTokens };
  }

  getVertexProvider(): VertexClaudeProvider | undefined {
    return this.providers.get('vertex-claude') as VertexClaudeProvider | undefined;
  }

  isEnabled(): boolean {
    return this.enabled && this.providers.size > 0;
  }

  listPromptTemplates(): string[] {
    return listPrompts();
  }

  async runPrompt(
    promptName: string,
    vars: Record<string, unknown>,
    options?: ModelOptions & { provider?: string; useCache?: boolean; cacheTtlMs?: number },
  ): Promise<AIResponse> {
    const prompt = getPrompt(promptName, vars);
    const messages: ChatMessage[] = [];
    if (prompt.system) {
      messages.push({ content: prompt.system, role: 'system' });
    }
    if (prompt.user) {
      messages.push({ content: prompt.user, role: 'user' });
    }
    return this.chat(messages, options);
  }
}

let instance: AIService | null = null;

export const getAIService = (): AIService => {
  instance ??= new AIService();
  return instance;
};

export const initAIService = async (): Promise<AIService> => {
  const ai = getAIService();
  try {
    const { getSetting } = await import('../db/store');
    const config: AIConfig = {
      anthropicKey: (await getSetting('ai.anthropicKey')) || '',
      defaultModel: (await getSetting('ai.defaultModel')) || 'gemini',
      defaultModelId: (await getSetting('ai.defaultModelId')) || '',
      enabled: (await getSetting('ai.enabled')) === 'true',
      geminiKey: (await getSetting('ai.geminiKey')) || '',
      ollamaUrl: (await getSetting('ai.ollamaUrl')) || '',
      openaiKey: (await getSetting('ai.openaiKey')) || '',
      vertexAccessToken: (await getSetting('ai.vertexAccessToken')) || '',
      vertexProjectId: (await getSetting('ai.vertexProjectId')) || '',
      vertexRegion: (await getSetting('ai.vertexRegion')) || 'us-east5',
    };
    ai.configure(config);
  } catch {
    log.warn('Failed to load AI config from DB, AI disabled');
  }
  return ai;
};
