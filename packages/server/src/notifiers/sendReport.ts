import { type TeamReport } from '@cnv-monitor/shared';

import { getAllSubscriptions } from '../db/store/subscriptions';
import { logger } from '../logger';

import { sendReportEmail } from './reportEmail';
import { sendReportSlack } from './reportSlack';

const log = logger.child({ module: 'TeamReport:Distribution' });

export const distributeReport = async (report: TeamReport): Promise<void> => {
  const subs = await getAllSubscriptions();
  const enabled = subs.filter(sub => sub.enabled);
  let slackSent = 0;
  let emailSent = 0;

  const tasks: Promise<void>[] = [];

  for (const sub of enabled) {
    if (sub.teamReportSlackWebhook) {
      const webhook = sub.teamReportSlackWebhook;
      tasks.push(
        sendReportSlack(report, webhook).then(() => {
          slackSent++;
          log.info({ subId: sub.id, subName: sub.name, weekId: report.weekId }, 'Slack sent');
          return undefined;
        }),
      );
    }

    const emailRecipients = sub.teamReportEmailRecipients ?? [];
    if (emailRecipients.length > 0) {
      tasks.push(
        sendReportEmail(report, emailRecipients).then(() => {
          emailSent++;
          log.info(
            { recipients: emailRecipients.length, subId: sub.id, subName: sub.name },
            'Email sent',
          );
          return undefined;
        }),
      );
    }
  }

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === 'rejected') {
      log.error({ err: result.reason }, 'Team report distribution channel failed');
    }
  }

  if (slackSent === 0 && emailSent === 0) {
    log.warn(
      { weekId: report.weekId },
      'No team report channels configured. Set them in Settings > Notifications.',
    );
  }
};
