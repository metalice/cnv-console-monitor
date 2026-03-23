import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import type { ModelProvider, ChatMessage, ModelOptions, AIResponse, ModelInfo } from '../types';

const DEFAULT_MODEL = 'claude-opus-4-6';

export class VertexClaudeProvider implements ModelProvider {
  readonly name = 'vertex-claude';
  readonly displayName = 'Claude (Vertex AI)';
  private region: string;
  private projectId: string;
  private manualToken: string;
  private googleAuth: GoogleAuth;
  private adcAvailable: boolean | null = null;

  constructor(opts: { region?: string; projectId?: string; accessToken?: string }) {
    this.region = opts.region || 'us-east5';
    this.projectId = opts.projectId || '';
    this.manualToken = opts.accessToken || '';
    this.googleAuth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    if (this.projectId) this.probeAdc();
  }

  isAvailable(): boolean {
    return !!this.projectId && (!!this.manualToken || this.adcAvailable === true);
  }

  async getAuthInfo(): Promise<{ adcAvailable: boolean; hasManualToken: boolean; activeMode: 'adc' | 'manual' | 'none' }> {
    const adc = this.adcAvailable ?? await this.probeAdc();
    const hasManual = !!this.manualToken;
    const activeMode: 'adc' | 'manual' | 'none' = hasManual ? 'manual' : (adc ? 'adc' : 'none');
    return { adcAvailable: adc, hasManualToken: hasManual, activeMode };
  }

  private async probeAdc(): Promise<boolean> {
    if (this.adcAvailable !== null) return this.adcAvailable;
    try {
      await this.googleAuth.getAccessToken();
      this.adcAvailable = true;
    } catch {
      this.adcAvailable = false;
    }
    return this.adcAvailable;
  }

  private async getToken(): Promise<string> {
    if (this.manualToken) {
      try {
        const resp = await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${this.manualToken}`, { timeout: 3000 });
        const expiresIn = parseInt(resp.data.expires_in, 10);
        if (expiresIn > 30) return this.manualToken;
      } catch { /* token invalid or expired, fall through to ADC */ }
    }

    const token = await this.googleAuth.getAccessToken();
    if (token) return token;

    if (this.manualToken) return this.manualToken;
    throw new Error('No valid Vertex AI credentials available');
  }

  listModels(): ModelInfo[] {
    const a = this.isAvailable();
    return [
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6 (1M context)', provider: 'vertex-claude', available: a },
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'vertex-claude', available: a },
      { id: 'claude-sonnet-4@20250514', name: 'Claude Sonnet 4', provider: 'vertex-claude', available: a },
      { id: 'claude-3-5-haiku@20241022', name: 'Claude 3.5 Haiku (fastest)', provider: 'vertex-claude', available: a },
    ];
  }

  supportsStreaming(): boolean { return true; }

  private buildRequest(messages: ChatMessage[], options?: ModelOptions) {
    const model = options?.model || DEFAULT_MODEL;
    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${model}:rawPredict`;

    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const body: Record<string, unknown> = {
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: Math.min(options?.maxTokens ?? 8192, 8192),
      messages: chatMessages,
    };
    if (systemMsg) body.system = systemMsg;

    return { url, body, model };
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.projectId) throw new Error('Vertex AI Claude not configured: missing project ID');

    const token = await this.getToken();
    const start = Date.now();
    const { url, body, model } = this.buildRequest(messages, options);

    const response = await axios.post(url, body, {
      headers: {
        'Authorization': `Bearer ${token}`,
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

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    if (!this.projectId) throw new Error('Vertex AI Claude not configured: missing project ID');
    const token = await this.getToken();
    const { url, body, model: _model } = this.buildRequest(messages, options);
    body.stream = true;

    const response = await axios.post(url, body, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: options?.timeout ?? 120000,
    });

    let buffer = '';
    for await (const chunk of response.data) {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  }
}
