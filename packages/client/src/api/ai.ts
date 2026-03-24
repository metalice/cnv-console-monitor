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

type AIUsage = {
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

type TriageSuggestion = {
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

export const fetchAIStatus = (): Promise<AIStatus> => apiFetch('/ai/status');
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

type AIPromptResult<T = Record<string, unknown>> = {
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
