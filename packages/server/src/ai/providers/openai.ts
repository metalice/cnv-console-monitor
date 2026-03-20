import OpenAI from 'openai';
import type { ModelProvider, ChatMessage, ModelOptions, AIResponse, ModelInfo } from '../types';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements ModelProvider {
  readonly name = 'openai';
  readonly displayName = 'OpenAI';
  private client: OpenAI | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) this.client = new OpenAI({ apiKey });
  }

  isAvailable(): boolean {
    return !!this.client && !!this.apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', available: this.isAvailable() },
      { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', available: this.isAvailable() },
      { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', available: this.isAvailable() },
    ];
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.client) throw new Error('OpenAI not configured');

    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.json ? { response_format: { type: 'json_object' as const } } : {}),
    });

    const choice = response.choices[0];
    const tokens = response.usage?.total_tokens ?? 0;

    return {
      content: choice?.message?.content ?? '',
      model: DEFAULT_MODEL,
      provider: 'openai',
      tokensUsed: tokens,
      cached: false,
      durationMs: Date.now() - start,
    };
  }
}
