import { Router, Request, Response, NextFunction } from 'express';
import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../../clients/reportportal';
import { parseIntParam } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import { refreshLaunchTestItems } from '../../poller';
import { broadcast } from '../../ws';
import { logger } from '../../logger';

const log = logger.child({ module: 'Analysis' });

const REFRESH_DELAY_MS = 10_000;

function scheduleRefresh(launchId: number, type: string): void {
  setTimeout(async () => {
    try {
      log.info({ launchId, type }, 'Refreshing test items after analysis');
      await refreshLaunchTestItems(launchId);
      broadcast('data-updated');
      log.info({ launchId, type }, 'Test items refreshed');
    } catch (err) {
      log.warn({ launchId, type, err }, 'Failed to refresh test items after analysis');
    }
  }, REFRESH_DELAY_MS);
}

const router = Router();

router.post('/:launchId/auto', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerAutoAnalysis(launchId);
    scheduleRefresh(launchId, 'auto');
    res.json({ success: true, launchId, analysis: 'auto' });
  } catch (err) {
    next(err);
  }
});

router.post('/:launchId/pattern', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerPatternAnalysis(launchId);
    scheduleRefresh(launchId, 'pattern');
    res.json({ success: true, launchId, analysis: 'pattern' });
  } catch (err) {
    next(err);
  }
});

router.post('/:launchId/unique', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerUniqueErrorAnalysis(launchId);
    scheduleRefresh(launchId, 'unique');
    res.json({ success: true, launchId, analysis: 'unique-error' });
  } catch (err) {
    next(err);
  }
});

export default router;
