import { Router, Request, Response, NextFunction } from 'express';
import { pollReportPortal } from '../../poller';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../../logger';
import { lockPoll, unlockPoll } from '../../pollLock';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

router.post('/now', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  if (!lockPoll()) {
    res.status(409).json({ error: 'Poll already in progress' });
    return;
  }

  try {
    log.info('Manual poll triggered');
    const result = await pollReportPortal(24);
    broadcast('data-updated');
    res.json({ success: true, launches: result.launches.length });
  } catch (err) {
    next(err);
  } finally {
    unlockPoll();
  }
});

export default router;
