import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

import type { AIResponse, ChatMessage, ModelInfo, ModelOptions, ModelProvider } from '../types';

const DEFAULT_MODEL = 'claude-opus-4-6';

export class VertexClaudeProvider implements ModelProvider {
  private adcAvailable: boolean | null = null;
  private googleAuth: GoogleAuth;
  private manualToken: string;
  private projectId: string;
  private region: string;
  readonly displayName = 'Claude (Vertex AI)';
  readonly name = 'vertex-claude';

  constructor(opts: { region?: string; projectId?: string; accessToken?: string }) {
    this.region = opts.region || 'us-east5';
    this.projectId = opts.projectId || '';
    this.manualToken = opts.accessToken || '';
    this.googleAuth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    if (this.projectId) {
      queueMicrotask(() => {
        void this.probeAdc();
      });
    }
  }

  private buildRequest(messages: ChatMessage[], options?: ModelOptions) {
    const model = options?.model || DEFAULT_MODEL;
    const url = `https://${this.region}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${model}:rawPredict`;

    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ content: m.content, role: m.role as 'user' | 'assistant' }));

    const body: Record<string, unknown> = {
      anthropic_version: 'vertex-2023-10-16',
      max_tokens: Math.min(options?.maxTokens ?? 8192, 8192),
      messages: chatMessages,
      temperature: options?.temperature ?? 0.3,
    };
    if (systemMsg) {
      body.system = systemMsg;
    }

    return { body, model, url };
  }

  private async getToken(): Promise<string> {
    if (this.manualToken) {
      try {
        const resp = await axios.get<{ expires_in: string }>(
          `https://oauth2.googleapis.com/tokeninfo?access_token=${this.manualToken}`,
          { timeout: 3000 },
        );
        const expiresIn = parseInt(resp.data.expires_in, 10);
        if (expiresIn > 30) {
          return this.manualToken;
        }
      } catch {
        /* Token invalid or expired, fall through to ADC */
      }
    }

    const token = await this.googleAuth.getAccessToken();
    if (token) {
      return token;
    }

    if (this.manualToken) {
      return this.manualToken;
    }
    throw new Error('No valid Vertex AI credentials available');
  }

  private async probeAdc(): Promise<boolean> {
    if (this.adcAvailable !== null) {
      return this.adcAvailable;
    }
    try {
      await this.googleAuth.getAccessToken();
      this.adcAvailable = true;
    } catch {
      this.adcAvailable = false;
    }
    return this.adcAvailable;
  }

  async chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse> {
    if (!this.projectId) {
      throw new Error('Vertex AI Claude not configured: missing project ID');
    }

    const token = await this.getToken();
    const start = Date.now();
    const { body, model, url } = this.buildRequest(messages, options);

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: options?.timeout ?? 120000,
    });

    const data = response.data as {
      content?: { type: string; text: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (data.content ?? [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return {
      cached: false,
      content: text,
      durationMs: Date.now() - start,
      model,
      provider: 'vertex-claude',
      tokensUsed: tokens,
    };
  }

  async *chatStream(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string> {
    if (!this.projectId) {
      throw new Error('Vertex AI Claude not configured: missing project ID');
    }
    const token = await this.getToken();
    const { body, model: _model, url } = this.buildRequest(messages, options);
    body.stream = true;

    const response = await axios.post(url, body, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      responseType: 'stream',
      timeout: options?.timeout ?? 120000,
    });

    let buffer = '';
    for await (const chunk of response.data as AsyncIterable<Buffer>) {
      buffer += String(chunk);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) {
          continue;
        }
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          return;
        }
        try {
          const parsed = JSON.parse(payload) as { type?: string; delta?: { text?: string } };
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          /* Skip malformed SSE lines */
        }
      }
    }
  }

  async getAuthInfo(): Promise<{
    adcAvailable: boolean;
    hasManualToken: boolean;
    activeMode: 'adc' | 'manual' | 'none';
  }> {
    const adc = this.adcAvailable ?? (await this.probeAdc());
    const hasManual = Boolean(this.manualToken);
    const activeMode: 'adc' | 'manual' | 'none' = hasManual ? 'manual' : adc ? 'adc' : 'none';
    return { activeMode, adcAvailable: adc, hasManualToken: hasManual };
  }

  isAvailable(): boolean {
    return Boolean(this.projectId) && (Boolean(this.manualToken) || this.adcAvailable === true);
  }

  listModels(): ModelInfo[] {
    const a = this.isAvailable();
    return [
      {
        available: a,
        id: 'claude-opus-4-6',
        name: 'Claude Opus 4.6 (1M context)',
        provider: 'vertex-claude',
      },
      { available: a, id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'vertex-claude' },
      {
        available: a,
        id: 'claude-sonnet-4@20250514',
        name: 'Claude Sonnet 4',
        provider: 'vertex-claude',
      },
      {
        available: a,
        id: 'claude-3-5-haiku@20241022',
        name: 'Claude 3.5 Haiku (fastest)',
        provider: 'vertex-claude',
      },
    ];
  }

  supportsStreaming(): boolean {
    return true;
  }
}
