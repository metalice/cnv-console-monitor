import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../db/data-source';

const router = Router();

type BlockingFailure = {
  name: string;
  unique_id: string;
  fail_count: number;
  total_runs: number;
  failure_rate: number;
  recent_trend: 'worsening' | 'improving' | 'stable';
};

type TrendPoint = { date: string; total: number; passed: number; rate: number };

type ReadinessResponse = {
  version: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  blockingFailures: BlockingFailure[];
  trend: TrendPoint[];
  recommendation: 'ready' | 'at_risk' | 'blocked';
};

router.get('/versions', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await AppDataSource.query(`
      SELECT DISTINCT cnv_version
      FROM launches
      WHERE cnv_version IS NOT NULL AND cnv_version != ''
      ORDER BY cnv_version DESC
    `);
    const versions = rows.map((r: Record<string, unknown>) => r.cnv_version as string);
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

    const [launchStats] = await AppDataSource.query(`
      SELECT
        COUNT(*)::int as total_launches,
        COUNT(*) FILTER (WHERE status = 'FAILED' OR status = 'INTERRUPTED')::int as failed_launches,
        SUM(total)::int as total_tests,
        SUM(passed)::int as passed_tests
      FROM launches
      WHERE cnv_version = $1 AND start_time >= $2
    `, [version, sinceMs]);

    const totalLaunches = Number(launchStats.total_launches) || 0;
    const failedLaunches = Number(launchStats.failed_launches) || 0;
    const totalTests = Number(launchStats.total_tests) || 0;
    const passedTests = Number(launchStats.passed_tests) || 0;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0;

    const [untriagedRow] = await AppDataSource.query(`
      SELECT COUNT(*)::int as cnt
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.cnv_version = $1
        AND l.start_time >= $2
        AND ti.status = 'FAILED'
        AND (ti.defect_type IS NULL OR ti.defect_type LIKE 'ti%')
    `, [version, sinceMs]);
    const untriagedCount = Number(untriagedRow.cnt) || 0;

    const blockingRows = await AppDataSource.query(`
      WITH test_failures AS (
        SELECT
          ti.unique_id, ti.name,
          COUNT(*) FILTER (WHERE ti.status = 'FAILED')::int as fail_count,
          COUNT(*)::int as total_runs,
          COUNT(*) FILTER (WHERE ti.status = 'FAILED' AND l.start_time < $3)::int as first_half_fails,
          COUNT(*) FILTER (WHERE l.start_time < $3)::int as first_half_runs,
          COUNT(*) FILTER (WHERE ti.status = 'FAILED' AND l.start_time >= $3)::int as second_half_fails,
          COUNT(*) FILTER (WHERE l.start_time >= $3)::int as second_half_runs
        FROM test_items ti
        JOIN launches l ON ti.launch_rp_id = l.rp_id
        WHERE l.cnv_version = $1 AND l.start_time >= $2 AND ti.unique_id IS NOT NULL
        GROUP BY ti.unique_id, ti.name
        HAVING COUNT(*) FILTER (WHERE ti.status = 'FAILED') > 0
        ORDER BY fail_count DESC
        LIMIT 20
      )
      SELECT
        name, unique_id, fail_count, total_runs,
        ROUND(CAST(fail_count AS NUMERIC) / NULLIF(total_runs, 0) * 100, 1) as failure_rate,
        first_half_fails, first_half_runs, second_half_fails, second_half_runs
      FROM test_failures
    `, [version, sinceMs, midMs]);

    const blockingFailures: BlockingFailure[] = blockingRows.map((r: Record<string, unknown>) => {
      const firstRate = Number(r.first_half_runs) > 0 ? Number(r.first_half_fails) / Number(r.first_half_runs) : 0;
      const secondRate = Number(r.second_half_runs) > 0 ? Number(r.second_half_fails) / Number(r.second_half_runs) : 0;
      const diff = secondRate - firstRate;
      const trend = diff > 0.1 ? 'worsening' as const : diff < -0.1 ? 'improving' as const : 'stable' as const;
      return {
        name: r.name as string,
        unique_id: r.unique_id as string,
        fail_count: Number(r.fail_count),
        total_runs: Number(r.total_runs),
        failure_rate: Number(r.failure_rate),
        recent_trend: trend,
      };
    });

    const trendRows = await AppDataSource.query(`
      SELECT
        TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date,
        SUM(l.total)::int as total,
        SUM(l.passed)::int as passed,
        ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as rate
      FROM launches l
      WHERE l.cnv_version = $1 AND l.start_time >= $2
      GROUP BY TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')
      ORDER BY date ASC
    `, [version, sinceMs]);

    const trend: TrendPoint[] = trendRows.map((r: Record<string, unknown>) => ({
      date: r.date as string,
      total: Number(r.total),
      passed: Number(r.passed),
      rate: Number(r.rate),
    }));

    let recommendation: ReadinessResponse['recommendation'];
    if (passRate >= 95 && untriagedCount === 0) {
      recommendation = 'ready';
    } else if (passRate < 80 || untriagedCount > 10) {
      recommendation = 'blocked';
    } else {
      recommendation = 'at_risk';
    }

    const body: ReadinessResponse = {
      version,
      passRate,
      totalLaunches,
      failedLaunches,
      untriagedCount,
      blockingFailures,
      trend,
      recommendation,
    };

    res.json(body);
  } catch (err) {
    next(err);
  }
});

export default router;
