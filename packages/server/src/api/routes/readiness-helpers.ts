import { AppDataSource } from '../../db/data-source';

export type BlockingFailure = {
  name: string;
  unique_id: string;
  fail_count: number;
  total_runs: number;
  failure_rate: number;
  recent_trend: 'worsening' | 'improving' | 'stable';
};

export type TrendPoint = { date: string; total: number; passed: number; rate: number };

export type ReadinessResponse = {
  version: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  blockingFailures: BlockingFailure[];
  trend: TrendPoint[];
  recommendation: 'ready' | 'at_risk' | 'blocked';
};

export const fetchBlockingFailures = async (
  version: string,
  sinceMs: number,
  midMs: number,
): Promise<BlockingFailure[]> => {
  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
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
  `,
    [version, sinceMs, midMs],
  );

  return rows.map((row: Record<string, unknown>) => {
    const firstRate =
      Number(row.first_half_runs) > 0
        ? Number(row.first_half_fails) / Number(row.first_half_runs)
        : 0;
    const secondRate =
      Number(row.second_half_runs) > 0
        ? Number(row.second_half_fails) / Number(row.second_half_runs)
        : 0;
    const diff = secondRate - firstRate;
    const trend =
      diff > 0.1
        ? ('worsening' as const)
        : diff < -0.1
          ? ('improving' as const)
          : ('stable' as const);
    return {
      fail_count: Number(row.fail_count),
      failure_rate: Number(row.failure_rate),
      name: row.name as string,
      recent_trend: trend,
      total_runs: Number(row.total_runs),
      unique_id: row.unique_id as string,
    };
  });
};

export const fetchTrendData = async (version: string, sinceMs: number): Promise<TrendPoint[]> => {
  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date,
      SUM(l.total)::int as total,
      SUM(l.passed)::int as passed,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as rate
    FROM launches l
    WHERE l.cnv_version = $1 AND l.start_time >= $2
    GROUP BY TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')
    ORDER BY date ASC
  `,
    [version, sinceMs],
  );

  return rows.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    passed: Number(row.passed),
    rate: Number(row.rate),
    total: Number(row.total),
  }));
};
