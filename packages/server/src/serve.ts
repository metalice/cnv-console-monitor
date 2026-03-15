import 'reflect-metadata';
import http from 'http';
import cron, { type ScheduledTask } from 'node-cron';
import { createApp } from './api';
import { config, applySettingsOverrides, setLastPollAt } from './config';
import { logger } from './logger';
import { getAllSettings, getAllSubscriptions } from './db/store';
import { AppDataSource } from './db/data-source';
import { initWebSocket, broadcast } from './ws';
import { pollReportPortal, backfillTestItems, backfillComponents } from './poller';
import { lockPoll, unlockPoll } from './pollLock';
import { getLaunchCount, getAcknowledgmentsForDate } from './db/store';
import { buildDailyReport, DailyReport } from './analyzer';
import { sendSlackReport, sendSlackReminder } from './notifiers/slack';
import { sendEmailReport } from './notifiers/email';

const log = logger.child({ module: 'Dashboard' });

async function main(): Promise<void> {
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

  async function runPoll(): Promise<void> {
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

  async function dispatchSubscriptionNotifications(): Promise<void> {
    try {
      const subs = await getAllSubscriptions();
      if (subs.length === 0) return;

      const report = await buildDailyReport(24);

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
    } catch (err) {
      log.error({ err }, 'Subscription dispatch failed');
    }
  }

  const scheduledJobs = new Map<string, ScheduledTask>();

  async function setupSubscriptionCrons(): Promise<void> {
    for (const [, job] of scheduledJobs) job.stop();
    scheduledJobs.clear();

    const subs = await getAllSubscriptions();
    const scheduleGroups = new Map<string, boolean>();
    for (const sub of subs) {
      if (sub.enabled) scheduleGroups.set(sub.schedule, true);
    }

    for (const schedule of scheduleGroups.keys()) {
      if (!cron.validate(schedule)) {
        log.warn({ schedule }, 'Invalid cron in subscription, skipping');
        continue;
      }
      const job = cron.schedule(schedule, () => {
        dispatchSubscriptionNotifications().catch(err => log.error({ err }, 'Dispatch failed'));
      });
      scheduledJobs.set(schedule, job);
      log.info({ schedule }, 'Subscription cron scheduled');
    }
  }

  const reminderTz = config.schedule.timezone || 'Asia/Jerusalem';
  cron.schedule('0 10 * * *', async () => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: reminderTz });
    const acks = await getAcknowledgmentsForDate(today);

    if (acks.length === 0) {
      log.warn({ date: today }, 'No acknowledgment, sending reminder');
      const subs = await getAllSubscriptions();
      for (const sub of subs) {
        if (!sub.enabled || !sub.slackWebhook) continue;
        try {
          await sendSlackReminder(sub.slackWebhook);
        } catch (err) {
          log.error({ err, subId: sub.id }, 'Failed to send ack reminder');
        }
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
