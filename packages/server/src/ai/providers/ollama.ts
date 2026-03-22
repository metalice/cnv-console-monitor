import axios from 'axios';
import type { ModelProvider, ChatMessage, ModelOptions, AIResponse, ModelInfo } from '../types';

const DEFAULT_MODEL = 'llama3.1';

export class OllamaProvider implements ModelProvider {
  readonly name = 'ollama';
  readonly displayName = 'Ollama (Local)';
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  isAvailable(): boolean {
    return !!this.baseUrl;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'llama3.1', name: 'Llama 3.1', provider: 'ollama', available: this.isAvailable() },
      { id: 'mistral', name: 'Mistral', provider: 'ollama', available: this.isAvailable() },
      { id: 'codellama', name: 'Code Llama', provider: 'ollama', available: this.isAvailable() },
    ];
  }

  supportsStreaming(): boolean { return false; }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    const start = Date.now();

    const modelId = options?.model || DEFAULT_MODEL;
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model: modelId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.3,
        num_predict: options?.maxTokens ?? 4096,
      },
    }, { timeout: options?.timeout ?? 120000 });

    const data = response.data;

    return {
      content: data.message?.content ?? '',
      model: modelId,
      provider: 'ollama',
      tokensUsed: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0),
      cached: false,
      durationMs: Date.now() - start,
    };
  }
}
