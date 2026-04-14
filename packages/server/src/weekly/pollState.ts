import { type WeeklyPollStatus, type WeeklyPollStep } from '@cnv-monitor/shared';

import { logger } from '../logger';

const log = logger.child({ module: 'WeeklyReport:PollState' });

const RESET_TIMEOUT_MS = 60_000;

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

let state: WeeklyPollStatus = {
  completedAt: null,
  currentStep: 'idle',
  error: null,
  logs: [],
  progress: 0,
  startedAt: null,
  status: 'idle',
};

let resetTimer: ReturnType<typeof setTimeout> | null = null;

export const getWeeklyPollStatus = (): WeeklyPollStatus => ({ ...state, logs: [...state.logs] });

export const isWeeklyPollRunning = (): boolean => state.status === 'running';

export const startWeeklyPoll = (): void => {
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
  state = {
    completedAt: null,
    currentStep: 'github',
    error: null,
    logs: [],
    progress: 0,
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  log.info('Weekly poll started');
};

export const stepWeeklyPoll = (step: WeeklyPollStep, message: string): void => {
  state.currentStep = step;
  state.progress = STEP_PROGRESS[step];
  state.logs.push({
    message,
    step,
    timestamp: new Date().toISOString(),
  });
  log.info({ progress: state.progress, step }, message);
};

export const logWeeklyPoll = (step: WeeklyPollStep, message: string): void => {
  state.logs.push({
    message,
    step,
    timestamp: new Date().toISOString(),
  });
};

export const completeWeeklyPoll = (): void => {
  state.status = 'completed';
  state.progress = 100;
  state.completedAt = new Date().toISOString();
  log.info('Weekly poll completed');
  scheduleReset();
};

export const failWeeklyPoll = (error: string): void => {
  state.status = 'failed';
  state.error = error;
  state.completedAt = new Date().toISOString();
  log.error({ error }, 'Weekly poll failed');
  scheduleReset();
};

const scheduleReset = (): void => {
  resetTimer = setTimeout(() => {
    state = {
      completedAt: null,
      currentStep: 'idle',
      error: null,
      logs: [],
      progress: 0,
      startedAt: null,
      status: 'idle',
    };
    resetTimer = null;
  }, RESET_TIMEOUT_MS);
};
