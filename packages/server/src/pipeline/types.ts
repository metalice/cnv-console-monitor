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
  connectivity: { service: string; status: 'ok' | 'error'; message: string }[];
};

export type DryRunReport = {
  phases: Record<string, PhaseEstimate>;
  totalEstimatedMs: number;
  health: { service: string; status: 'ok' | 'error'; message: string }[];
};

export type HealthReport = {
  services: { name: string; status: 'ok' | 'error'; latencyMs: number; message: string }[];
  allOk: boolean;
};

export type PipelineOptions = {
  mode: 'incremental' | 'full';
  lookbackHours: number;
  clearData: boolean;
};

export const createEmptyPhaseState = (concurrency = 20): PhaseState => ({
  completedAt: null,
  currentConcurrency: concurrency,
  errors: [],
  failed: 0,
  permanentFailures: 0,
  retryRound: 0,
  startedAt: null,
  status: 'idle',
  succeeded: 0,
  total: 0,
});

export const createEmptyPipelineState = (): PipelineState => ({
  active: false,
  cancelled: false,
  completedAt: null,
  durationMs: null,
  log: [],
  phases: {},
  runId: '',
  startedAt: null,
  trigger: 'manual',
});

export type PipelinePhase = {
  readonly name: string;
  readonly displayName: string;

  canSkip(): boolean;
  canRunParallel(): string[];

  estimate(): Promise<PhaseEstimate>;

  run(ctx: PhaseContext): Promise<void>;

  retryItem(itemId: number): Promise<boolean>;
  isPermanentError(error: unknown): boolean;
};

export type PhaseContext = {
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
};
