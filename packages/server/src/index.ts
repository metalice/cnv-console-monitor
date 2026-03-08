import 'reflect-metadata';
import { pollReportPortal } from './poller';
import { buildDailyReport } from './analyzer';
import { sendSlackReport } from './notifiers/slack';
import { sendEmailReport } from './notifiers/email';
import { config } from './config';
import { logger } from './logger';
import { AppDataSource } from './db/data-source';

const log = logger.child({ module: 'Main' });

async function main(): Promise<void> {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  log.info({ url: config.reportportal.url, project: config.reportportal.project, filter: config.dashboard.launchFilter }, 'Configuration');

  try {
    await pollReportPortal(24);

    const report = await buildDailyReport(24);

    log.info({ totalLaunches: report.totalLaunches, failed: report.failedLaunches, newFailures: report.newFailures.length }, 'Report built');

    await sendSlackReport(report);
    await sendEmailReport(report);

    log.info('Poll cycle complete');
    process.exit(0);
  } catch (err) {
    log.fatal({ err }, 'Fatal error');
    process.exit(1);
  }
}

main();
