import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import https from 'https';
import { getLaunchesSince, getLaunchByRpId, getPassRateTrend, getPassRateTrendByVersion, getFailureHeatmap, getTopFailingTests, getAIPredictionAccuracy, getClusterReliability, getErrorPatterns, getDefectTypesTrend, getFailuresByHour, getDistinctComponents } from '../../db/store';
import { groupLaunches, buildDailyReport } from '../../analyzer';

const router = Router();
const jenkinsAgent = new https.Agent({ rejectUnauthorized: false });

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
    const componentFilter = req.query.component as string | undefined;

    const report = since
      ? await buildDailyReport(24, since, until)
      : await buildDailyReport(hours);

    if (componentFilter) {
      report.groups = report.groups.filter(g => g.component === componentFilter);
      const filteredLaunches = report.groups.flatMap(g => g.launches);
      report.passedLaunches = filteredLaunches.filter(l => l.status === 'PASSED').length;
      report.failedLaunches = filteredLaunches.filter(l => l.status === 'FAILED').length;
      report.inProgressLaunches = filteredLaunches.filter(l => l.status === 'IN_PROGRESS').length;
      report.totalLaunches = filteredLaunches.length;
      report.overallHealth = report.failedLaunches > 0 ? 'red' : report.inProgressLaunches > 0 ? 'yellow' : 'green';
    }

    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/components', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const components = await getDistinctComponents();
    res.json(components);
  } catch (err) {
    next(err);
  }
});

router.get('/progress/:launchId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rpId = parseInt(req.params.launchId, 10);
    if (isNaN(rpId)) { res.status(400).json({ error: 'Invalid launchId' }); return; }

    const launch = await getLaunchByRpId(rpId);
    if (!launch?.artifacts_url) {
      res.json({ available: false });
      return;
    }

    const buildApiUrl = launch.artifacts_url.replace(/\/artifact\/?$/, '/api/json?tree=building,result,duration,estimatedDuration,timestamp,fullDisplayName,url');
    const jenkinsRes = await axios.get(buildApiUrl, { httpsAgent: jenkinsAgent, timeout: 8000 });
    const d = jenkinsRes.data;

    const elapsed = Date.now() - d.timestamp;
    const progress = d.estimatedDuration > 0 ? Math.min(100, Math.round((elapsed / d.estimatedDuration) * 100)) : 0;
    const remainingMs = Math.max(0, d.estimatedDuration - elapsed);

    let currentStage: string | null = null;
    try {
      const wfRes = await axios.get(`${d.url}wfapi/describe`, { httpsAgent: jenkinsAgent, timeout: 5000 });
      const stages: Array<{ name: string; status: string }> = wfRes.data?.stages || [];
      const running = stages.find(s => s.status === 'IN_PROGRESS');
      currentStage = running?.name || stages[stages.length - 1]?.name || null;
    } catch {
      // pipeline API not available
    }

    res.json({
      available: true,
      building: d.building,
      result: d.result,
      progress,
      elapsedMinutes: Math.round(elapsed / 60000),
      estimatedMinutes: Math.round(d.estimatedDuration / 60000),
      remainingMinutes: Math.round(remainingMs / 60000),
      currentStage,
      jenkinsUrl: d.url,
    });
  } catch {
    res.json({ available: false });
  }
});

router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = (req.query.name as string) || '';
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    const trend = await getPassRateTrend(launchName, days, component);
    res.json(trend);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/by-version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    const data = await getPassRateTrendByVersion(days, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/heatmap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 14;
    const limit = parseInt(req.query.limit as string) || 20;
    const component = (req.query.component as string) || undefined;
    const data = await getFailureHeatmap(days, limit, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/top-failures', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 15;
    const component = (req.query.component as string) || undefined;
    const data = await getTopFailingTests(days, limit, component);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/trends/ai-accuracy', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getAIPredictionAccuracy(days, component));
  } catch (err) { next(err); }
});

router.get('/trends/clusters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getClusterReliability(days, component));
  } catch (err) { next(err); }
});

router.get('/trends/error-patterns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const limit = parseInt(req.query.limit as string) || 10;
    const component = (req.query.component as string) || undefined;
    res.json(await getErrorPatterns(days, limit, component));
  } catch (err) { next(err); }
});

router.get('/trends/defect-types', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getDefectTypesTrend(days, component));
  } catch (err) { next(err); }
});

router.get('/trends/by-hour', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const component = (req.query.component as string) || undefined;
    res.json(await getFailuresByHour(days, component));
  } catch (err) { next(err); }
});

export default router;
