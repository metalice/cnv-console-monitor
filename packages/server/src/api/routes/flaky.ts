import { Router, Request, Response, NextFunction } from 'express';
import { getFlakyTests } from '../../db/store';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const limit = parseInt(req.query.limit as string) || 20;
    const results = await getFlakyTests(days, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
