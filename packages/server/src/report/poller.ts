import { logger } from '../logger';
import { broadcast } from '../ws';

import { generateReport } from './aggregator';
import {
  completeReportPoll,
  failReportPoll,
  getAllPollStatuses,
  isReportPollRunning,
  startReportPoll,
} from './pollState';

const log = logger.child({ module: 'TeamReport:Poller' });

export const runReportPollCycle = async (
  component?: string,
  since?: string,
  until?: string,
  generatedBy?: string,
): Promise<{ error?: string; success: boolean }> => {
  if (isReportPollRunning(component)) {
    log.warn({ component }, 'Poll already running for component, skipping');
    return { error: 'Poll already running', success: false };
  }

  startReportPoll(component);
  broadcastStatus();

  try {
    await generateReport({ component, generatedBy, since, until });
    completeReportPoll(component);
    broadcastStatus();
    broadcast('report-data-updated');
    return { success: true };
  } catch (err) {
    const message = (err as Error).message || 'Unknown error';
    failReportPoll(message, component);
    broadcastStatus();
    log.error({ component, err }, 'Poll cycle failed');
    return { error: message, success: false };
  }
};

export const runParallelPollCycles = async (
  components: string[],
  since?: string,
  until?: string,
  generatedBy?: string,
): Promise<{ results: Record<string, { error?: string; success: boolean }> }> => {
  const results = await Promise.allSettled(
    components.map(async comp => {
      const result = await runReportPollCycle(comp, since, until, generatedBy);
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
  broadcast('report-poll-progress', getAllPollStatuses());
};
