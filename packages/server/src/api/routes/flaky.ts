import { type NextFunction, type Request, type Response, Router } from 'express';

import { getFlakyTests } from '../../db/store';
import { clampInt } from '../middleware/validate';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = clampInt(req.query.days as string, 14, 1, 365);
    const limit = clampInt(req.query.limit as string, 20, 1, 100);
    const component = (req.query.component as string) || undefined;
    const results = await getFlakyTests(days, limit, component);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
