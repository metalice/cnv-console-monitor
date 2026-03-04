import { Router, Request, Response } from 'express';
import { getActivityLog } from '../../db/store';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  const entries = getActivityLog(limit, offset);
  res.json(entries);
});

export default router;
