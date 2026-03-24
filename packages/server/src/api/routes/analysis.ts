import { type NextFunction, type Request, type Response, Router } from 'express';

import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../../clients/reportportal';
import { logger } from '../../logger';
import { refreshLaunchTestItems } from '../../poller';
import { broadcast } from '../../ws';
import { requireAdmin } from '../middleware/auth';
import { parseIntParam } from '../middleware/validate';

const log = logger.child({ module: 'Analysis' });

const REFRESH_DELAY_MS = 10_000;

const scheduleRefresh = (launchId: number, type: string): void => {
  setTimeout(async () => {
    try {
      log.info({ launchId, type }, 'Refreshing test items after analysis');
      await refreshLaunchTestItems(launchId);
      broadcast('data-updated');
      log.info({ launchId, type }, 'Test items refreshed');
    } catch (err) {
      log.warn({ err, launchId, type }, 'Failed to refresh test items after analysis');
    }
  }, REFRESH_DELAY_MS);
};

const router = Router();

router.post(
  '/:launchId/auto',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const launchId = parseIntParam(req.params.launchId, 'launchId', res);
      if (launchId === null) {
        return;
      }

      await triggerAutoAnalysis(launchId);
      scheduleRefresh(launchId, 'auto');
      res.json({ analysis: 'auto', launchId, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:launchId/pattern',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const launchId = parseIntParam(req.params.launchId, 'launchId', res);
      if (launchId === null) {
        return;
      }

      await triggerPatternAnalysis(launchId);
      scheduleRefresh(launchId, 'pattern');
      res.json({ analysis: 'pattern', launchId, success: true });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:launchId/unique',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const launchId = parseIntParam(req.params.launchId, 'launchId', res);
      if (launchId === null) {
        return;
      }

      await triggerUniqueErrorAnalysis(launchId);
      scheduleRefresh(launchId, 'unique');
      res.json({ analysis: 'unique-error', launchId, success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
