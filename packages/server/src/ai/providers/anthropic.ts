import Anthropic from '@anthropic-ai/sdk';

import type { AIResponse, ChatMessage, ModelInfo, ModelOptions, ModelProvider } from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export class AnthropicProvider implements ModelProvider {
  private apiKey: string;
  private client: Anthropic | null = null;
  readonly displayName = 'Anthropic Claude';
  readonly name = 'anthropic';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  private buildParams(messages: ChatMessage[], options?: ModelOptions) {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ content: m.content, role: m.role as 'user' | 'assistant' }));
    const modelId = options?.model || DEFAULT_MODEL;
    return { chatMessages, modelId, systemMsg };
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('Anthropic not configured');
    }

    const start = Date.now();
    const { chatMessages, modelId, systemMsg } = this.buildParams(messages, options);
    const response = await this.client.messages.create(
      {
        max_tokens: Math.min(options?.maxTokens ?? 8192, 8192),
        model: modelId,
        ...(systemMsg ? { system: systemMsg } : {}),
        messages: chatMessages,
      },
      { timeout: options?.timeout ?? 120000 },
    );

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('');

    const tokens = response.usage.input_tokens + response.usage.output_tokens;

    return {
      cached: false,
      content: text,
      durationMs: Date.now() - start,
      model: modelId,
      provider: 'anthropic',
      tokensUsed: tokens,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('Anthropic not configured');
    }
    const { chatMessages, modelId, systemMsg } = this.buildParams(messages, options);
    const stream = this.client.messages.stream({
      max_tokens: options?.maxTokens ?? 4096,
      model: modelId,
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

  isAvailable(): boolean {
    return Boolean(this.client) && Boolean(this.apiKey);
  }

  listModels(): ModelInfo[] {
    const a = this.isAvailable();
    return [
      { available: a, id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'anthropic' },
      {
        available: a,
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        provider: 'anthropic',
      },
      {
        available: a,
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
      },
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }
}
