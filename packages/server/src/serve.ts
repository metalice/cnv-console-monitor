import 'reflect-metadata';
import http from 'http';
import cron from 'node-cron';
import { createApp } from './api';
import { config } from './config';
import { logger } from './logger';
import { AppDataSource } from './db/data-source';
import { initWebSocket, broadcast } from './ws';
import { pollReportPortal, backfillTestItems } from './poller';
import { getLaunchCount } from './db/store';
import { getAcknowledgmentsForDate } from './db/store';
import { sendSlackReminder } from './notifiers/slack';

const log = logger.child({ module: 'Dashboard' });

async function main(): Promise<void> {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();
  log.info('Database ready, migrations applied');

  const app = createApp();
  const server = http.createServer(app);

  initWebSocket(server);

  async function runPoll(): Promise<void> {
    try {
      const count = await getLaunchCount();
      const isInitial = count === 0;
      const lookbackHours = isInitial
        ? config.schedule.initialLookbackDays * 24
        : 168;

      log.info({ lookbackHours, isInitial }, 'Starting poll cycle');
      const result = await pollReportPortal(lookbackHours, !isInitial);
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
    }
  }

  const pollIntervalMs = config.schedule.pollIntervalMinutes * 60 * 1000;

  const ackReminderHour = config.schedule.ackReminderHour;
  cron.schedule(`0 ${ackReminderHour} * * *`, async () => {
    const today = new Date().toISOString().split('T')[0];
    const acks = await getAcknowledgmentsForDate(today);

    if (acks.length === 0) {
      log.warn({ date: today }, 'No acknowledgment, sending reminder');
      try {
        await sendSlackReminder();
      } catch (err) {
        log.error({ err }, 'Failed to send ack reminder');
      }
    } else {
      log.info({ date: today, reviewer: acks[0].reviewer }, 'Already acknowledged');
    }
  });

  server.listen(config.dashboard.port, () => {
    log.info({
      port: config.dashboard.port,
      reportportal: config.reportportal.url,
      project: config.reportportal.project,
      pollInterval: `${config.schedule.pollIntervalMinutes}m`,
      initialLookback: `${config.schedule.initialLookbackDays}d`,
      ackReminder: `${ackReminderHour}:00`,
    }, 'Server started');

    runPoll();
    setInterval(runPoll, pollIntervalMs);
  });
}

main().catch((err) => {
  log.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
