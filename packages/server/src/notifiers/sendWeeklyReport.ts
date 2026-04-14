import { type WeeklyReport } from '@cnv-monitor/shared';

import { config } from '../config';
import { getSetting } from '../db/store/settings';
import { logger } from '../logger';

import { sendWeeklyEmailReport } from './weeklyEmail';
import { sendWeeklySlackReport } from './weeklySlack';

const log = logger.child({ module: 'WeeklyReport:Distribution' });

export const distributeWeeklyReport = async (report: WeeklyReport): Promise<void> => {
  const results = await Promise.allSettled([
    sendWeeklySlackNotification(report),
    sendWeeklyEmailNotification(report),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      log.error({ err: result.reason }, 'Weekly report distribution channel failed');
    }
  }
};

const sendWeeklySlackNotification = async (report: WeeklyReport): Promise<void> => {
  const webhookUrl = await getSetting('weekly.slack.webhookUrl');
  const fallbackUrl = config.slack.jiraWebhookUrl;
  const url = webhookUrl ?? fallbackUrl;

  if (!url) {
    log.debug('Slack not configured for weekly report, skipping');
    return;
  }

  await sendWeeklySlackReport(report, url);
  log.info({ weekId: report.weekId }, 'Weekly report sent to Slack');
};

const sendWeeklyEmailNotification = async (report: WeeklyReport): Promise<void> => {
  if (!config.email.enabled) {
    log.debug('Email not configured, skipping weekly report email');
    return;
  }

  const recipientsSetting = await getSetting('weekly.email.recipients');
  const recipients = recipientsSetting ? recipientsSetting.split(',').filter(Boolean) : [];

  if (recipients.length === 0) {
    log.debug('No weekly report email recipients configured, skipping');
    return;
  }

  await sendWeeklyEmailReport(report, recipients);
  log.info(
    { recipients: recipients.length, weekId: report.weekId },
    'Weekly report sent via email',
  );
};
