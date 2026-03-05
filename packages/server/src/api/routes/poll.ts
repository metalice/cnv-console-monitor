import { Router, Request, Response, NextFunction } from 'express';
import { pollReportPortal } from '../../poller';
import { broadcast } from '../../ws';
import { logger } from '../../logger';

const log = logger.child({ module: 'PollAPI' });
const router = Router();

let isPolling = false;

router.post('/now', async (_req: Request, res: Response, next: NextFunction) => {
  if (isPolling) {
    res.status(409).json({ error: 'Poll already in progress' });
    return;
  }

  try {
    isPolling = true;
    log.info('Manual poll triggered');
    const result = await pollReportPortal(24);
    broadcast('data-updated');
    isPolling = false;
    res.json({ success: true, launches: result.launches.length });
  } catch (err) {
    isPolling = false;
    next(err);
  }
});

export default router;
