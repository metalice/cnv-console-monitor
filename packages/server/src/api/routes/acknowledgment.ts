import { type NextFunction, type Request, type Response, Router } from 'express';

import {
  type AcknowledgeRequest,
  AcknowledgeRequestSchema,
  type DeleteAckRequest,
  DeleteAckRequestSchema,
} from '@cnv-monitor/shared';

import {
  addAcknowledgment,
  deleteAcknowledgment,
  getAckHistory,
  getAcknowledgmentsForDate,
  getApproverStats,
} from '../../db/store';
import { sendSlackAcknowledgment } from '../../notifiers/slack';
import { broadcast } from '../../ws';
import { validateBody } from '../middleware/validate';

const router = Router();

const todayDate = (): string => new Date().toISOString().split('T')[0];

router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = todayDate();
    const component = (req.query.component as string) || undefined;
    const acks = await getAcknowledgmentsForDate(date, component);
    res.json({ acknowledged: acks.length > 0, acknowledgments: acks, date });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt(req.query.days as string) || 30));
    const stats = await getApproverStats(days);
    const history = await getAckHistory(days);

    const dateMap = new Map<string, { reviewers: string[]; firstAckAt: string | null }>();
    for (const entry of history) {
      if (!dateMap.has(entry.date)) {
        dateMap.set(entry.date, { firstAckAt: null, reviewers: [] });
      }
      const day = dateMap.get(entry.date);
      if (!day) continue;
      day.reviewers.push(entry.reviewer);
      if (entry.acknowledged_at && (!day.firstAckAt || entry.acknowledged_at < day.firstAckAt)) {
        day.firstAckAt = entry.acknowledged_at;
      }
    }

    const reviewerDates = new Map<string, string[]>();
    for (const entry of history) {
      if (!reviewerDates.has(entry.reviewer)) {
        reviewerDates.set(entry.reviewer, []);
      }
      reviewerDates.get(entry.reviewer)?.push(entry.date);
    }

    res.json({
      approvers: stats.map(stat => ({
        lastReviewDate: stat.lastReviewDate,
        reviewedDates: reviewerDates.get(stat.reviewer) ?? [],
        reviewer: stat.reviewer,
        totalReviews: stat.totalReviews,
      })),
      history: Array.from(dateMap.entries()).map(([date, { firstAckAt, reviewers }]) => ({
        acknowledged: reviewers.length > 0,
        date,
        firstAckAt,
        reviewers,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:date', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const component = (req.query.component as string) || undefined;
    const acks = await getAcknowledgmentsForDate(req.params.date as string, component);
    res.json({ acknowledged: acks.length > 0, acknowledgments: acks, date: req.params.date });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  validateBody(AcknowledgeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as AcknowledgeRequest;
      const reviewer = req.user?.name || req.user?.email || body.reviewer;
      const { notes, testNotes } = body;
      const date = todayDate();

      let combinedNotes = notes || '';
      if (testNotes && testNotes.length > 0) {
        const testNotesText = testNotes
          .map(testNote => {
            const jira = testNote.jiraKey ? ` [${testNote.jiraKey}]` : '';
            return `• ${testNote.testName}${jira}: ${testNote.note}`;
          })
          .join('\n');
        combinedNotes = combinedNotes ? `${combinedNotes}\n\n${testNotesText}` : testNotesText;
      }

      const component = body.component;
      await addAcknowledgment({ component, date, notes: combinedNotes || undefined, reviewer });

      try {
        const { getAllSubscriptions } = await import('../../db/store');
        const subs = await getAllSubscriptions();
        for (const sub of subs) {
          if (sub.enabled && sub.slackWebhook) {
            // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
            await sendSlackAcknowledgment(reviewer, combinedNotes || '', date, sub.slackWebhook);
          }
        }
      } catch {
        // Slack notification is non-critical
      }

      const acks = await getAcknowledgmentsForDate(date);
      broadcast('data-updated');
      res.json({ acknowledgments: acks, date, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:date',
  validateBody(DeleteAckRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const date = req.params.date as string;
      const body = req.body as DeleteAckRequest;
      const { reviewer } = body;

      if (
        reviewer !== req.user?.name &&
        reviewer !== req.user?.email &&
        req.user?.role !== 'admin'
      ) {
        res.status(403).json({ error: 'You can only remove your own acknowledgment' });
        return;
      }

      const component = (req.body as Record<string, unknown>).component as string | undefined;
      await deleteAcknowledgment(date, reviewer, component);

      const acks = await getAcknowledgmentsForDate(date, component);
      broadcast('data-updated');
      res.json({ acknowledgments: acks, date, success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
