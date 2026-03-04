import { Router, Request, Response } from 'express';
import { getFlakyTests } from '../../db/store';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 14;
  const limit = parseInt(req.query.limit as string) || 20;
  const results = getFlakyTests(days, limit);
  res.json(results);
});

export default router;
