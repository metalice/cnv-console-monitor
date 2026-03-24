import { type NextFunction, type Request, type Response, Router } from 'express';

import { fetchDefectTypes } from '../../clients/reportportal';

const router = Router();

router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await fetchDefectTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
});

export default router;
