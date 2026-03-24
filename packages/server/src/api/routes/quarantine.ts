import { type NextFunction, type Request, type Response, Router } from 'express';

import { CreateQuarantineSchema, ResolveQuarantineSchema } from '@cnv-monitor/shared';

import {
  addQuarantineLog,
  getQuarantineById,
  getQuarantineHistory,
  getQuarantineLogs,
  getQuarantines,
  getQuarantineStats,
  updateQuarantineStatus,
} from '../../db/store';
const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = (req.query.status as string) || undefined;
    const component = (req.query.component as string) || undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await getQuarantines({ component, limit, offset, status });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getQuarantineStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await getQuarantineHistory(days);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await getQuarantineById(req.params.id as string);
    if (!q) {
      res.status(404).json({ error: 'Quarantine not found' });
      return;
    }
    const logs = await getQuarantineLogs(q.id);
    // eslint-disable-next-line @typescript-eslint/no-misused-spread -- TypeORM entity spread is safe here for JSON serialization
    res.json({ ...q, logs });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateQuarantineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ details: parsed.error.issues, error: 'Validation failed' });
      return;
    }

    const { quarantineTest } = await import('../../services/QuarantineService');
    const result = await quarantineTest({
      ...parsed.data,
      userEmail: req.user?.email || 'unknown',
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ResolveQuarantineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ details: parsed.error.issues, error: 'Validation failed' });
      return;
    }

    const { unquarantineTest } = await import('../../services/QuarantineService');
    const result = await unquarantineTest(
      req.params.id as string,
      req.user?.email || 'unknown',
      parsed.data,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await getQuarantineById(req.params.id as string);
    if (!q) {
      res.status(404).json({ error: 'Quarantine not found' });
      return;
    }
    if (q.status !== 'proposed') {
      res.status(400).json({ error: 'Only proposed quarantines can be approved' });
      return;
    }

    await updateQuarantineStatus(q.id, 'active');
    await addQuarantineLog(q.id, 'approved', req.user?.email || 'unknown');
    res.json({ status: 'active', success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await getQuarantineById(req.params.id as string);
    if (!q) {
      res.status(404).json({ error: 'Quarantine not found' });
      return;
    }
    if (q.status !== 'proposed') {
      res.status(400).json({ error: 'Only proposed quarantines can be rejected' });
      return;
    }

    await updateQuarantineStatus(q.id, 'resolved', {
      resolved_at: new Date(),
      resolved_by: req.user?.email || 'unknown',
    });
    await addQuarantineLog(q.id, 'rejected', req.user?.email || 'unknown', {
      reason: ((req.body as Record<string, unknown>).reason as string) || '',
    });
    res.json({ status: 'resolved', success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
