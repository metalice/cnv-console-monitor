import 'reflect-metadata';
import { pollReportPortal } from './poller';
import { buildDailyReport } from './analyzer';
import { config } from './config';
import { logger } from './logger';
import { AppDataSource } from './db/data-source';
import { getAllSubscriptions } from './db/store';
import { dispatchToSubscription } from './notifiers/dispatch';

const log = logger.child({ module: 'Main' });

const dispatchToSubscriptions = async (): Promise<void> => {
  const subs = await getAllSubscriptions();
  if (subs.length === 0) {
    log.info('No subscriptions configured, skipping notifications');
    return;
  }

  const report = await buildDailyReport(24);

  for (const sub of subs) {
    if (!sub.enabled) continue;
    await dispatchToSubscription(report, sub);
  }
}

const main = async (): Promise<void> => {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  log.info({ url: config.reportportal.url, project: config.reportportal.project }, 'Configuration');

  try {
    await pollReportPortal(24, true, Date.now());

    await dispatchToSubscriptions();

    log.info('Poll cycle complete');
    process.exit(0);
  } catch (err) {
    log.fatal({ err }, 'Fatal error');
    process.exit(1);
  }
}

main();
