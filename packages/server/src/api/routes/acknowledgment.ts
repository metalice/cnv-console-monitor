import { Router, Request, Response, NextFunction } from 'express';
import { AcknowledgeRequestSchema, DeleteAckRequestSchema } from '@cnv-monitor/shared';
import { addAcknowledgment, deleteAcknowledgment, getAcknowledgmentsForDate, getAckHistory, getApproverStats } from '../../db/store';
import { sendSlackAcknowledgment } from '../../notifiers/slack';
import { validateBody } from '../middleware/validate';
import { broadcast } from '../../ws';

const router = Router();

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/today', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const date = todayDate();
    const acks = await getAcknowledgmentsForDate(date);
    res.json({ date, acknowledged: acks.length > 0, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await getApproverStats(days);
    const history = await getAckHistory(days);

    const dateMap = new Map<string, string[]>();
    for (const entry of history) {
      if (!dateMap.has(entry.date)) dateMap.set(entry.date, []);
      dateMap.get(entry.date)!.push(entry.reviewer);
    }

    const reviewerDates = new Map<string, string[]>();
    for (const entry of history) {
      if (!reviewerDates.has(entry.reviewer)) reviewerDates.set(entry.reviewer, []);
      reviewerDates.get(entry.reviewer)!.push(entry.date);
    }

    res.json({
      approvers: stats.map((s) => ({
        reviewer: s.reviewer,
        totalReviews: s.totalReviews,
        lastReviewDate: s.lastReviewDate,
        reviewedDates: reviewerDates.get(s.reviewer) ?? [],
      })),
      history: Array.from(dateMap.entries()).map(([date, reviewers]) => ({
        date,
        acknowledged: reviewers.length > 0,
        reviewers,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acks = await getAcknowledgmentsForDate(req.params.date as string);
    res.json({ date: req.params.date, acknowledged: acks.length > 0, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(AcknowledgeRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewer = req.user?.name || req.user?.email || req.body.reviewer;
    const { notes } = req.body;
    const date = todayDate();

    await addAcknowledgment({ date, reviewer, notes });

    try {
      await sendSlackAcknowledgment(reviewer, notes || '', date);
    } catch {
      // Slack notification is non-critical
    }

    const acks = await getAcknowledgmentsForDate(date);
    broadcast('data-updated');
    res.json({ success: true, date, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

router.delete('/:date', validateBody(DeleteAckRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = req.params.date as string;
    const { reviewer } = req.body;

    await deleteAcknowledgment(date, reviewer);

    const acks = await getAcknowledgmentsForDate(date);
    broadcast('data-updated');
    res.json({ success: true, date, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

export default router;
