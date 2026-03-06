import { Router, Request, Response } from 'express';

const router = Router();

router.get('/user', (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json(req.user);
});

export default router;
