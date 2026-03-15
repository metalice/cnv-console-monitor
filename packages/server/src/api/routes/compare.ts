import { Router, Request, Response, NextFunction } from 'express';
import { getLaunchByRpId, getAllTestItems } from '../../db/store';
import { parseIntParam } from '../middleware/validate';

const router = Router();

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

    const mapA = new Map(itemsA.filter(i => i.unique_id).map(i => [i.unique_id!, i]));
    const mapB = new Map(itemsB.filter(i => i.unique_id).map(i => [i.unique_id!, i]));

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

    const pick = (l: typeof launchA) => ({
      rp_id: l!.rp_id,
      name: l!.name,
      cnv_version: l!.cnv_version ?? null,
      ocp_version: l!.ocp_version ?? null,
      tier: l!.tier ?? null,
      cluster_name: l!.cluster_name ?? null,
      start_time: l!.start_time,
      status: l!.status,
      total: l!.total,
      passed: l!.passed,
      failed: l!.failed,
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
