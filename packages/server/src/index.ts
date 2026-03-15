import 'reflect-metadata';
import { pollReportPortal } from './poller';
import { buildDailyReport, DailyReport } from './analyzer';
import { sendSlackReport } from './notifiers/slack';
import { sendEmailReport } from './notifiers/email';
import { config } from './config';
import { logger } from './logger';
import { AppDataSource } from './db/data-source';
import { getAllSubscriptions } from './db/store';

const log = logger.child({ module: 'Main' });

async function dispatchToSubscriptions(report: DailyReport): Promise<void> {
  const subs = await getAllSubscriptions();
  if (subs.length === 0) {
    log.info('No subscriptions configured, skipping notifications');
    return;
  }

  for (const sub of subs) {
    if (!sub.enabled) continue;
    const filtered: DailyReport = { ...report };
    if (sub.components.length > 0) {
      filtered.groups = report.groups.filter(g => sub.components.includes(g.component ?? ''));
      const filteredLaunches = filtered.groups.flatMap(g => g.launches);
      filtered.totalLaunches = filteredLaunches.length;
      filtered.passedLaunches = filteredLaunches.filter(l => l.status === 'PASSED').length;
      filtered.failedLaunches = filteredLaunches.filter(l => l.status === 'FAILED').length;
      filtered.inProgressLaunches = filteredLaunches.filter(l => l.status === 'IN_PROGRESS').length;
      filtered.overallHealth = filtered.failedLaunches > 0 ? 'red' : filtered.inProgressLaunches > 0 ? 'yellow' : 'green';
      const filteredItemIds = new Set(filtered.groups.flatMap(g => g.failedItems.map(i => i.rp_id)));
      filtered.newFailures = report.newFailures.filter(f => filteredItemIds.has(f.rp_id));
      filtered.untriagedCount = filtered.groups.flatMap(g => g.failedItems).filter(i => !i.defect_type || i.defect_type === 'ti001' || i.defect_type?.startsWith('ti_')).length;
    }

    if (sub.slackWebhook) {
      try {
        await sendSlackReport(filtered, sub.slackWebhook);
        log.info({ subId: sub.id, name: sub.name }, 'Subscription Slack sent');
      } catch (err) {
        log.warn({ err, subId: sub.id }, 'Subscription Slack failed');
      }
    }
    if (sub.emailRecipients.length > 0) {
      try {
        await sendEmailReport(filtered, sub.emailRecipients);
        log.info({ subId: sub.id, name: sub.name }, 'Subscription email sent');
      } catch (err) {
        log.warn({ err, subId: sub.id }, 'Subscription email failed');
      }
    }
  }
}

async function main(): Promise<void> {
  log.info('Initializing database...');
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  log.info({ url: config.reportportal.url, project: config.reportportal.project }, 'Configuration');

  try {
    await pollReportPortal(24);

    const report = await buildDailyReport(24);

    log.info({ totalLaunches: report.totalLaunches, failed: report.failedLaunches, newFailures: report.newFailures.length }, 'Report built');

    await dispatchToSubscriptions(report);

    log.info('Poll cycle complete');
    process.exit(0);
  } catch (err) {
    log.fatal({ err }, 'Fatal error');
    process.exit(1);
  }
}

main();
