import { logger } from '../logger';
import { broadcast } from '../ws';

import { generateWeeklyReport } from './aggregator';
import {
  completeWeeklyPoll,
  failWeeklyPoll,
  getWeeklyPollStatus,
  isWeeklyPollRunning,
  startWeeklyPoll,
} from './pollState';

const log = logger.child({ module: 'WeeklyReport:Poller' });

export const runWeeklyPollCycle = async (
  component?: string,
): Promise<{ error?: string; success: boolean }> => {
  if (isWeeklyPollRunning()) {
    log.warn('Weekly poll already running, skipping');
    return { error: 'Poll already running', success: false };
  }

  startWeeklyPoll();
  broadcastStatus();

  try {
    await generateWeeklyReport({ component });
    completeWeeklyPoll();
    broadcastStatus();
    broadcast('weekly-data-updated');
    return { success: true };
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    failWeeklyPoll(message);
    broadcastStatus();
    log.error({ err }, 'Weekly poll cycle failed');
    return { error: message, success: false };
  }
};

const broadcastStatus = (): void => {
  const status = getWeeklyPollStatus();
  broadcast('weekly-poll-progress', status);
};
