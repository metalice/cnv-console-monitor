import type { DailyReport } from '../analyzer';
import type { SubscriptionRecord } from '../db/store/types';
import { logger } from '../logger';

import { sendEmailReport } from './email';
import { sendSlackReport } from './slack';

const log = logger.child({ module: 'Dispatch' });

export const filterReportForSubscription = (
  report: DailyReport,
  sub: SubscriptionRecord,
): DailyReport => {
  if (sub.components.length === 0) {
    return report;
  }

  const filtered: DailyReport = { ...report };
  filtered.groups = report.groups.filter(group => sub.components.includes(group.component ?? ''));

  const filteredLaunches = filtered.groups.flatMap(group => group.launches);
  filtered.totalLaunches = filteredLaunches.length;
  filtered.passedLaunches = filteredLaunches.filter(l => l.status === 'PASSED').length;
  filtered.failedLaunches = filteredLaunches.filter(l => l.status === 'FAILED').length;
  filtered.inProgressLaunches = filteredLaunches.filter(l => l.status === 'IN_PROGRESS').length;
  filtered.overallHealth =
    filtered.failedLaunches > 0 ? 'red' : filtered.inProgressLaunches > 0 ? 'yellow' : 'green';

  const filteredItemIds = new Set(
    filtered.groups.flatMap(group => group.failedItems.map(item => item.rp_id)),
  );
  filtered.newFailures = report.newFailures.filter(f => filteredItemIds.has(f.rp_id));
  filtered.recurringFailures = report.recurringFailures.filter(f => filteredItemIds.has(f.rp_id));
  filtered.untriagedCount = filtered.groups
    .flatMap(group => group.failedItems)
    .filter(
      item =>
        !item.defect_type || item.defect_type === 'ti001' || item.defect_type.startsWith('ti_'),
    ).length;

  return filtered;
};

export const dispatchToSubscription = async (
  report: DailyReport,
  sub: SubscriptionRecord,
): Promise<string[]> => {
  const filtered = filterReportForSubscription(report, sub);
  const results: string[] = [];

  if (sub.slackWebhook) {
    try {
      await sendSlackReport(filtered, sub.slackWebhook);
      results.push('Slack sent');
      log.info({ name: sub.name, subId: sub.id }, 'Slack sent');
    } catch (err) {
      const msg = `Slack failed: ${err instanceof Error ? err.message : 'unknown'}`;
      results.push(msg);
      log.warn({ err, subId: sub.id }, 'Slack failed');
    }
  }

  if (sub.emailRecipients.length > 0) {
    try {
      await sendEmailReport(filtered, sub.emailRecipients);
      results.push(`Email sent to ${sub.emailRecipients.join(', ')}`);
      log.info({ name: sub.name, subId: sub.id }, 'Email sent');
    } catch (err) {
      const msg = `Email failed: ${err instanceof Error ? err.message : 'unknown'}`;
      results.push(msg);
      log.warn({ err, subId: sub.id }, 'Email failed');
    }
  }

  if (results.length === 0) {
    results.push('No Slack webhook or email recipients configured');
  }

  return results;
};
