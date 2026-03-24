import cron, { type ScheduledTask } from 'node-cron';

import { getAcknowledgmentsForDate, getAllSubscriptions } from './db/store';
import { dispatchToSubscription } from './notifiers/dispatch';
import { sendSlackReminder } from './notifiers/slack';
import { buildDailyReport } from './analyzer';
import { logger } from './logger';

const log = logger.child({ module: 'ServeCron' });

const dispatchSubscriptionNotifications = async (): Promise<void> => {
  try {
    const subs = await getAllSubscriptions();
    if (subs.length === 0) {
      return;
    }

    const report = await buildDailyReport(24);

    for (const sub of subs) {
      if (!sub.enabled) {
        continue;
      }
      await dispatchToSubscription(report, sub);
    }
  } catch (err) {
    log.error({ err }, 'Subscription dispatch failed');
  }
};

const scheduledJobs = new Map<string, ScheduledTask>();

export const setupSubscriptionCrons = async (): Promise<void> => {
  for (const [, job] of scheduledJobs) {
    void job.stop();
  }
  scheduledJobs.clear();

  const subs = await getAllSubscriptions();
  const scheduleGroups = new Map<string, string>();
  for (const sub of subs) {
    if (!sub.enabled) {
      continue;
    }
    const key = `${sub.schedule}|${sub.timezone || 'Asia/Jerusalem'}`;
    if (!scheduleGroups.has(key)) {
      scheduleGroups.set(key, sub.timezone || 'Asia/Jerusalem');
    }
  }

  for (const [key, timezone] of scheduleGroups) {
    const schedule = key.split('|')[0];
    if (!cron.validate(schedule)) {
      log.warn({ schedule }, 'Invalid cron in subscription, skipping');
      continue;
    }
    const job = cron.schedule(
      schedule,
      () => {
        dispatchSubscriptionNotifications().catch(err => log.error({ err }, 'Dispatch failed'));
      },
      { timezone },
    );
    scheduledJobs.set(key, job);
    log.info({ schedule, timezone }, 'Subscription cron scheduled');
  }
};

export const setupAckReminder = (): void => {
  cron.schedule('* * * * *', async () => {
    const subs = await getAllSubscriptions();
    const now = new Date();

    for (const sub of subs) {
      if (!sub.enabled || !sub.slackWebhook || !sub.reminderEnabled) {
        continue;
      }

      const tz = sub.timezone || 'Asia/Jerusalem';
      const [rHour, rMinute] = (sub.reminderTime || '10:00').split(':').map(Number);
      const allowedDays = (sub.reminderDays || '1,2,3,4,5')
        .split(',')
        .map(d => parseInt(d.trim(), 10));

      const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      if (localTime.getHours() !== rHour || localTime.getMinutes() !== rMinute) {
        continue;
      }
      if (!allowedDays.includes(localTime.getDay())) {
        continue;
      }

      const today = now.toLocaleDateString('en-CA', { timeZone: tz });
      const acks = await getAcknowledgmentsForDate(today);
      if (acks.length > 0) {
        continue;
      }

      try {
        await sendSlackReminder(sub.slackWebhook);
        log.info({ date: today, subId: sub.id }, 'Ack reminder sent');
      } catch (err) {
        log.error({ err, subId: sub.id }, 'Failed to send ack reminder');
      }
    }
  });
};
