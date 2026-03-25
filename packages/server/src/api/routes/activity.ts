import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';
import { TriageLog } from '../../db/entities/TriageLog';
import { getActivityLog } from '../../db/store';
import { requireAdmin } from '../middleware/auth';
import { clampInt } from '../middleware/validate';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = clampInt(req.query.limit as string, 50, 1, 200);
    const offset = clampInt(req.query.offset as string, 0, 0, 10000);
    const result = await getActivityLog(limit, offset, {
      action: (req.query.action as string) || undefined,
      component: (req.query.component as string) || undefined,
      search: (req.query.search as string) || undefined,
      since: (req.query.since as string) || undefined,
      until: (req.query.until as string) || undefined,
      user: (req.query.user as string) || undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/meta', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [users, components] = (await Promise.all([
      AppDataSource.query(`
        SELECT DISTINCT performed_by FROM triage_log WHERE performed_by IS NOT NULL
        UNION
        SELECT DISTINCT reviewer FROM acknowledgments WHERE reviewer IS NOT NULL
        ORDER BY performed_by
      `),
      AppDataSource.query(`
        SELECT DISTINCT component FROM triage_log WHERE component IS NOT NULL
        UNION
        SELECT DISTINCT component FROM acknowledgments WHERE component IS NOT NULL
        ORDER BY component
      `),
    ])) as [Record<string, string>[], Record<string, string>[]];
    res.json({
      components: components.map(row => row.component).filter(Boolean),
      users: users.map(row => row.performed_by || row.reviewer).filter(Boolean),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: unknown[] = [];
    let idx = 1;
    const nextParam = () => `$${idx++}`;

    const triageWhere: string[] = ['1=1'];
    const ackWhere: string[] = ['1=1'];

    const component = (req.query.component as string) || undefined;
    const since = (req.query.since as string) || undefined;
    const until = (req.query.until as string) || undefined;

    if (component) {
      const componentParam = nextParam();
      triageWhere.push(`tl.component = ${componentParam}`);
      ackWhere.push(`a.component = ${componentParam}`);
      params.push(component);
    }
    if (since) {
      const sinceParam = nextParam();
      triageWhere.push(`tl.performed_at >= ${sinceParam}::timestamptz`);
      ackWhere.push(`a.acknowledged_at >= ${sinceParam}::timestamptz`);
      params.push(since);
    }
    if (until) {
      const untilParam = nextParam();
      triageWhere.push(`tl.performed_at <= ${untilParam}::timestamptz`);
      ackWhere.push(`a.acknowledged_at <= ${untilParam}::timestamptz`);
      params.push(until);
    }

    const [actionRows, componentRows, userRows, latestRow] = (await Promise.all([
      AppDataSource.query(
        `
        SELECT action, COUNT(*)::int as count FROM (
          (SELECT tl.action FROM triage_log tl WHERE ${triageWhere.join(' AND ')})
          UNION ALL
          (SELECT 'acknowledge' as action FROM acknowledgments a WHERE ${ackWhere.join(' AND ')})
        ) combined GROUP BY action ORDER BY count DESC
      `,
        params,
      ),
      AppDataSource.query(
        `
        SELECT component, COUNT(*)::int as count FROM (
          (SELECT tl.component FROM triage_log tl WHERE ${triageWhere.join(' AND ')} AND tl.component IS NOT NULL)
          UNION ALL
          (SELECT a.component FROM acknowledgments a WHERE ${ackWhere.join(' AND ')} AND a.component IS NOT NULL)
        ) combined GROUP BY component ORDER BY count DESC LIMIT 10
      `,
        params,
      ),
      AppDataSource.query(
        `
        SELECT performed_by, COUNT(*)::int as count FROM (
          (SELECT tl.performed_by FROM triage_log tl WHERE ${triageWhere.join(' AND ')} AND tl.performed_by IS NOT NULL)
          UNION ALL
          (SELECT a.reviewer as performed_by FROM acknowledgments a WHERE ${ackWhere.join(' AND ')})
        ) combined GROUP BY performed_by ORDER BY count DESC LIMIT 5
      `,
        params,
      ),
      AppDataSource.query(`
        SELECT MAX(ts) as latest FROM (
          (SELECT tl.performed_at as ts FROM triage_log tl)
          UNION ALL
          (SELECT a.acknowledged_at as ts FROM acknowledgments a)
        ) combined
      `),
    ])) as [
      Record<string, unknown>[],
      Record<string, unknown>[],
      Record<string, unknown>[],
      Record<string, unknown>[],
    ];

    const byAction: Record<string, number> = {};
    let total = 0;
    for (const row of actionRows) {
      byAction[row.action as string] = row.count as number;
      total += Number(row.count);
    }

    res.json({
      byAction,
      byComponent: componentRows.map(row => [row.component, row.count]),
      byUser: userRows.map(row => [row.performed_by, row.count]),
      latestActivityAt: latestRow[0]?.latest
        ? new Date(latestRow[0].latest as string).getTime()
        : null,
      total,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/related/:testItemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testItemId = parseInt(req.params.testItemId as string, 10);
    if (isNaN(testItemId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const rows: Record<string, unknown>[] = await AppDataSource.query(
      `
      SELECT tl.id, tl.action, tl.old_value, tl.new_value, tl.performed_by, tl.performed_at, tl.component
      FROM triage_log tl
      WHERE tl.test_item_rp_id = $1
      ORDER BY tl.performed_at DESC
      LIMIT 20
    `,
      [testItemId],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/pin', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const note = ((req.body as Record<string, unknown>).note as string) || null;
    await AppDataSource.getRepository(TriageLog).update({ id }, { pin_note: note, pinned: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unpin', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    await AppDataSource.getRepository(TriageLog).update({ id }, { pin_note: null, pinned: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/pinned', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows: Record<string, unknown>[] = await AppDataSource.query(`
      SELECT tl.id, tl.test_item_rp_id, ti.launch_rp_id, tl.action, tl.old_value, tl.new_value,
             tl.performed_by, tl.performed_at, ti.name as test_name, tl.component,
             NULL as notes, tl.pinned, tl.pin_note
      FROM triage_log tl
      LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
      WHERE tl.pinned = TRUE
      ORDER BY tl.performed_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
