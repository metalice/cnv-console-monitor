import { Router, Request, Response, NextFunction } from 'express';
import { getLaunchesSince, getPassRateTrend, getPassRateTrendByVersion, getFailureHeatmap, getTopFailingTests, getAIPredictionAccuracy, getClusterReliability, getErrorPatterns, getDefectTypesTrend, getFailuresByHour } from '../../db/store';
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

router.get('/trends/by-version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await getPassRateTrendByVersion(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await getFailureHeatmap(days, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/top-failures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 15;
    const data = await getTopFailingTests(days, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/ai-accuracy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getAIPredictionAccuracy(days));
  } catch (err) { next(err); }
});

router.get('/trends/clusters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getClusterReliability(days));
  } catch (err) { next(err); }
});

router.get('/trends/error-patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;
    res.json(await getErrorPatterns(days, limit));
  } catch (err) { next(err); }
});

router.get('/trends/defect-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getDefectTypesTrend(days));
  } catch (err) { next(err); }
});

router.get('/trends/by-hour', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    res.json(await getFailuresByHour(days));
  } catch (err) { next(err); }
});

export default router;
