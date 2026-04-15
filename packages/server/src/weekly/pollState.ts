import { type WeeklyPollStatus, type WeeklyPollStep } from '@cnv-monitor/shared';

import { logger } from '../logger';

const log = logger.child({ module: 'TeamReport:PollState' });

const RESET_TIMEOUT_MS = 60_000;
const GLOBAL_KEY = '__global__';

const STEP_PROGRESS: Record<WeeklyPollStep, number> = {
  'ai-mapping': 70,
  'ai-summary': 85,
  github: 10,
  gitlab: 25,
  idle: 0,
  jira: 40,
  saving: 95,
  sheets: 55,
};

const createIdleState = (): WeeklyPollStatus => ({
  completedAt: null,
  currentStep: 'idle',
  error: null,
  logs: [],
  progress: 0,
  startedAt: null,
  status: 'idle',
});

const states = new Map<string, WeeklyPollStatus>();
const resetTimers = new Map<string, ReturnType<typeof setTimeout>>();

let currentPollComponent: string | undefined;

export const setCurrentPollComponent = (component?: string): void => {
  currentPollComponent = component;
};

const resolveKey = (component?: string): string => component ?? currentPollComponent ?? GLOBAL_KEY;

export const getWeeklyPollStatus = (component?: string): WeeklyPollStatus => {
  const state = states.get(resolveKey(component)) ?? createIdleState();
  return { ...state, logs: [...state.logs] };
};

export const getAllPollStatuses = (): Record<string, WeeklyPollStatus> => {
  const result: Record<string, WeeklyPollStatus> = {};
  for (const [key, state] of states) {
    result[key] = { ...state, logs: [...state.logs] };
  }
  return result;
};

export const isWeeklyPollRunning = (component?: string): boolean => {
  const key = resolveKey(component);
  return states.get(key)?.status === 'running';
};

export const isAnyPollRunning = (): boolean => {
  for (const state of states.values()) {
    if (state.status === 'running') return true;
  }
  return false;
};

export const startWeeklyPoll = (component?: string): void => {
  const key = resolveKey(component);
  const existing = resetTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    resetTimers.delete(key);
  }
  states.set(key, {
    completedAt: null,
    currentStep: 'github',
    error: null,
    logs: [],
    progress: 0,
    startedAt: new Date().toISOString(),
    status: 'running',
  });
  log.info({ component: component ?? 'all' }, 'Poll started');
};

export const stepWeeklyPoll = (step: WeeklyPollStep, message: string, component?: string): void => {
  const key = resolveKey(component);
  const state = states.get(key);
  if (!state) return;
  state.currentStep = step;
  state.progress = STEP_PROGRESS[step];
  state.logs.push({ message, step, timestamp: new Date().toISOString() });
  log.info({ component: component ?? 'all', progress: state.progress, step }, message);
};

export const logWeeklyPoll = (step: WeeklyPollStep, message: string, component?: string): void => {
  const key = resolveKey(component);
  const state = states.get(key);
  if (!state) return;
  state.logs.push({ message, step, timestamp: new Date().toISOString() });
};

export const completeWeeklyPoll = (component?: string): void => {
  const key = resolveKey(component);
  const state = states.get(key);
  if (!state) return;
  state.status = 'completed';
  state.progress = 100;
  state.completedAt = new Date().toISOString();
  log.info({ component: component ?? 'all' }, 'Poll completed');
  scheduleReset(key);
};

export const failWeeklyPoll = (error: string, component?: string): void => {
  const key = resolveKey(component);
  const state = states.get(key);
  if (!state) return;
  state.status = 'failed';
  state.error = error;
  state.completedAt = new Date().toISOString();
  log.error({ component: component ?? 'all', error }, 'Poll failed');
  scheduleReset(key);
};

const scheduleReset = (key: string): void => {
  resetTimers.set(
    key,
    setTimeout(() => {
      states.delete(key);
      resetTimers.delete(key);
    }, RESET_TIMEOUT_MS),
  );
};
