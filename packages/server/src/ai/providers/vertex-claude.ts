import axios from 'axios';
import type { ModelProvider, ChatMessage, ModelOptions, AIResponse, ModelInfo } from '../types';

const DEFAULT_MODEL = 'claude-sonnet-4@20250514';

export class VertexClaudeProvider implements ModelProvider {
  readonly name = 'vertex-claude';
  readonly displayName = 'Claude (Vertex AI)';
  private region: string;
  private projectId: string;
  private accessToken: string;

  constructor(opts: { region?: string; projectId?: string; accessToken?: string }) {
    this.region = opts.region || 'us-east5';
    this.projectId = opts.projectId || '';
    this.accessToken = opts.accessToken || '';
  }

  isAvailable(): boolean {
    return !!this.projectId && !!this.accessToken;
  }

  listModels(): ModelInfo[] {
    return [
      { id: 'claude-sonnet-4@20250514', name: 'Claude Sonnet 4 (Vertex)', provider: 'vertex-claude', available: this.isAvailable() },
      { id: 'claude-3-5-sonnet-v2@20241022', name: 'Claude 3.5 Sonnet v2 (Vertex)', provider: 'vertex-claude', available: this.isAvailable() },
      { id: 'claude-3-5-haiku@20241022', name: 'Claude 3.5 Haiku (Vertex)', provider: 'vertex-claude', available: this.isAvailable() },
    ];
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.projectId || !this.accessToken) throw new Error('Vertex AI Claude not configured');

    const start = Date.now();
    const model = DEFAULT_MODEL;
    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${model}:rawPredict`;

    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: Record<string, unknown> = {
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: options?.maxTokens ?? 4096,
      messages: chatMessages,
    };
    if (systemMsg) body.system = systemMsg;

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: options?.timeout ?? 120000,
    });

    const data = response.data;
    const text = (data.content || [])
      .filter((b: Record<string, unknown>) => b.type === 'text')
      .map((b: Record<string, unknown>) => b.text)
      .join('');

    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return {
      content: text,
      model,
      provider: 'vertex-claude',
      tokensUsed: tokens,
      cached: false,
      durationMs: Date.now() - start,
    };
  }
}
