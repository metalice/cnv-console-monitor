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
    const a = this.isAvailable();
    return [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic', available: a },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', available: a },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'anthropic', available: a },
    ];
  }

  supportsStreaming(): boolean { return true; }

  private buildParams(messages: ChatMessage[], options?: ModelOptions) {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    const modelId = options?.model || DEFAULT_MODEL;
    return { systemMsg, chatMessages, modelId };
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.client) throw new Error('Anthropic not configured');

    const start = Date.now();
    const { systemMsg, chatMessages, modelId } = this.buildParams(messages, options);
    const response = await this.client.messages.create({
      model: modelId,
      max_tokens: Math.min(options?.maxTokens ?? 8192, 8192),
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMessages,
    }, { timeout: options?.timeout ?? 120000 });

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

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    if (!this.client) throw new Error('Anthropic not configured');
    const { systemMsg, chatMessages, modelId } = this.buildParams(messages, options);
    const stream = this.client.messages.stream({
      model: modelId,
      max_tokens: options?.maxTokens ?? 4096,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: chatMessages,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as unknown as Record<string, string>;
        if (delta.type === 'text_delta' && delta.text) {
          yield delta.text;
        }
      }
    }
  }
}
