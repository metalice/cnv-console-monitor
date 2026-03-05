import { Router, Request, Response, NextFunction } from 'express';
import { getLaunchesSince, getPassRateTrend } from '../../db/store';
import { groupLaunches, buildDailyReport } from '../../analyzer';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const sinceMs = Date.now() - hours * 60 * 60 * 1000;
    const launches = await getLaunchesSince(sinceMs);
    const groups = await groupLaunches(launches);

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
  } catch (err) {
    next(err);
  }
});

router.get('/report', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;
    const until = req.query.until ? parseInt(req.query.until as string) : undefined;
    const hours = parseInt(req.query.hours as string) || 24;

    const report = since
      ? await buildDailyReport(24, since, until)
      : await buildDailyReport(hours);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = (req.query.name as string) || 'test-kubevirt-console';
    const days = parseInt(req.query.days as string) || 30;
    const trend = await getPassRateTrend(launchName, days);
    res.json(trend);
  } catch (err) {
    next(err);
  }
});

export default router;
