let polling = false;
let cancelled = false;
let autoPollPaused = false;
let jenkinsCancelled = false;
let currentPollId = 0;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

export type PollProgress = {
  active: boolean;
  phase: string;
  current: number;
  total: number;
  message: string;
  startedAt: number | null;
};

const EMPTY: PollProgress = {
  active: false,
  current: 0,
  message: '',
  phase: '',
  startedAt: null,
  total: 0,
};
const COMPLETE_LINGER_MS = 6000;

let progress: PollProgress = { ...EMPTY };
let failedItemLaunches: { rpId: number; name: string; error: string }[] = [];

export const isPollLocked = (): boolean => polling;

export const lockPoll = (): number => {
  if (polling) {
    return 0;
  }
  polling = true;
  cancelled = false;
  currentPollId = Date.now();
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  progress = {
    active: true,
    current: 0,
    message: 'Starting poll...',
    phase: 'starting',
    startedAt: currentPollId,
    total: 0,
  };
  failedItemLaunches = [];
  return currentPollId;
};

export const unlockPoll = (): void => {
  polling = false;
  cancelled = false;
  progress = { ...progress, active: false, phase: 'complete' };
  clearTimer = setTimeout(() => {
    progress = { ...EMPTY };
    clearTimer = null;
  }, COMPLETE_LINGER_MS);
};

export const forceUnlockPoll = (): void => {
  polling = false;
  cancelled = true;
  if (clearTimer) {
    clearTimeout(clearTimer);
    clearTimer = null;
  }
  progress = {
    active: false,
    current: progress.current,
    message: 'Poll cancelled',
    phase: 'cancelled',
    startedAt: null,
    total: progress.total,
  };
  clearTimer = setTimeout(() => {
    progress = { ...EMPTY };
    clearTimer = null;
  }, COMPLETE_LINGER_MS);
};

export const isPollCancelled = (): boolean => cancelled;

export const pauseAutoPoll = (): void => {
  autoPollPaused = true;
};
export const resumeAutoPoll = (): void => {
  autoPollPaused = false;
};
export const isAutoPollPaused = (): boolean => autoPollPaused;

export const cancelJenkins = (): void => {
  jenkinsCancelled = true;
};
export const resetJenkinsCancelled = (): void => {
  jenkinsCancelled = false;
};
export const isJenkinsCancelled = (): boolean => jenkinsCancelled;

export const updatePollProgress = (
  pollId: number,
  update: Partial<Omit<PollProgress, 'active' | 'startedAt'>>,
): void => {
  if (pollId !== currentPollId) {
    return;
  }
  Object.assign(progress, update);
};

export const getPollProgress = (): PollProgress => ({ ...progress });

export const addFailedItemLaunch = (rpId: number, name: string, error: string): void => {
  failedItemLaunches.push({ error, name, rpId });
};

export const getFailedItemLaunches = (): { rpId: number; name: string; error: string }[] => [
  ...failedItemLaunches,
];
export const clearFailedItemLaunches = (): void => {
  failedItemLaunches = [];
};

export type PollPhaseSummary = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Record<string, number>;
};

export type PollSummary = {
  timestamp: number;
  durationMs: number;
  cancelled: boolean;
  launches: PollPhaseSummary;
  testItems: PollPhaseSummary;
  jenkins: PollPhaseSummary & { authRequired: number; deleted: number; pruned: number };
};

let lastPollSummary: PollSummary | null = null;

export const setLastPollSummary = (summary: PollSummary): void => {
  lastPollSummary = summary;
  import('./db/store')
    .then(({ setSetting }) => {
      void setSetting('_lastPollSummary', JSON.stringify(summary), 'system').catch(() => {
        // no-op
      });
      return undefined;
    })
    .catch(() => {
      // no-op
    });
};

export const getLastPollSummary = (): PollSummary | null => lastPollSummary;

export const loadLastPollSummary = async (): Promise<void> => {
  try {
    const { getSetting } = await import('./db/store');
    const raw = await getSetting('_lastPollSummary');
    if (raw) {
      lastPollSummary = JSON.parse(raw);
    }
  } catch {
    /* DB not ready or invalid JSON */
  }
};
