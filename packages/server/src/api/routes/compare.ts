import { Router, Request, Response, NextFunction } from 'express';
import { getLaunchByRpId, getAllTestItems } from '../../db/store';
import { AppDataSource } from '../../db/data-source';
import { parseIntParam } from '../middleware/validate';

const router = Router();

router.get('/launches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const rows = await AppDataSource.query(`
      SELECT l.rp_id, l.name, l.number, l.status, l.cnv_version, l.tier,
             l.cluster_name, l.start_time, l.total, l.passed, l.failed, l.component
      FROM launches l
      WHERE l.start_time >= $1
      ORDER BY l.name ASC, l.start_time DESC
    `, [sinceMs]);

    const grouped = new Map<string, Array<Record<string, unknown>>>();
    for (const row of rows) {
      const name = row.name as string;
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(row);
    }

    const result = Array.from(grouped.entries()).map(([name, runs]) => ({
      name,
      runCount: runs.length,
      latestStatus: runs[0].status,
      cnvVersion: runs[0].cnv_version,
      tier: runs[0].tier,
      component: runs[0].component,
      runs: runs.map((launch) => ({
        rp_id: Number(launch.rp_id),
        number: Number(launch.number),
        status: launch.status as string,
        start_time: Number(launch.start_time),
        total: Number(launch.total),
        passed: Number(launch.passed),
        failed: Number(launch.failed),
        cluster_name: launch.cluster_name as string | null,
      })),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchAId = parseIntParam(req.query.launchA as string, 'launchA', res);
    if (launchAId === null) return;
    const launchBId = parseIntParam(req.query.launchB as string, 'launchB', res);
    if (launchBId === null) return;

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

    const mapA = new Map(itemsA.filter(item => item.unique_id).map(item => [item.unique_id!, item]));
    const mapB = new Map(itemsB.filter(item => item.unique_id).map(item => [item.unique_id!, item]));

    const regressions = [];
    const fixes = [];
    const persistent = [];

    for (const [uid, itemB] of mapB) {
      const itemA = mapA.get(uid);
      if (!itemA) continue;
      if (itemA.status === 'PASSED' && itemB.status === 'FAILED') {
        regressions.push(itemB);
      } else if (itemA.status === 'FAILED' && itemB.status === 'PASSED') {
        fixes.push(itemA);
      } else if (itemA.status === 'FAILED' && itemB.status === 'FAILED') {
        persistent.push(itemB);
      }
    }

    const pick = (launch: typeof launchA) => ({
      rp_id: launch!.rp_id,
      name: launch!.name,
      cnv_version: launch!.cnv_version ?? null,
      ocp_version: launch!.ocp_version ?? null,
      tier: launch!.tier ?? null,
      cluster_name: launch!.cluster_name ?? null,
      start_time: launch!.start_time,
      status: launch!.status,
      total: launch!.total,
      passed: launch!.passed,
      failed: launch!.failed,
    });

    res.json({
      launchA: pick(launchA),
      launchB: pick(launchB),
      regressions,
      fixes,
      persistent,
      summary: {
        regressions: regressions.length,
        fixes: fixes.length,
        persistent: persistent.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
