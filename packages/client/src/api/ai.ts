import { apiFetch, apiPost } from './client';

export type AIModel = {
  id: string;
  name: string;
  provider: string;
  available: boolean;
};

export type AIStatus = {
  enabled: boolean;
  defaultModel: string;
  defaultModelId: string;
  providers: string[];
  models: AIModel[];
  prompts: string[];
  vertexTokenInfo?: {
    expiresIn: number | null;
    expiresAt: string | null;
    email: string | null;
    authMode: 'manual' | 'adc' | 'none';
    adcAvailable: boolean;
    hasManualToken: boolean;
  };
};

export type AIUsage = {
  total: number;
  last24h: number;
  byProvider: Record<string, number>;
  totalTokens: number;
};

export type ChangelogItemAvailability = {
  version?: string;
  build?: string;
  buildDate?: string;
  evidence?: string;
  prMergedTo?: string;
  prMergedDate?: string;
};

export type ChangelogItem = {
  key?: string;
  title?: string;
  ticketSummary?: string;
  reasoning?: string;
  component?: string;
  assignee?: string;
  prs?: string[];
  prLinks?: string[];
  impactScore?: number;
  risk?: string;
  confidence?: number;
  confidenceReason?: string;
  status?: string;
  resolution?: string;
  resolvedDate?: string;
  availableIn?: string | ChangelogItemAvailability;
  availableInReason?: string;
  buildInfo?: string;
  blockedBy?: string;
};

export type ChangelogResult = {
  changelog: {
    summary?: string;
    categories?: Record<string, ChangelogItem[]>;
    highlights?: string;
    breakingChanges?: (string | Record<string, unknown>)[];
    epicStatus?: {
      key: string;
      title: string;
      childrenDone: number;
      childrenTotal: number;
      status: string;
    }[];
    concerns?: string[];
    testImpact?: { newlyPassing: number; newlyFailing: number; details?: string[] };
    raw?: string;
  };
  meta: {
    targetVersion: string;
    compareFrom: string | null;
    label: string;
    issueCount: number;
    analyzedCount: number;
    batches: number;
    model: string;
    tokensUsed: number;
    durationMs: number;
    cached: boolean;
    contributors?: { name: string; count: number }[];
  };
};

export type FailureAnalysis = {
  analysis: {
    rootCause?: string;
    classification?: string;
    confidence?: string;
    explanation?: string;
    suggestions?: string[];
    raw?: string;
  };
  model: string;
  cached: boolean;
};

export type TriageSuggestion = {
  suggestion: {
    suggestedType?: string;
    suggestedLabel?: string;
    confidence?: string;
    reasoning?: string;
    raw?: string;
  };
  model: string;
  cached: boolean;
};

export type BugReport = {
  report: {
    title?: string;
    description?: string;
    stepsToReproduce?: string;
    expectedResult?: string;
    actualResult?: string;
    affectedVersions?: string;
    component?: string;
    priority?: string;
    raw?: string;
  };
  model: string;
  cached: boolean;
};

export type RiskAssessment = {
  assessment: {
    verdict?: string;
    overallRisk?: string;
    summary?: string;
    concerns?: { area: string; severity: string; detail: string }[];
    recommendations?: string[];
    raw?: string;
  };
  model: string;
  cached: boolean;
};

export type NLSearchResult = {
  result: {
    page?: string;
    filters?: Record<string, string>;
    explanation?: string;
    raw?: string;
  };
  model: string;
  cached: boolean;
};

export const fetchAIStatus = (): Promise<AIStatus> => apiFetch('/ai/status');
export const fetchAIModels = (): Promise<AIModel[]> => apiFetch('/ai/models');
export const fetchAIUsage = (): Promise<AIUsage> => apiFetch('/ai/usage');

export const startChangelogJob = (
  version: string,
  targetVersion: string,
  compareFrom?: string,
): Promise<{ status: string }> =>
  apiPost(`/releases/${version}/changelog`, { compareFrom, targetVersion });

export type ChangelogLogEntry = {
  time: number;
  message: string;
  type: 'info' | 'success' | 'error';
};

export type ChangelogStatus = {
  status: 'none' | 'running' | 'done' | 'error';
  progress?: string;
  step?: string;
  currentBatch?: number;
  totalBatches?: number;
  totalIssues?: number;
  elapsedSeconds?: number;
  log?: ChangelogLogEntry[];
  error?: string;
  changelog?: ChangelogResult['changelog'];
  meta?: ChangelogResult['meta'];
};

