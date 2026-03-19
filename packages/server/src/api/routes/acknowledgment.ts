import { Router, Request, Response, NextFunction } from 'express';
import { AcknowledgeRequestSchema, DeleteAckRequestSchema } from '@cnv-monitor/shared';
import { addAcknowledgment, deleteAcknowledgment, getAcknowledgmentsForDate, getAckHistory, getApproverStats } from '../../db/store';
import { sendSlackAcknowledgment } from '../../notifiers/slack';
import { validateBody } from '../middleware/validate';
import { broadcast } from '../../ws';

const router = Router();

const todayDate = (): string => {
  return new Date().toISOString().split('T')[0];
}

router.get('/today', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = todayDate();
    const component = (req.query.component as string) || undefined;
    const acks = await getAcknowledgmentsForDate(date, component);
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

    const dateMap = new Map<string, { reviewers: string[]; firstAckAt: string | null }>();
    for (const entry of history) {
      if (!dateMap.has(entry.date)) dateMap.set(entry.date, { reviewers: [], firstAckAt: null });
      const day = dateMap.get(entry.date)!;
      day.reviewers.push(entry.reviewer);
      if (entry.acknowledged_at && (!day.firstAckAt || entry.acknowledged_at < day.firstAckAt)) {
        day.firstAckAt = entry.acknowledged_at;
      }
    }

    const reviewerDates = new Map<string, string[]>();
    for (const entry of history) {
      if (!reviewerDates.has(entry.reviewer)) reviewerDates.set(entry.reviewer, []);
      reviewerDates.get(entry.reviewer)!.push(entry.date);
    }

    res.json({
      approvers: stats.map((stat) => ({
        reviewer: stat.reviewer,
        totalReviews: stat.totalReviews,
        lastReviewDate: stat.lastReviewDate,
        reviewedDates: reviewerDates.get(stat.reviewer) ?? [],
      })),
      history: Array.from(dateMap.entries()).map(([date, { reviewers, firstAckAt }]) => ({
        date,
        acknowledged: reviewers.length > 0,
        reviewers,
        firstAckAt,
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
    res.json({ date: req.params.date, acknowledged: acks.length > 0, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

router.post('/', validateBody(AcknowledgeRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewer = req.user?.name || req.user?.email || req.body.reviewer;
    const { notes, testNotes } = req.body;
    const date = todayDate();

    let combinedNotes = notes || '';
    if (testNotes && testNotes.length > 0) {
      const testNotesText = testNotes
        .map((tn: { testName: string; jiraKey?: string; note: string }) => {
          const jira = tn.jiraKey ? ` [${tn.jiraKey}]` : '';
          return `• ${tn.testName}${jira}: ${tn.note}`;
        })
        .join('\n');
      combinedNotes = combinedNotes
        ? `${combinedNotes}\n\n${testNotesText}`
        : testNotesText;
    }

    const component = req.body.component as string | undefined;
    await addAcknowledgment({ date, reviewer, notes: combinedNotes || undefined, component });

    try {
      const { getAllSubscriptions } = await import('../../db/store');
      const subs = await getAllSubscriptions();
      for (const sub of subs) {
        if (sub.enabled && sub.slackWebhook) {
          await sendSlackAcknowledgment(reviewer, combinedNotes || '', date, sub.slackWebhook);
        }
      }
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

    if (reviewer !== req.user?.name && reviewer !== req.user?.email && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'You can only remove your own acknowledgment' });
      return;
    }

    const component = req.body.component as string | undefined;
    await deleteAcknowledgment(date, reviewer, component);

    const acks = await getAcknowledgmentsForDate(date, component);
    broadcast('data-updated');
    res.json({ success: true, date, acknowledgments: acks });
  } catch (err) {
    next(err);
  }
});

export default router;
