import { Router, Request, Response, NextFunction } from 'express';
import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../../clients/reportportal';
import { parseIntParam } from '../middleware/validate';

const router = Router();

router.post('/:launchId/auto', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerAutoAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'auto' });
  } catch (err) {
    next(err);
  }
});

router.post('/:launchId/pattern', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerPatternAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'pattern' });
  } catch (err) {
    next(err);
  }
});

router.post('/:launchId/unique', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    await triggerUniqueErrorAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'unique-error' });
  } catch (err) {
    next(err);
  }
});

export default router;
