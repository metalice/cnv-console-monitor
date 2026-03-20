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
  providers: string[];
  models: AIModel[];
  prompts: string[];
};

export type AIUsage = {
  total: number;
  last24h: number;
  byProvider: Record<string, number>;
  totalTokens: number;
};

export type ChangelogItem = { key?: string; title?: string; component?: string; prs?: string[]; prLinks?: string[]; assignee?: string; impactScore?: number; risk?: string };

export type ChangelogResult = {
  changelog: {
    summary?: string;
    categories?: Record<string, ChangelogItem[]>;
    highlights?: string;
    breakingChanges?: Array<string | Record<string, unknown>>;
    testImpact?: { newlyPassing: number; newlyFailing: number };
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
    contributors?: Array<{ name: string; count: number }>;
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
    concerns?: Array<{ area: string; severity: string; detail: string }>;
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

export const startChangelogJob = (version: string, targetVersion: string, compareFrom?: string): Promise<{ status: string }> =>
  apiPost(`/releases/${version}/changelog`, { targetVersion, compareFrom });

export type ChangelogStatus = {
  status: 'none' | 'running' | 'done' | 'error';
  progress?: string;
  error?: string;
  changelog?: ChangelogResult['changelog'];
  meta?: ChangelogResult['meta'];
};

export const fetchChangelogStatus = (targetVersion: string, compareFrom?: string): Promise<ChangelogStatus> => {
  const params = new URLSearchParams({ targetVersion });
  if (compareFrom) params.set('compareFrom', compareFrom);
  return apiFetch(`/releases/changelog-status?${params.toString()}`);
};

export const analyzeFailure = (data: { testName: string; component?: string; errorMessage: string; recentRuns?: Array<{ date: string; status: string }>; triageHistory?: Array<{ testName: string; defectType: string; comment: string }> }): Promise<FailureAnalysis> =>
  apiPost('/ai/analyze-failure', data);

export const suggestTriage = (data: { testName: string; component?: string; errorMessage: string; consecutiveFailures?: number }): Promise<TriageSuggestion> =>
  apiPost('/ai/suggest-triage', data);

export const generateBugReport = (data: { testName: string; component?: string; errorMessage: string; version?: string }): Promise<BugReport> =>
  apiPost('/ai/generate-bug-report', data);

export const generateDailyDigest = (data: Record<string, unknown>): Promise<{ digest: string; model: string }> =>
  apiPost('/ai/daily-digest', data);

export const nlSearch = (query: string): Promise<NLSearchResult> =>
  apiPost('/ai/nl-search', { query });

export const assessRisk = (data: Record<string, unknown>): Promise<RiskAssessment> =>
  apiPost('/ai/risk-assessment', data);

export const configureAI = (config: Record<string, unknown>): Promise<{ success: boolean; providers: string[] }> =>
  apiPost('/ai/configure', config);

export const testAIConnection = (provider: string): Promise<{ success: boolean; model?: string; error?: string }> =>
  apiPost('/ai/test-connection', { provider });

export const clearAICache = (): Promise<{ success: boolean }> =>
  apiPost('/ai/clear-cache', {});

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

export const chatExplorer = (query: string, context?: string): Promise<{ response: string; model: string; cached: boolean }> =>
  apiPost('/ai/chat-explorer', { query, context });
