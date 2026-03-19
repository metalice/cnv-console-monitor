import { apiFetch, apiPost } from './client';

export type PhaseStatus = 'idle' | 'running' | 'retrying' | 'complete' | 'cancelled' | 'skipped';

export type PhaseError = {
  itemId: number;
  name: string;
  reason: string;
  httpStatus?: number;
  attempts: number;
  permanent: boolean;
  lastAttemptAt: number;
};

export type PhaseState = {
  status: PhaseStatus;
  total: number;
  succeeded: number;
  failed: number;
  permanentFailures: number;
  errors: PhaseError[];
  startedAt: number | null;
  completedAt: number | null;
  currentConcurrency: number;
  retryRound: number;
};

export type PipelineLogEntry = {
  timestamp: number;
  phase: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type PipelineState = {
  runId: string;
  active: boolean;
  cancelled: boolean;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  trigger: string;
  phases: Record<string, PhaseState>;
  log: PipelineLogEntry[];
};

export type EnrichmentStats = { total: number; success: number; mapped: number; failed: number; pending: number; noUrl: number; notFound: number; authRequired: number };

export type PollStatusResponse = {
  pipeline: PipelineState;
  lastPollAt: number | null;
  pollIntervalMinutes: number;
  enrichment: EnrichmentStats;
  active: boolean;
  phase: string;
  current: number;
  total: number;
  message: string;
  startedAt: number | null;
};

export type PipelineRunRecord = {
  id: number;
  run_id: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  cancelled: boolean;
  trigger: string;
  phases: Record<string, PhaseState>;
  summary: string | null;
};

export type HealthReport = {
  services: Array<{ name: string; status: 'ok' | 'error'; latencyMs: number; message: string }>;
  allOk: boolean;
};

export type DryRunReport = {
  phases: Record<string, { totalItems: number; estimatedDurationMs: number; connectivity: Array<{ service: string; status: string; message: string }> }>;
  totalEstimatedMs: number;
  health: Array<{ service: string; status: string; message: string }>;
};

export const fetchPollStatus = (): Promise<PollStatusResponse> =>
  apiFetch<PollStatusResponse>('/poll/status');

export const fetchPipelineHistory = (limit = 10): Promise<PipelineRunRecord[]> =>
  apiFetch<PipelineRunRecord[]>(`/poll/history?limit=${limit}`);

export const startPipeline = (mode: 'incremental' | 'full', lookbackDays?: number): Promise<{ success: boolean }> =>
  apiPost(`/poll/start?mode=${mode}${lookbackDays ? `&lookbackDays=${lookbackDays}` : ''}`, {});

export const cancelPipeline = (): Promise<{ success: boolean }> =>
  apiPost('/poll/cancel', {});

export const resumePhase = (phaseName: string): Promise<{ success: boolean }> =>
  apiPost(`/poll/resume-phase/${phaseName}`, {});

export const runHealthCheck = (): Promise<HealthReport> =>
  apiPost('/poll/health-check', {});

export const runDryRun = (): Promise<DryRunReport> =>
  apiPost('/poll/dry-run', {});

// Legacy compatibility
export const triggerPollNow = (): Promise<{ success: boolean }> =>
  apiPost('/poll/now', {});

export const triggerBackfill = (): Promise<{ success: boolean }> =>
  apiPost('/poll/backfill', {});

export const cancelPoll = (): Promise<{ success: boolean }> =>
  cancelPipeline();

export const triggerJenkinsEnrichment = (): Promise<{ success: boolean }> =>
  apiPost('/poll/enrich', {});

export const retryFailedItems = (): Promise<{ success: boolean; retried: number; succeeded: number; stillFailed: number }> =>
  apiPost('/poll/retry-items', {});

export type PollStatusLegacy = {
  active: boolean;
  phase: string;
  current: number;
  total: number;
  message: string;
  startedAt: number | null;
  lastPollAt: number | null;
  pollIntervalMinutes?: number;
};

export type PollStatus = PollStatusResponse;
