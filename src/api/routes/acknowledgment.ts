import { Router, Request, Response } from 'express';
import { addAcknowledgment, getAcknowledgmentsForDate } from '../../db/store';
import { sendSlackAcknowledgment } from '../../notifiers/slack';

const router = Router();

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/today', (_req: Request, res: Response) => {
  const date = todayDate();
  const acks = getAcknowledgmentsForDate(date);
  res.json({
    date,
    acknowledged: acks.length > 0,
    acknowledgments: acks,
  });
});

router.get('/:date', (req: Request, res: Response) => {
  const acks = getAcknowledgmentsForDate(req.params.date as string);
  res.json({
    date: req.params.date,
    acknowledged: acks.length > 0,
    acknowledgments: acks,
  });
});

router.post('/', async (req: Request, res: Response) => {
  const { reviewer, notes } = req.body;

  if (!reviewer) {
    res.status(400).json({ error: 'reviewer is required' });
    return;
  }

  const date = todayDate();

  addAcknowledgment({ date, reviewer, notes });

  try {
    await sendSlackAcknowledgment(reviewer, notes || '', date);
  } catch {
    // non-critical
  }

  const acks = getAcknowledgmentsForDate(date);
  res.json({ success: true, date, acknowledgments: acks });
});

export default router;
