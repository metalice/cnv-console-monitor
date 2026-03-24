import { GoogleGenerativeAI } from '@google/generative-ai';

import type { AIResponse, ChatMessage, ModelInfo, ModelOptions, ModelProvider } from '../types';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements ModelProvider {
  private apiKey: string;
  private client: GoogleGenerativeAI | null = null;
  readonly displayName = 'Google Gemini';
  readonly name = 'gemini';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  private buildChat(messages: ChatMessage[], options?: ModelOptions) {
    if (!this.client) {
      throw new Error('Gemini not configured');
    }
    const modelId = options?.model || DEFAULT_MODEL;
    const model = this.client.getGenerativeModel({
      generationConfig: {
        maxOutputTokens: Math.min(options?.maxTokens ?? 8192, 8192),
        responseMimeType: options?.json ? 'application/json' : 'text/plain',
        temperature: options?.temperature ?? 0.3,
      },
      model: modelId,
    });

    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    const history = nonSystemMessages.slice(0, -1).map(m => ({
      parts: [{ text: m.content }],
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
    }));

    const lastUserMsg =
      nonSystemMessages.length > 0 ? nonSystemMessages[nonSystemMessages.length - 1] : null;
    if (lastUserMsg?.role !== 'user') {
      throw new Error('No user message provided');
    }

    const chatOptions: Record<string, unknown> = { history };
    if (systemMessage) {
      chatOptions.systemInstruction = { parts: [{ text: systemMessage }], role: 'user' as const };
    }

    return { chat: model.startChat(chatOptions), lastUserMsg, modelId };
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    const start = Date.now();
    const { chat, lastUserMsg, modelId } = this.buildChat(messages, options);
    const timeoutMs = options?.timeout ?? 120000;

    const resultPromise = chat.sendMessage(lastUserMsg.content);
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      setTimeout(
        () => reject(new Error(`Gemini request timed out after ${Math.round(timeoutMs / 1000)}s`)),
        timeoutMs,
      );
    });

    const result = await Promise.race([resultPromise, timeoutPromise]);
    const { response } = result;
    const text = response.text();
    const tokens = response.usageMetadata?.totalTokenCount ?? 0;

    return {
      cached: false,
      content: text,
      durationMs: Date.now() - start,
      model: modelId,
      provider: 'gemini',
      tokensUsed: tokens,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    const { chat, lastUserMsg } = this.buildChat(messages, options);
    const result = await chat.sendMessageStream(lastUserMsg.content);
    for await (const chunk of result.stream) {
      const text = chunk.text();
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
      {
        available: this.isAvailable(),
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'gemini',
      },
      {
        available: this.isAvailable(),
        id: 'gemini-2.5-pro-preview-06-05',
        name: 'Gemini 2.5 Pro',
        provider: 'gemini',
      },
      {
        available: this.isAvailable(),
        id: 'gemini-2.5-flash-preview-05-20',
        name: 'Gemini 2.5 Flash',
        provider: 'gemini',
      },
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }
}
