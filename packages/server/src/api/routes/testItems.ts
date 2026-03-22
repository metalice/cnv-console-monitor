import { Router, Request, Response, NextFunction } from 'express';
import { getFailedTestItems, getFailedTestItemsForLaunches, getAllTestItems, getUntriagedItems, getTestItemHistory, getTestFailureStreak } from '../../db/store';
import { fetchTestItemLogs } from '../../clients/reportportal';
import { parseIntParam, clampInt } from '../middleware/validate';
import { refreshLaunchTestItems, fetchAllItemsForLaunch } from '../../poller';

const router = Router();

router.get('/launch/:launchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    const status = req.query.status as string | undefined;
    let items = status === 'FAILED'
      ? await getFailedTestItems(launchId)
      : await getAllTestItems(launchId);

    if (items.length === 0) {
      if (status === 'FAILED') {
        await refreshLaunchTestItems(launchId);
        items = await getFailedTestItems(launchId);
      } else {
        await fetchAllItemsForLaunch(launchId);
        items = await getAllTestItems(launchId);
      }
    }

    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/launches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = (req.query.ids as string || '')
      .split(',')
      .map(idStr => parseInt(idStr.trim()))
      .filter(parsed => !isNaN(parsed));
    if (ids.length === 0) {
      res.status(400).json({ error: 'ids query parameter required (comma-separated launch rp_ids)' });
      return;
    }
    const items = await getFailedTestItemsForLaunches(ids);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/untriaged', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;
    const until = req.query.until ? parseInt(req.query.until as string) : undefined;
    const hours = clampInt(req.query.hours as string, 24, 1, 720);
    const component = (req.query.component as string) || undefined;
    const sinceMs = since ?? (Date.now() - hours * 60 * 60 * 1000);
    const items = await getUntriagedItems(sinceMs, until, component);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/history/:uniqueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uniqueId = req.params.uniqueId as string;
    const limit = clampInt(req.query.limit as string, 20, 1, 100);
    const history = await getTestItemHistory(uniqueId, limit);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.get('/streaks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = (req.query.uniqueIds as string) || '';
    const uniqueIds = raw.split(',').map(idStr => idStr.trim()).filter(Boolean).slice(0, 50);
    if (uniqueIds.length === 0) {
      res.json({});
      return;
    }

    const entries = await Promise.all(
      uniqueIds.map(async (id) => [id, await getTestFailureStreak(id, 8)] as const),
    );
    const result: Record<string, Awaited<ReturnType<typeof getTestFailureStreak>>> = {};
    for (const [id, info] of entries) {
      result[id] = info;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:itemId/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemId = parseIntParam(req.params.itemId, 'itemId', res);
    if (itemId === null) return;

    const level = (req.query.level as string) || 'ERROR';
    const logs = await fetchTestItemLogs(itemId, { level, pageSize: 100 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

export default router;
