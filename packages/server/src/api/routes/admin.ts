import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from '../../config';
import { getAllUsers, setUserRole, hasAnyAdmin } from '../../db/store';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/bootstrap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret } = req.body as { secret: string };
    if (!config.admin.secret) {
      res.status(400).json({ error: 'ADMIN_SECRET not configured on the server' });
      return;
    }
    const expected = config.admin.secret;
    const secretsMatch =
      secret.length === expected.length &&
      timingSafeEqual(Buffer.from(secret), Buffer.from(expected));
    if (!secretsMatch) {
      res.status(403).json({ error: 'Invalid admin secret' });
      return;
    }

    const email = req.user?.email;
    if (!email) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const updated = await setUserRole(email, 'admin');
    res.json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
});

router.get('/users', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.put('/users/:email/role', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = req.params.email as string;
    const { role } = req.body as { role: string };

    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ error: 'Role must be "admin" or "user"' });
      return;
    }

    const updated = await setUserRole(email, role);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get('/has-admin', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const exists = await hasAnyAdmin();
    res.json({ hasAdmin: exists });
  } catch (err) {
    next(err);
  }
});

export default router;
