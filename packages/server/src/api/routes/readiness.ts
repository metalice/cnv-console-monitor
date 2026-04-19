import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';

import {
  computeRecommendation,
  fetchBlockingFailures,
  fetchComponentBreakdown,
  fetchTrendData,
  fetchVersionSummaries,
  type ReadinessResponse,
} from './readiness-helpers';

const router = Router();

const parseComponents = (param: string | undefined): string[] | undefined => {
  if (!param) return undefined;
  const list = param.split(',').filter(Boolean);
  return list.length > 0 ? list : undefined;
};

router.get('/versions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const components = parseComponents(req.query.components as string | undefined);
    const days = parseInt(req.query.days as string) || 30;
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;

    const summaries = await fetchVersionSummaries(sinceMs, components);
    res.json(summaries);
  } catch (err) {
    next(err);
  }
});

router.get('/:version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = req.params.version as string;
    const days = parseInt(req.query.days as string) || 30;
    const components = parseComponents(req.query.components as string | undefined);
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const midMs = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;

    const params: unknown[] = [version, sinceMs];
    let componentClause = '';
    if (components?.length) {
      const placeholders = components.map(comp => {
        params.push(comp);
        return `$${params.length}`;
      });
      componentClause = ` AND component IN (${placeholders.join(', ')})`;
    }

    type LaunchStatsRow = {
      total_launches: number;
      failed_launches: number;
      total_tests: number;
      passed_tests: number;
    };
    const launchStatsRows: LaunchStatsRow[] = await AppDataSource.query(
      `
      SELECT
        COUNT(*)::int as total_launches,
        COUNT(*) FILTER (WHERE status = 'FAILED' OR status = 'INTERRUPTED')::int as failed_launches,
        SUM(total)::int as total_tests,
        SUM(passed)::int as passed_tests
      FROM launches
      WHERE cnv_version = $1 AND start_time >= $2${componentClause}
    `,
      params,
    );
    const launchStats = launchStatsRows[0];

    const totalLaunches = launchStats.total_launches || 0;
    const failedLaunches = launchStats.failed_launches || 0;
    const totalTests = launchStats.total_tests || 0;
    const passedTests = launchStats.passed_tests || 0;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0;

    const untriagedParams: unknown[] = [version, sinceMs];
    let untriagedComponentClause = '';
    if (components?.length) {
      const placeholders = components.map(comp => {
        untriagedParams.push(comp);
        return `$${untriagedParams.length}`;
      });
      untriagedComponentClause = ` AND l.component IN (${placeholders.join(', ')})`;
    }

    const untriagedRows: { cnt: number }[] = await AppDataSource.query(
      `
      SELECT COUNT(*)::int as cnt
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.cnv_version = $1
        AND l.start_time >= $2
        AND ti.status = 'FAILED'
        AND (ti.defect_type IS NULL OR ti.defect_type LIKE 'ti%')${untriagedComponentClause}
    `,
      untriagedParams,
    );
    const untriagedCount = untriagedRows[0]?.cnt ?? 0;

    const [blockingFailures, trend, componentBreakdown] = await Promise.all([
      fetchBlockingFailures(version, sinceMs, midMs, components),
      fetchTrendData(version, sinceMs, components),
      fetchComponentBreakdown(version, sinceMs, components),
    ]);

    const recommendation = computeRecommendation(passRate, untriagedCount);

    const body: ReadinessResponse = {
      blockingFailures,
      componentBreakdown,
      failedLaunches,
      passRate,
      recommendation,
      totalLaunches,
      trend,
      untriagedCount,
      version,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
