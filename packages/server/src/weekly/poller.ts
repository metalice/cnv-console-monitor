import { logger } from '../logger';
import { broadcast } from '../ws';

import { generateWeeklyReport } from './aggregator';
import {
  completeWeeklyPoll,
  failWeeklyPoll,
  getAllPollStatuses,
  isWeeklyPollRunning,
  startWeeklyPoll,
} from './pollState';

const log = logger.child({ module: 'TeamReport:Poller' });

export const runWeeklyPollCycle = async (
  component?: string,
  since?: string,
  until?: string,
): Promise<{ error?: string; success: boolean }> => {
  if (isWeeklyPollRunning(component)) {
    log.warn({ component }, 'Poll already running for component, skipping');
    return { error: 'Poll already running', success: false };
  }

  startWeeklyPoll(component);
  broadcastStatus();

  try {
    await generateWeeklyReport({ component, since, until });
    completeWeeklyPoll(component);
    broadcastStatus();
    broadcast('weekly-data-updated');
    return { success: true };
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    failWeeklyPoll(message, component);
    broadcastStatus();
    log.error({ component, err }, 'Poll cycle failed');
    return { error: message, success: false };
  }
};

export const runParallelPollCycles = async (
  components: string[],
  since?: string,
  until?: string,
): Promise<{ results: Record<string, { error?: string; success: boolean }> }> => {
  const results = await Promise.allSettled(
    components.map(async comp => {
      const result = await runWeeklyPollCycle(comp, since, until);
      return { component: comp, ...result };
    }),
  );

  const out: Record<string, { error?: string; success: boolean }> = {};
  for (const result of results) {
    if (result.status === 'fulfilled') {
      out[result.value.component] = { error: result.value.error, success: result.value.success };
    } else {
      const msg = result.reason instanceof Error ? result.reason.message : 'Unknown';
      out.unknown = { error: msg, success: false };
    }
  }
  return { results: out };
};

const broadcastStatus = (): void => {
  broadcast('weekly-poll-progress', getAllPollStatuses());
};
