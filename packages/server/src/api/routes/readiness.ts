import { type NextFunction, type Request, type Response, Router } from 'express';

import { AppDataSource } from '../../db/data-source';

import { fetchBlockingFailures, fetchTrendData, type ReadinessResponse } from './readiness-helpers';

const router = Router();

router.get('/versions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows: { cnv_version: string }[] = await AppDataSource.query(`
      SELECT DISTINCT cnv_version
      FROM launches
      WHERE cnv_version IS NOT NULL AND cnv_version != ''
      ORDER BY cnv_version DESC
    `);
    const versions = rows.map(row => row.cnv_version);
    res.json(versions);
  } catch (err) {
    next(err);
  }
});

router.get('/:version', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const version = req.params.version as string;
    const days = parseInt(req.query.days as string) || 30;
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const midMs = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;

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
      WHERE cnv_version = $1 AND start_time >= $2
    `,
      [version, sinceMs],
    );
    const launchStats = launchStatsRows[0];

    const totalLaunches = launchStats.total_launches || 0;
    const failedLaunches = launchStats.failed_launches || 0;
    const totalTests = launchStats.total_tests || 0;
    const passedTests = launchStats.passed_tests || 0;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0;

    const untriagedRows: { cnt: number }[] = await AppDataSource.query(
      `
      SELECT COUNT(*)::int as cnt
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.cnv_version = $1
        AND l.start_time >= $2
        AND ti.status = 'FAILED'
        AND (ti.defect_type IS NULL OR ti.defect_type LIKE 'ti%')
    `,
      [version, sinceMs],
    );
    const untriagedCount = untriagedRows[0]?.cnt ?? 0;

    const blockingFailures = await fetchBlockingFailures(version, sinceMs, midMs);
    const trend = await fetchTrendData(version, sinceMs);

    let recommendation: ReadinessResponse['recommendation'];
    if (passRate >= 95 && untriagedCount === 0) {
      recommendation = 'ready';
    } else if (passRate < 80 || untriagedCount > 10) {
      recommendation = 'blocked';
    } else {
      recommendation = 'at_risk';
    }

    const body: ReadinessResponse = {
      blockingFailures,
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
