export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ModelOptions = {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  timeout?: number;
  model?: string;
};

export type AIResponse = {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  cached: boolean;
  durationMs: number;
};

export type ModelInfo = {
  id: string;
  name: string;
  provider: string;
  available: boolean;
};

export type UsageRecord = {
  prompt: string;
  model: string;
  provider: string;
  tokensUsed: number;
  durationMs: number;
  cached: boolean;
  timestamp: number;
};

export type PromptTemplate = {
  name: string;
  system: string;
  user: string;
};

export type ModelProvider = {
  readonly name: string;
  readonly displayName: string;
  chat(messages: ChatMessage[], options?: ModelOptions): Promise<AIResponse>;
  chatStream?(messages: ChatMessage[], options?: ModelOptions): AsyncIterable<string>;
  supportsStreaming(): boolean;
  isAvailable(): boolean;
  listModels(): ModelInfo[];
};

export type AIConfig = {
  enabled: boolean;
  defaultModel: string;
  defaultModelId?: string;
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  vertexProjectId?: string;
  vertexRegion?: string;
  vertexAccessToken?: string;
};
