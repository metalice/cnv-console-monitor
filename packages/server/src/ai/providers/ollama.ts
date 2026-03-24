import axios from 'axios';

import type { AIResponse, ChatMessage, ModelInfo, ModelOptions, ModelProvider } from '../types';

const DEFAULT_MODEL = 'llama3.1';

export class OllamaProvider implements ModelProvider {
  private baseUrl: string;
  readonly displayName = 'Ollama (Local)';
  readonly name = 'ollama';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    const start = Date.now();

    const modelId = options?.model || DEFAULT_MODEL;
    const response = await axios.post(
      `${this.baseUrl}/api/chat`,
      {
        messages: messages.map(m => ({ content: m.content, role: m.role })),
        model: modelId,
        options: {
          num_predict: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.3,
        },
        stream: false,
      },
      { timeout: options?.timeout ?? 120000 },
    );

    const { data } = response;

    return {
      cached: false,
      content: data.message?.content ?? '',
      durationMs: Date.now() - start,
      model: modelId,
      provider: 'ollama',
      tokensUsed: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
    };
  }

  isAvailable(): boolean {
    return Boolean(this.baseUrl);
  }

  listModels(): ModelInfo[] {
    return [
      { available: this.isAvailable(), id: 'llama3.1', name: 'Llama 3.1', provider: 'ollama' },
      { available: this.isAvailable(), id: 'mistral', name: 'Mistral', provider: 'ollama' },
      { available: this.isAvailable(), id: 'codellama', name: 'Code Llama', provider: 'ollama' },
    ];
  }

  supportsStreaming(): boolean {
    return false;
  }
}
