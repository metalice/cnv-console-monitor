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

export type PipelineState = {
  runId: string;
  active: boolean;
  cancelled: boolean;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  trigger: 'manual' | 'scheduled' | 'backfill';
  phases: Record<string, PhaseState>;
  log: PipelineLogEntry[];
};

export type PipelineLogEntry = {
  timestamp: number;
  phase: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type PhaseEstimate = {
  totalItems: number;
  estimatedDurationMs: number;
  connectivity: Array<{ service: string; status: 'ok' | 'error'; message: string }>;
};

export type DryRunReport = {
  phases: Record<string, PhaseEstimate>;
  totalEstimatedMs: number;
  health: Array<{ service: string; status: 'ok' | 'error'; message: string }>;
};

export type HealthReport = {
  services: Array<{ name: string; status: 'ok' | 'error'; latencyMs: number; message: string }>;
  allOk: boolean;
};

export type PipelineOptions = {
  mode: 'incremental' | 'full';
  lookbackHours: number;
  clearData: boolean;
};

export const createEmptyPhaseState = (concurrency = 20): PhaseState => ({
  status: 'idle',
  total: 0,
  succeeded: 0,
  failed: 0,
  permanentFailures: 0,
  errors: [],
  startedAt: null,
  completedAt: null,
  currentConcurrency: concurrency,
  retryRound: 0,
});

export const createEmptyPipelineState = (): PipelineState => ({
  runId: '',
  active: false,
  cancelled: false,
  startedAt: null,
  completedAt: null,
  durationMs: null,
  trigger: 'manual',
  phases: {},
  log: [],
});

export interface PipelinePhase {
  readonly name: string;
  readonly displayName: string;

  canSkip(): boolean;
  canRunParallel(): string[];

  estimate(): Promise<PhaseEstimate>;

  run(ctx: PhaseContext): Promise<void>;

  retryItem(itemId: number): Promise<boolean>;
  isPermanentError(error: unknown): boolean;
}

export interface PhaseContext {
  getConcurrency(): number;
  setConcurrency(n: number): void;
  isCancelled(): boolean;
  addSuccess(count?: number): void;
  addError(itemId: number, name: string, error: unknown): void;
  markPermanent(itemId: number): void;
  setTotal(total: number): void;
  log(level: 'info' | 'warn' | 'error', message: string): void;
  getPhaseState(): PhaseState;
  emit(): void;
}
