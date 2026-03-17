let polling = false;
let cancelled = false;
let autoPollPaused = false;
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

const EMPTY: PollProgress = { active: false, phase: '', current: 0, total: 0, message: '', startedAt: null };
const COMPLETE_LINGER_MS = 6000;

let progress: PollProgress = { ...EMPTY };

export const isPollLocked = (): boolean => polling;

export const lockPoll = (): number => {
  if (polling) return 0;
  polling = true;
  cancelled = false;
  currentPollId = Date.now();
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
  progress = { active: true, phase: 'starting', current: 0, total: 0, message: 'Starting poll...', startedAt: currentPollId };
  return currentPollId;
};

export const unlockPoll = (): void => {
  polling = false;
  cancelled = false;
  progress = { ...progress, active: false, phase: 'complete' };
  clearTimer = setTimeout(() => { progress = { ...EMPTY }; clearTimer = null; }, COMPLETE_LINGER_MS);
};

export const forceUnlockPoll = (): void => {
  polling = false;
  cancelled = true;
  if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
  progress = { active: false, phase: 'cancelled', current: progress.current, total: progress.total, message: 'Poll cancelled', startedAt: null };
  clearTimer = setTimeout(() => { progress = { ...EMPTY }; clearTimer = null; }, COMPLETE_LINGER_MS);
};

export const isPollCancelled = (): boolean => cancelled;

export const pauseAutoPoll = (): void => { autoPollPaused = true; };
export const resumeAutoPoll = (): void => { autoPollPaused = false; };
export const isAutoPollPaused = (): boolean => autoPollPaused;

export const updatePollProgress = (pollId: number, update: Partial<Omit<PollProgress, 'active' | 'startedAt'>>): void => {
  if (pollId !== currentPollId) return;
  Object.assign(progress, update);
};

export const getPollProgress = (): PollProgress => ({ ...progress });
