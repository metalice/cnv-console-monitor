import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';
import { getAllTestItems, getLaunchByRpId } from '../../db/store';
import { parseIntParam } from '../middleware/validate';

const router = Router();

router.get('/launches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const rows = await AppDataSource.query(
      `
      SELECT l.rp_id, l.name, l.number, l.status, l.cnv_version, l.tier,
             l.cluster_name, l.start_time, l.total, l.passed, l.failed, l.component
      FROM launches l
      WHERE l.start_time >= $1
      ORDER BY l.name ASC, l.start_time DESC
    `,
      [sinceMs],
    );

    const grouped = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
      const name = row.name as string;
      if (!grouped.has(name)) {
        grouped.set(name, []);
      }
      grouped.get(name)!.push(row);
    }

    const result = Array.from(grouped.entries()).map(([name, runs]) => ({
      cnvVersion: runs[0].cnv_version,
      component: runs[0].component,
      latestStatus: runs[0].status,
      name,
      runCount: runs.length,
      runs: runs.map(launch => ({
        cluster_name: launch.cluster_name as string | null,
        failed: Number(launch.failed),
        number: Number(launch.number),
        passed: Number(launch.passed),
        rp_id: Number(launch.rp_id),
        start_time: Number(launch.start_time),
        status: launch.status as string,
        total: Number(launch.total),
      })),
      tier: runs[0].tier,
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchAId = parseIntParam(req.query.launchA as string, 'launchA', res);
    if (launchAId === null) {
      return;
    }
    const launchBId = parseIntParam(req.query.launchB as string, 'launchB', res);
    if (launchBId === null) {
      return;
    }

    const [launchA, launchB, itemsA, itemsB] = await Promise.all([
      getLaunchByRpId(launchAId),
      getLaunchByRpId(launchBId),
      getAllTestItems(launchAId),
      getAllTestItems(launchBId),
    ]);

    if (!launchA) {
      res.status(404).json({ error: `Launch ${launchAId} not found` });
      return;
    }
    if (!launchB) {
      res.status(404).json({ error: `Launch ${launchBId} not found` });
      return;
    }

    const mapA = new Map(
      itemsA.filter(item => item.unique_id).map(item => [item.unique_id!, item]),
    );
    const mapB = new Map(
      itemsB.filter(item => item.unique_id).map(item => [item.unique_id!, item]),
    );

    const regressions = [];
    const fixes = [];
    const persistent = [];

    for (const [uid, itemB] of mapB) {
      const itemA = mapA.get(uid);
      if (!itemA) {
        continue;
      }
      if (itemA.status === 'PASSED' && itemB.status === 'FAILED') {
        regressions.push(itemB);
      } else if (itemA.status === 'FAILED' && itemB.status === 'PASSED') {
        fixes.push(itemA);
      } else if (itemA.status === 'FAILED' && itemB.status === 'FAILED') {
        persistent.push(itemB);
      }
    }

    const pick = (launch: typeof launchA) => ({
      cluster_name: launch.cluster_name ?? null,
      cnv_version: launch.cnv_version ?? null,
      failed: launch.failed,
      name: launch.name,
      ocp_version: launch.ocp_version ?? null,
      passed: launch.passed,
      rp_id: launch.rp_id,
      start_time: launch.start_time,
      status: launch.status,
      tier: launch.tier ?? null,
      total: launch.total,
    });

    res.json({
      fixes,
      launchA: pick(launchA),
      launchB: pick(launchB),
      persistent,
      regressions,
      summary: {
        fixes: fixes.length,
        persistent: persistent.length,
        regressions: regressions.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
