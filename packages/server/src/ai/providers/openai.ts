import OpenAI from 'openai';

import type { AIResponse, ChatMessage, ModelInfo, ModelOptions, ModelProvider } from '../types';

const DEFAULT_MODEL = 'gpt-4o-mini';

export class OpenAIProvider implements ModelProvider {
  private apiKey: string;
  private client: OpenAI | null = null;
  readonly displayName = 'OpenAI';
  readonly name = 'openai';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }

    const start = Date.now();
    const modelId = options?.model || DEFAULT_MODEL;
    const response = await this.client.chat.completions.create(
      {
        max_tokens: Math.min(options?.maxTokens ?? 16384, 16384),
        messages: messages.map(msg => ({ content: msg.content, role: msg.role })),
        model: modelId,
        temperature: options?.temperature ?? 0.3,
        ...(options?.json ? { response_format: { type: 'json_object' as const } } : {}),
      },
      { timeout: options?.timeout ?? 120000 },
    );

    const choice = response.choices[0];
    const tokens = response.usage?.total_tokens ?? 0;

    return {
      cached: false,
      content: choice.message.content ?? '',
      durationMs: Date.now() - start,
      model: modelId,
      provider: 'openai',
      tokensUsed: tokens,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('OpenAI not configured');
    }
    const modelId = options?.model || DEFAULT_MODEL;
    const stream = await this.client.chat.completions.create({
      max_tokens: options?.maxTokens ?? 4096,
      messages: messages.map(msg => ({ content: msg.content, role: msg.role })),
      model: modelId,
      stream: true,
      temperature: options?.temperature ?? 0.3,
    });
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield text;
      }
    }
  }

  isAvailable(): boolean {
    return Boolean(this.client) && Boolean(this.apiKey);
  }

  listModels(): ModelInfo[] {
    return [
      { available: this.isAvailable(), id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
      { available: this.isAvailable(), id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
      { available: this.isAvailable(), id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai' },
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }
}
