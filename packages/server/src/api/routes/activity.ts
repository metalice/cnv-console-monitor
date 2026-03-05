import { Router, Request, Response, NextFunction } from 'express';
import { getActivityLog } from '../../db/store';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const entries = await getActivityLog(limit, offset);
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

export default router;
