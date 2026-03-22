import Anthropic from '@anthropic-ai/sdk';
import type { ModelProvider, ChatMessage, ModelOptions, AIResponse, ModelInfo } from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class AnthropicProvider implements ModelProvider {
  readonly name = 'anthropic';
  readonly displayName = 'Anthropic Claude';
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  isAvailable(): boolean {
    return !!this.client && !!this.apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', available: this.isAvailable() },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', available: this.isAvailable() },
    ];
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.client) throw new Error('Anthropic not configured');

    const start = Date.now();
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const modelId = options?.model || DEFAULT_MODEL;
    const response = await this.client.messages.create({
      model: modelId,
      max_tokens: options?.maxTokens ?? 4096,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMessages,
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const tokens = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    return {
      content: text,
      model: modelId,
      provider: 'anthropic',
      tokensUsed: tokens,
      cached: false,
      durationMs: Date.now() - start,
    };
  }
}
