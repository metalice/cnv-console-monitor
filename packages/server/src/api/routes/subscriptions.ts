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
import { setupSubscriptionCrons } from '../../serve-cron';
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
    });
    setupSubscriptionCrons().catch(err => log.warn({ err }, 'Failed to refresh crons'));
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
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

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

      const report = await buildDailyReport(24);
      const results = await dispatchToSubscription(report, sub);

      log.info({ results, subId: id }, 'Test notification sent');
      res.json({ message: results.join('; '), success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
