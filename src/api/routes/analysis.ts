import { Router, Request, Response } from 'express';
import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../../clients/reportportal';

const router = Router();

router.post('/:launchId/auto', async (req: Request, res: Response) => {
  const launchId = parseInt(req.params.launchId as string);

  try {
    await triggerAutoAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'auto' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to trigger auto-analysis';
    res.status(502).json({ error: message });
  }
});

router.post('/:launchId/pattern', async (req: Request, res: Response) => {
  const launchId = parseInt(req.params.launchId as string);

  try {
    await triggerPatternAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'pattern' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to trigger pattern analysis';
    res.status(502).json({ error: message });
  }
});

router.post('/:launchId/unique', async (req: Request, res: Response) => {
  const launchId = parseInt(req.params.launchId as string);

  try {
    await triggerUniqueErrorAnalysis(launchId);
    res.json({ success: true, launchId, analysis: 'unique-error' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to trigger unique error analysis';
    res.status(502).json({ error: message });
  }
});

export default router;
