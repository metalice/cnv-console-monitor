import 'reflect-metadata';
import http from 'http';
import { createApp } from './api';
import { config, applySettingsOverrides, setLastPollAt } from './config';
import { logger } from './logger';
import { getAllSettings } from './db/store';
import { AppDataSource } from './db/data-source';
import { initWebSocket, broadcast } from './ws';
import { pollReportPortal, backfillTestItems, backfillComponents } from './poller';
import { lockPoll, unlockPoll } from './pollLock';
import { getLaunchCount } from './db/store';
import { setupSubscriptionCrons, setupAckReminder } from './serve-cron';

const log = logger.child({ module: 'Dashboard' });

const main = async (): Promise<void> => {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  log.info('Database ready, migrations applied');

  const dbSettings = await getAllSettings();
  applySettingsOverrides(dbSettings);
  log.info({ overrides: Object.keys(dbSettings).length }, 'Settings loaded from DB');

  const app = createApp();
  const server = http.createServer(app);

  initWebSocket(server);

  const runPoll = async (): Promise<void> => {
    if (!lockPoll()) {
      log.info('Poll already in progress, skipping');
      return;
    }
    try {
      const count = await getLaunchCount();
      const isInitial = count === 0;
      const lookbackHours = isInitial
        ? config.schedule.initialLookbackDays * 24
        : 168;

      log.info({ lookbackHours, isInitial }, 'Starting poll cycle');
      const result = await pollReportPortal(lookbackHours, !isInitial);
      setLastPollAt(Date.now());
      broadcast('data-updated');

      if (isInitial && result.launches.length > 0) {
        log.info('Starting background backfill of test items...');
        backfillTestItems(result.launches, () => broadcast('data-updated')).catch(
          (err) => log.error({ err }, 'Backfill failed'),
        );
      }

      log.info('Poll cycle complete');
    } catch (err) {
      log.error({ err }, 'Poll cycle failed');
    } finally {
      unlockPoll();
    }
  }

  const pollIntervalMs = config.schedule.pollIntervalMinutes * 60 * 1000;

  setupAckReminder();

  server.listen(config.dashboard.port, () => {
    log.info({
      port: config.dashboard.port,
      reportportal: config.reportportal.url,
      project: config.reportportal.project,
      pollInterval: `${config.schedule.pollIntervalMinutes}m`,
      initialLookback: `${config.schedule.initialLookbackDays}d`,
      ackReminder: '10:00',
    }, 'Server started');

    backfillComponents(() => broadcast('data-updated')).catch(
      (err) => log.error({ err }, 'Component backfill failed'),
    );

    setupSubscriptionCrons().catch(
      (err) => log.error({ err }, 'Failed to setup subscription crons'),
    );

    runPoll().catch((err) => log.error({ err }, 'Initial poll failed'));

    const schedulePoll = () => {
      setTimeout(() => {
        runPoll()
          .catch((err) => log.error({ err }, 'Scheduled poll failed'))
          .finally(schedulePoll);
      }, pollIntervalMs);
    };
    schedulePoll();
  });
}

main().catch((err) => {
  log.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