export const fetchChangelogStatus = (
  targetVersion: string,
  compareFrom?: string,
): Promise<ChangelogStatus> => {
  const params = new URLSearchParams({ targetVersion });
  if (compareFrom) {
    params.set('compareFrom', compareFrom);
  }
  return apiFetch(`/releases/changelog-status?${params.toString()}`);
};

export const analyzeFailure = (data: {
  testName: string;
  component?: string;
  errorMessage: string;
  recentRuns?: { date: string; status: string }[];
  triageHistory?: { testName: string; defectType: string; comment: string }[];
}): Promise<FailureAnalysis> => apiPost('/ai/analyze-failure', data);

export const suggestTriage = (data: {
  testName: string;
  component?: string;
  errorMessage: string;
  consecutiveFailures?: number;
}): Promise<TriageSuggestion> => apiPost('/ai/suggest-triage', data);

export const generateBugReport = (data: {
  testName: string;
  component?: string;
  errorMessage: string;
  version?: string;
}): Promise<BugReport> => apiPost('/ai/generate-bug-report', data);

export const generateDailyDigest = (
  data: Record<string, unknown>,
): Promise<{ digest: string; model: string }> => apiPost('/ai/daily-digest', data);

export const nlSearch = (query: string): Promise<NLSearchResult> =>
  apiPost('/ai/nl-search', { query });

export const assessRisk = (data: Record<string, unknown>): Promise<RiskAssessment> =>
  apiPost('/ai/risk-assessment', data);

export const configureAI = (
  config: Record<string, unknown>,
): Promise<{ success: boolean; providers: string[] }> => apiPost('/ai/configure', config);

export const testAIConnection = (
  provider: string,
): Promise<{ success: boolean; model?: string; error?: string }> =>
  apiPost('/ai/test-connection', { provider });

export const clearAICache = (): Promise<{ success: boolean }> => apiPost('/ai/clear-cache', {});

export type AIPromptResult<T = Record<string, unknown>> = {
  result: T;
  model: string;
  tokensUsed: number;
  cached: boolean;
  durationMs: number;
};

export const generateHealthNarrative = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/health-narrative', data);

export const generateStandupSummary = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/standup-summary', data);

export const generatePostMortem = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/post-mortem', data);

export const estimateEffort = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/effort-estimation', data);

export const analyzeCoverageGaps = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/coverage-gap', data);

export const clusterFailures = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/failure-clustering', data);

export const detectRegressions = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/regression-detection', data);

export const analyzeFlakyTest = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/flaky-analysis', data);

export const detectAnomalies = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/anomaly-detection', data);

export const analyzesCrossVersion = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/cross-version', data);

export const reconstructTimeline = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/incident-timeline', data);

export const prioritizeTests = (data: Record<string, unknown>): Promise<AIPromptResult> =>
  apiPost('/ai/test-priority', data);

export const chatExplorer = (
  query: string,
  context?: string,
): Promise<{ response: string; model: string; cached: boolean }> =>
  apiPost('/ai/chat-explorer', { context, query });

export type ChangelogCorrection = {
  key: string;
  field: 'category' | 'impactScore' | 'risk';
  oldValue: string;
  newValue: string;
  context?: string;
};

export const saveChangelogEdits = (
  version: string,
  corrections: ChangelogCorrection[],
  targetVersion?: string,
  compareFrom?: string,
): Promise<{ success: boolean; saved: number }> => {
  const params = new URLSearchParams();
  if (targetVersion) {
    params.set('targetVersion', targetVersion);
  }
  if (compareFrom) {
    params.set('compareFrom', compareFrom);
  }
  return apiPost(`/releases/${version}/changelog-edit?${params.toString()}`, { corrections });
};

export const streamAIChat = (
  messages: { role: string; content: string }[],
  onChunk: (text: string) => void,
  onDone: (fullContent: string) => void,
  onError: (error: string) => void,
  options?: { provider?: string },
): (() => void) => {
  const controller = new AbortController();

  fetch('/api/ai/stream', {
    body: JSON.stringify({ messages, ...options }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: controller.signal,
  })
    .then(async response => {
      if (!response.ok) {
        onError(`HTTP ${response.status}`);
        return undefined;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        onError('No readable stream');
        return undefined;
      }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) {
              onError(data.error);
              return undefined;
            }
            if (data.done) {
              onDone(data.content || '');
              return undefined;
            }
            if (data.chunk) {
              onChunk(data.chunk);
            }
          } catch {
            /* Skip */
          }
        }
      }
      return undefined;
    })
    .catch(err => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Stream failed');
      }
    });

  return () => controller.abort();
};
