import { Router, Request, Response } from 'express';
import { getLaunchesSince, getPassRateTrend } from '../../db/store';
import { groupLaunches, buildDailyReport } from '../../analyzer';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const hours = parseInt(_req.query.hours as string) || 24;
  const sinceMs = Date.now() - hours * 60 * 60 * 1000;
  const launches = getLaunchesSince(sinceMs);
  const groups = groupLaunches(launches);

  res.json({
    launches,
    groups,
    summary: {
      total: launches.length,
      passed: launches.filter(l => l.status === 'PASSED').length,
      failed: launches.filter(l => l.status === 'FAILED').length,
      inProgress: launches.filter(l => l.status === 'IN_PROGRESS').length,
    },
  });
});

router.get('/report', (_req: Request, res: Response) => {
  const hours = parseInt(_req.query.hours as string) || 24;
  const report = buildDailyReport(hours);
  res.json(report);
});

router.get('/trends', (req: Request, res: Response) => {
  const launchName = (req.query.name as string) || 'test-kubevirt-console';
  const days = parseInt(req.query.days as string) || 30;
  const trend = getPassRateTrend(launchName, days);
  res.json(trend);
});

export default router;
