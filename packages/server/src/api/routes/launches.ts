import https from 'https';

import axios from 'axios';
import { type NextFunction, type Request, type Response, Router } from 'express';

import { buildDailyReport, groupLaunches } from '../../analyzer';
import {
  getDistinctComponents,
  getLaunchByRpId,
  getLaunchCount,
  getLaunchesSince,
} from '../../db/store';
import { clampInt } from '../middleware/validate';

import trendsRouter from './launches-trends';

const router = Router();
const jenkinsAgent = new https.Agent({ rejectUnauthorized: false });

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = clampInt(req.query.hours as string, 24, 1, 720);
    const sinceMs = Date.now() - hours * 60 * 60 * 1000;
    const launches = await getLaunchesSince(sinceMs);
    const groups = await groupLaunches(launches);

    res.json({
      groups,
      launches,
      summary: {
        failed: launches.filter(launch => launch.status === 'FAILED').length,
        inProgress: launches.filter(launch => launch.status === 'IN_PROGRESS').length,
        passed: launches.filter(launch => launch.status === 'PASSED').length,
        total: launches.length,
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
    const hours = clampInt(req.query.hours as string, 24, 1, 720);
    const componentsParam = req.query.components as string | undefined;
    const components = componentsParam ? componentsParam.split(',').filter(Boolean) : undefined;

    const report = since
      ? await buildDailyReport(24, since, until, components)
      : await buildDailyReport(hours);

    const lightGroups = report.groups.map(
      ({ enrichedFailedItems: _e, failedItems: _f, launches, ...rest }) => ({
        ...rest,
        failedItemCount: _f.length,
        launchCount: launches.length,
      }),
    );
    res.json({
      ...report,
      groups: lightGroups,
      newFailures: report.newFailures.length,
      recurringFailures: report.recurringFailures.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { AppDataSource } = await import('../../db/data-source');
    const [launches, testItems, earliest] = await Promise.all([
      getLaunchCount(),
      AppDataSource.query('SELECT COUNT(*) as count FROM test_items'),
      AppDataSource.query('SELECT MIN(start_time) as min_time FROM launches'),
    ]);
    const minTime = earliest[0]?.min_time;
    const days = minTime ? Math.ceil((Date.now() - Number(minTime)) / (24 * 60 * 60 * 1000)) : 0;
    res.json({ days, launches, testItems: parseInt(testItems[0]?.count ?? '0', 10) });
  } catch (err) {
    next(err);
  }
});

router.get('/by-name/:name', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const launchName = decodeURIComponent(req.params.name as string);
    const since = req.query.since ? parseInt(req.query.since as string) : undefined;
    const until = req.query.until ? parseInt(req.query.until as string) : undefined;
    const { AppDataSource } = await import('../../db/data-source');
    const queryBuilder = AppDataSource.getRepository('Launch')
      .createQueryBuilder('l')
      .where('l.name = :launchName', { launchName })
      .orderBy('l.start_time', 'DESC');
    if (since) {
      queryBuilder.andWhere('l.start_time >= :since', { since });
    }
    if (until) {
      queryBuilder.andWhere('l.start_time < :until', { until });
    }
    const launches = await queryBuilder.getMany();
    res.json(launches);
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

router.get('/progress/:launchId', async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const rpId = parseInt(req.params.launchId as string, 10);
    if (isNaN(rpId)) {
      res.status(400).json({ error: 'Invalid launchId' });
      return;
    }

    const launch = await getLaunchByRpId(rpId);
    if (!launch?.artifacts_url) {
      res.json({ available: false });
      return;
    }

    const buildApiUrl = launch.artifacts_url.replace(
      /\/artifact\/?$/,
      '/api/json?tree=building,result,duration,estimatedDuration,timestamp,fullDisplayName,url',
    );
    const jenkinsRes = await axios.get(buildApiUrl, { httpsAgent: jenkinsAgent, timeout: 8000 });
    const buildData = jenkinsRes.data;

    const elapsed = Date.now() - buildData.timestamp;
    const progress =
      buildData.estimatedDuration > 0
        ? Math.min(100, Math.round((elapsed / buildData.estimatedDuration) * 100))
        : 0;
    const remainingMs = Math.max(0, buildData.estimatedDuration - elapsed);

    let currentStage: string | null = null;
    try {
      const wfRes = await axios.get(`${buildData.url}wfapi/describe`, {
        httpsAgent: jenkinsAgent,
        timeout: 5000,
      });
      const stages: { name: string; status: string }[] = wfRes.data?.stages || [];
      const running = stages.find(stage => stage.status === 'IN_PROGRESS');
      currentStage = running?.name || stages[stages.length - 1]?.name || null;
    } catch {
      // Pipeline API not available
    }

    res.json({
      available: true,
      building: buildData.building,
      currentStage,
      elapsedMinutes: Math.round(elapsed / 60000),
      estimatedMinutes: Math.round(buildData.estimatedDuration / 60000),
      jenkinsUrl: buildData.url,
      progress,
      remainingMinutes: Math.round(remainingMs / 60000),
      result: buildData.result,
    });
  } catch {
    res.json({ available: false });
  }
});

router.use('/trends', trendsRouter);

export default router;
