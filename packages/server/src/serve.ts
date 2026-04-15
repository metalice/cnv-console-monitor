import http from 'http';

import 'reflect-metadata';

import { AppDataSource } from './db/data-source';
import { getAllSettings, getMostRecentLaunchTime } from './db/store';
import { backfillComponentFromSiblings } from './db/store';
import { createApp } from './api';
import { refreshMappingCache } from './componentMap';
import { applySettingsOverrides, config, setLastPollAt } from './config';
import { logger } from './logger';
import { enrichLaunchesFromJenkins, pollReportPortal, refreshStaleInProgress } from './poller';
import { isAutoPollPaused, isPollLocked, lockPoll, unlockPoll } from './pollLock';
import { setupAckReminder, setupSubscriptionCrons, setupTeamReportCrons } from './serve-cron';
import { broadcast, initWebSocket } from './ws';

const log = logger.child({ module: 'Dashboard' });

const runScheduledPoll = async (): Promise<void> => {
  if (isAutoPollPaused()) {
    log.info('Scheduled poll skipped — auto-poll paused (backfill in progress)');
    return;
  }
  if (isPollLocked()) {
    log.info('Scheduled poll skipped — another poll is in progress');
    return;
  }
  const pollId = lockPoll();
  if (!pollId) {
    log.info('Scheduled poll skipped — lock contention');
    return;
  }
  try {
    const lookbackHours = 24;
    log.info({ lookbackHours, pollId }, 'Starting scheduled poll');
    const result = await pollReportPortal(lookbackHours, true, pollId);
    setLastPollAt(Date.now());
    unlockPoll();
    broadcast('data-updated');

    refreshStaleInProgress().catch(staleErr => log.error({ staleErr }, 'Stale refresh failed'));
    if (result.launches.length > 0) {
      enrichLaunchesFromJenkins(result.launches)
        .then(() => backfillComponentFromSiblings())
        .then(() => broadcast('data-updated'))
        .catch(enrichErr => log.error({ enrichErr }, 'Post-poll enrichment failed'));
    } else {
      backfillComponentFromSiblings()
        .then(() => broadcast('data-updated'))
        .catch(backfillErr => log.error({ backfillErr }, 'Sibling backfill failed'));
    }
    log.info('Scheduled poll complete');
  } catch (err) {
    log.error({ err }, 'Poll cycle failed');
    unlockPoll();
  }
};

const main = async (): Promise<void> => {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  log.info('Database ready, migrations applied');

  const dbSettings = await getAllSettings();
  applySettingsOverrides(dbSettings);
  log.info({ overrides: Object.keys(dbSettings).length }, 'Settings loaded from DB');

  await refreshMappingCache();

  const { cleanupInternalSettingsLogs, scrubSensitiveSettingsLogs } = await import('./db/store');
  const cleaned = await cleanupInternalSettingsLogs();
  if (cleaned > 0) {
    log.info({ cleaned }, 'Removed internal settings log entries');
  }
  const scrubbed = await scrubSensitiveSettingsLogs();
  if (scrubbed > 0) {
    log.info({ scrubbed }, 'Scrubbed exposed secrets from settings log');
  }

  const lastLaunchTime = await getMostRecentLaunchTime();
  if (lastLaunchTime) {
    setLastPollAt(lastLaunchTime);
  }

  const { loadLastPollSummary } = await import('./pollLock');
  await loadLastPollSummary();

  const { initPipelineManager, registerDefaultPhases } = await import('./pipeline');
  await initPipelineManager();
  registerDefaultPhases();
  log.info('Pipeline manager initialized');

  const { initAIService } = await import('./ai');
  await initAIService();
  log.info('AI service initialized');

  const app = createApp();
  const server = http.createServer(app);

  initWebSocket(server);
  setupAckReminder();

  server.listen(config.dashboard.port, () => {
    log.info(
      {
        ackReminder: '10:00',
        pollInterval: `${config.schedule.pollIntervalMinutes}m`,
        port: config.dashboard.port,
        project: config.reportportal.project,
        reportportal: config.reportportal.url,
      },
      'Server started — use Settings > Fetch Full History to populate data',
    );

    setupSubscriptionCrons().catch(err => log.error({ err }, 'Failed to setup subscription crons'));
    setupTeamReportCrons().catch(err => log.error({ err }, 'Failed to setup team report crons'));

    const scheduleNextPoll = () => {
      const intervalMs = config.schedule.pollIntervalMinutes * 60 * 1000;
      setTimeout(() => {
        void runScheduledPoll()
          .catch(err => log.error({ err }, 'Scheduled poll failed'))
          .finally(scheduleNextPoll);
      }, intervalMs);
    };
    scheduleNextPoll();

    const scheduleQuarantineSLA = () => {
      const oneHour = 60 * 60 * 1000;
      setTimeout(async () => {
        try {
          const { checkQuarantineSLA } = await import('./services/QuarantineService');
          await checkQuarantineSLA();
        } catch (err) {
          log.error({ err }, 'Quarantine SLA check failed');
        }
        scheduleQuarantineSLA();
      }, oneHour);
    };
    scheduleQuarantineSLA();
  });
};

main().catch(err => {
  log.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
