import cron, { type ScheduledTask } from 'node-cron';
import { config } from './config';
import { logger } from './logger';
import { getAllSubscriptions, getAcknowledgmentsForDate } from './db/store';
import { buildDailyReport, DailyReport } from './analyzer';
import { sendSlackReport, sendSlackReminder } from './notifiers/slack';
import { sendEmailReport } from './notifiers/email';

const log = logger.child({ module: 'ServeCron' });

const dispatchSubscriptionNotifications = async (): Promise<void> => {
  try {
    const subs = await getAllSubscriptions();
    if (subs.length === 0) return;

    const report = await buildDailyReport(24);

    for (const sub of subs) {
      if (!sub.enabled) continue;
      const filtered: DailyReport = { ...report };
      if (sub.components.length > 0) {
        filtered.groups = report.groups.filter(group => sub.components.includes(group.component ?? ''));
        const filteredLaunches = filtered.groups.flatMap(group => group.launches);
        filtered.totalLaunches = filteredLaunches.length;
        filtered.passedLaunches = filteredLaunches.filter(launch => launch.status === 'PASSED').length;
        filtered.failedLaunches = filteredLaunches.filter(launch => launch.status === 'FAILED').length;
        filtered.inProgressLaunches = filteredLaunches.filter(launch => launch.status === 'IN_PROGRESS').length;
        filtered.overallHealth = filtered.failedLaunches > 0 ? 'red' : filtered.inProgressLaunches > 0 ? 'yellow' : 'green';
        const filteredItemIds = new Set(filtered.groups.flatMap(group => group.failedItems.map(item => item.rp_id)));
        filtered.newFailures = report.newFailures.filter(failure => filteredItemIds.has(failure.rp_id));
        filtered.untriagedCount = filtered.groups.flatMap(group => group.failedItems).filter(item => !item.defect_type || item.defect_type === 'ti001' || item.defect_type?.startsWith('ti_')).length;
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

export const setupSubscriptionCrons = async (): Promise<void> => {
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

export const setupAckReminder = (): void => {
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
}
