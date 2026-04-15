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
      if (!sub.enabled || sub.type === 'team_report') {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await dispatchToSubscription(report, sub);
    }
  } catch (err) {
    log.error({ err }, 'Subscription dispatch failed');
  }
};

const scheduledJobs = new Map<string, ScheduledTask>();
const teamReportJobs = new Map<string, ScheduledTask>();

export const setupSubscriptionCrons = async (): Promise<void> => {
  for (const [, job] of scheduledJobs) {
    void job.stop();
  }
  scheduledJobs.clear();

  const subs = await getAllSubscriptions();
  const scheduleGroups = new Map<string, string>();
  for (const sub of subs) {
    if (!sub.enabled || sub.type === 'team_report') {
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

const dispatchTeamReportForSubs = async (subIds: number[]): Promise<void> => {
  try {
    const subs = await getAllSubscriptions();
    const targets = subs.filter(sub => sub.enabled && subIds.includes(sub.id));

    if (targets.length === 0) {
      return;
    }

    const { generateWeeklyReport } = await import('./weekly/aggregator');
    await generateWeeklyReport();

    const { listWeeklyReports } = await import('./db/store/weeklyReports');
    const { entityToWeeklyReport } = await import('./db/mappers/weeklyReport');
    const reports = await listWeeklyReports();
    if (reports.length === 0) {
      log.warn('No weekly report found after generation');
      return;
    }
    const latest = reports[0];

    const report = entityToWeeklyReport(latest);
    const { sendWeeklySlackReport } = await import('./notifiers/weeklySlack');
    const { sendWeeklyEmailReport } = await import('./notifiers/weeklyEmail');

    for (const sub of targets) {
      if (sub.teamReportSlackWebhook) {
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
          await sendWeeklySlackReport(report, sub.teamReportSlackWebhook);
          log.info({ subId: sub.id, subName: sub.name }, 'Team report Slack sent');
        } catch (err) {
          log.error({ err, subId: sub.id }, 'Team report Slack failed');
        }
      }
      const recipients = sub.teamReportEmailRecipients ?? [];
      if (recipients.length > 0) {
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
          await sendWeeklyEmailReport(report, recipients);
          log.info({ subId: sub.id, subName: sub.name }, 'Team report email sent');
        } catch (err) {
          log.error({ err, subId: sub.id }, 'Team report email failed');
        }
      }
    }
  } catch (err) {
    log.error({ err }, 'Team report dispatch failed');
  }
};

export const setupTeamReportCrons = async (): Promise<void> => {
  for (const [, job] of teamReportJobs) {
    void job.stop();
  }
  teamReportJobs.clear();

  const subs = await getAllSubscriptions();
  const scheduleGroups = new Map<string, number[]>();

  for (const sub of subs) {
    if (!sub.enabled || sub.type !== 'team_report' || !sub.teamReportSchedule) {
      continue;
    }
    const key = `${sub.teamReportSchedule}|${sub.timezone || 'Asia/Jerusalem'}`;
    const group = scheduleGroups.get(key) ?? [];
    group.push(sub.id);
    scheduleGroups.set(key, group);
  }

  for (const [key, subIds] of scheduleGroups) {
    const schedule = key.split('|')[0];
    const timezone = key.split('|').slice(1).join('|');
    if (!cron.validate(schedule)) {
      log.warn({ schedule }, 'Invalid team report cron, skipping');
      continue;
    }
    const job = cron.schedule(
      schedule,
      () => {
        dispatchTeamReportForSubs(subIds).catch(err =>
          log.error({ err }, 'Team report dispatch failed'),
        );
      },
      { timezone },
    );
    teamReportJobs.set(key, job);
    log.info({ schedule, subCount: subIds.length, timezone }, 'Team report cron scheduled');
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
        .map(day => parseInt(day.trim(), 10));

      const localTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      if (localTime.getHours() !== rHour || localTime.getMinutes() !== rMinute) {
        continue;
      }
      if (!allowedDays.includes(localTime.getDay())) {
        continue;
      }

      const today = now.toLocaleDateString('en-CA', { timeZone: tz });
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const acks = await getAcknowledgmentsForDate(today);
      if (acks.length > 0) {
        continue;
      }

      try {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        await sendSlackReminder(sub.slackWebhook);
        log.info({ date: today, subId: sub.id }, 'Ack reminder sent');
      } catch (err) {
        log.error({ err, subId: sub.id }, 'Failed to send ack reminder');
      }
    }
  });
};
