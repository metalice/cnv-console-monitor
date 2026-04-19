import { type NextFunction, type Request, type Response, Router } from 'express';

import { CreateSubscriptionSchema, UpdateSubscriptionSchema } from '@cnv-monitor/shared';

import { buildDailyReport } from '../../analyzer';
import {
  createSubscription,
  deleteSubscription,
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
} from '../../db/store';
import { logger } from '../../logger';
import { dispatchToSubscription } from '../../notifiers/dispatch';
import { setupSubscriptionCrons, setupTeamReportCrons } from '../../serve-cron';
import { getSubscriptionOwner, requireOwnerOrAdmin } from '../middleware/auth';

const log = logger.child({ module: 'Subscriptions' });
const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const subs = await getAllSubscriptions();
    res.json(subs);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(', ') });
      return;
    }
    const createdBy = req.user?.email || 'unknown';
    const sub = await createSubscription({
      ...parsed.data,
      createdBy,
      jiraWebhook: parsed.data.jiraWebhook ?? null,
      slackWebhook: parsed.data.slackWebhook ?? null,
      teamReportSchedule: parsed.data.teamReportSchedule ?? null,
      type: parsed.data.type,
    });
    setupSubscriptionCrons().catch(err => log.warn({ err }, 'Failed to refresh crons'));
    setupTeamReportCrons().catch(err => log.warn({ err }, 'Failed to refresh team report crons'));
    res.status(201).json(sub);
  } catch (err) {
    next(err);
  }
});

router.put(
  '/:id',
  requireOwnerOrAdmin(getSubscriptionOwner),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const parsed = UpdateSubscriptionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join(', ') });
        return;
      }

      const updated = await updateSubscription(id, parsed.data);
      if (!updated) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }
      setupSubscriptionCrons().catch(err => log.warn({ err }, 'Failed to refresh crons'));
      setupTeamReportCrons().catch(err => log.warn({ err }, 'Failed to refresh team report crons'));
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  requireOwnerOrAdmin(getSubscriptionOwner),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }
      await deleteSubscription(id);
      setupSubscriptionCrons().catch(err => log.warn({ err }, 'Failed to refresh crons'));
      setupTeamReportCrons().catch(err => log.warn({ err }, 'Failed to refresh team report crons'));
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

const testTeamReportSubscription = async (
  sub: Awaited<ReturnType<typeof getSubscription>> & object,
): Promise<string[]> => {
  const results: string[] = [];

  const { listReports } = await import('../../db/store/reports');
  const { entityToReport } = await import('../../db/mappers/report');
  const reports = await listReports();
  if (reports.length === 0) {
    results.push('No team report available to send. Generate one first.');
    return results;
  }
  const report = entityToReport(reports[0]);

  if (sub.teamReportSlackWebhook) {
    try {
      const { sendReportSlack } = await import('../../notifiers/reportSlack');
      await sendReportSlack(report, sub.teamReportSlackWebhook);
      results.push('Team Report Slack sent');
    } catch (err) {
      results.push(`Team Report Slack failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  const recipients = sub.teamReportEmailRecipients ?? [];
  if (recipients.length > 0) {
    try {
      const { sendReportEmail } = await import('../../notifiers/reportEmail');
      await sendReportEmail(report, recipients);
      results.push(`Team Report Email sent to ${recipients.join(', ')}`);
    } catch (err) {
      results.push(`Team Report Email failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  if (results.length === 0) {
    results.push('No team report Slack webhook or email recipients configured');
  }

  return results;
};

router.post(
  '/:id/test',
  requireOwnerOrAdmin(getSubscriptionOwner),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid id' });
        return;
      }

      const sub = await getSubscription(id);
      if (!sub) {
        res.status(404).json({ error: 'Subscription not found' });
        return;
      }

      const results =
        sub.type === 'team_report'
          ? await testTeamReportSubscription(sub)
          : await dispatchToSubscription(await buildDailyReport(24), sub);

      const hasFailure = results.some(msg => msg.toLowerCase().includes('failed'));

      log.info({ results, subId: id }, 'Test notification sent');
      res.json({ message: results.join('; '), results, success: !hasFailure });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
