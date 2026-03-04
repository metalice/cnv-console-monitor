import { Router, Request, Response } from 'express';
import { fetchDefectTypes } from '../../clients/reportportal';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const types = await fetchDefectTypes();
    res.json(types);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch defect types';
    res.status(502).json({ error: message });
  }
});

export default router;
