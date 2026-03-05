import { Router, Request, Response, NextFunction } from 'express';
import { getFailedTestItems, getFailedTestItemsForLaunches, getAllTestItems, getUntriagedItems, getTestItemHistory } from '../../db/store';
import { fetchTestItemLogs } from '../../clients/reportportal';
import { parseIntParam } from '../middleware/validate';

const router = Router();

router.get('/launch/:launchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchId = parseIntParam(req.params.launchId, 'launchId', res);
    if (launchId === null) return;

    const status = req.query.status as string | undefined;
    const items = status === 'FAILED'
      ? await getFailedTestItems(launchId)
      : await getAllTestItems(launchId);

    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/launches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = (req.query.ids as string || '')
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n));
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
    const hours = parseInt(req.query.hours as string) || 24;
    const sinceMs = since ?? (Date.now() - hours * 60 * 60 * 1000);
    const items = await getUntriagedItems(sinceMs, until);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/history/:uniqueId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uniqueId = req.params.uniqueId as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getTestItemHistory(uniqueId, limit);
    res.json(history);
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
