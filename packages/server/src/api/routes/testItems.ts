import { Router, Request, Response } from 'express';
import { getFailedTestItems, getAllTestItems, getUntriagedItems, getTestItemHistory } from '../../db/store';
import { fetchTestItemLogs } from '../../clients/reportportal';

const router = Router();

router.get('/launch/:launchId', (req: Request, res: Response) => {
  const launchId = parseInt(req.params.launchId as string);
  const status = req.query.status as string | undefined;

  const items = status === 'FAILED'
    ? getFailedTestItems(launchId)
    : getAllTestItems(launchId);

  res.json(items);
});

router.get('/untriaged', (_req: Request, res: Response) => {
  const hours = parseInt(_req.query.hours as string) || 24;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;
  const items = getUntriagedItems(sinceMs);
  res.json(items);
});

router.get('/history/:uniqueId', (req: Request, res: Response) => {
  const uniqueId = req.params.uniqueId as string;
  const limit = parseInt(req.query.limit as string) || 20;
  const history = getTestItemHistory(uniqueId, limit);
  res.json(history);
});

router.get('/:itemId/logs', async (req: Request, res: Response) => {
  const itemId = parseInt(req.params.itemId as string);
  const level = (req.query.level as string) || 'ERROR';

  try {
    const logs = await fetchTestItemLogs(itemId, { level, pageSize: 100 });
    res.json(logs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch logs';
    res.status(502).json({ error: message });
  }
});

export default router;
