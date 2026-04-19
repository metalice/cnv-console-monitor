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

type VersionSummary = {
  version: string;
  passRate: number;
  totalLaunches: number;
  recommendation: 'ready' | 'at_risk' | 'blocked';
  lastRun: string | null;
};

export type ReadinessResponse = {
  version: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  blockingFailures: BlockingFailure[];
  trend: TrendPoint[];
  recommendation: 'ready' | 'at_risk' | 'blocked';
  componentBreakdown: ComponentBreakdownEntry[];
};

export type ComponentBreakdownEntry = {
  component: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
};

const PASS_RATE_READY = 95;
const PASS_RATE_BLOCKED = 80;
const UNTRIAGED_BLOCKED_THRESHOLD = 10;
const TREND_DIFF_THRESHOLD = 0.1;
const BLOCKING_FAILURES_LIMIT = 20;

type ComponentFilter = string[] | undefined;

const buildComponentClause = (
  components: ComponentFilter,
  params: unknown[],
  alias = 'l',
): string => {
  if (!components?.length) return '';
  const placeholders = components.map(comp => {
    params.push(comp);
    return `$${params.length}`;
  });
  return ` AND ${alias}.component IN (${placeholders.join(', ')})`;
};

export const computeRecommendation = (
  passRate: number,
  untriagedCount: number,
): ReadinessResponse['recommendation'] => {
  if (passRate >= PASS_RATE_READY && untriagedCount === 0) return 'ready';
  if (passRate < PASS_RATE_BLOCKED || untriagedCount > UNTRIAGED_BLOCKED_THRESHOLD) {
    return 'blocked';
  }
  return 'at_risk';
};

export const fetchBlockingFailures = async (
  version: string,
  sinceMs: number,
  midMs: number,
  components?: ComponentFilter,
): Promise<BlockingFailure[]> => {
  const params: unknown[] = [version, sinceMs, midMs];
  const componentClause = buildComponentClause(components, params);

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
      WHERE l.cnv_version = $1 AND l.start_time >= $2 AND ti.unique_id IS NOT NULL${componentClause}
      GROUP BY ti.unique_id, ti.name
      HAVING COUNT(*) FILTER (WHERE ti.status = 'FAILED') > 0
      ORDER BY fail_count DESC
      LIMIT ${BLOCKING_FAILURES_LIMIT}
    )
    SELECT
      name, unique_id, fail_count, total_runs,
      ROUND(CAST(fail_count AS NUMERIC) / NULLIF(total_runs, 0) * 100, 1) as failure_rate,
      first_half_fails, first_half_runs, second_half_fails, second_half_runs
    FROM test_failures
  `,
    params,
  );

  return rows.map((row: Record<string, unknown>) => {
    const firstHalfRuns = Number(row.first_half_runs);
    const secondHalfRuns = Number(row.second_half_runs);
    const firstRate = firstHalfRuns > 0 ? Number(row.first_half_fails) / firstHalfRuns : null;
    const secondRate = secondHalfRuns > 0 ? Number(row.second_half_fails) / secondHalfRuns : null;

    let trend: BlockingFailure['recent_trend'] = 'stable';
    if (firstRate !== null && secondRate !== null) {
      const diff = secondRate - firstRate;
      trend =
        diff > TREND_DIFF_THRESHOLD
          ? 'worsening'
          : diff < -TREND_DIFF_THRESHOLD
            ? 'improving'
            : 'stable';
    } else if (firstRate === null && secondRate !== null) {
      trend = 'worsening';
    } else if (firstRate !== null && secondRate === null) {
      trend = 'improving';
    }

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

export const fetchTrendData = async (
  version: string,
  sinceMs: number,
  components?: ComponentFilter,
): Promise<TrendPoint[]> => {
  const params: unknown[] = [version, sinceMs];
  const componentClause = buildComponentClause(components, params);

  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date,
      SUM(l.total)::int as total,
      SUM(l.passed)::int as passed,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as rate
    FROM launches l
    WHERE l.cnv_version = $1 AND l.start_time >= $2${componentClause}
    GROUP BY TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')
    ORDER BY date ASC
  `,
    params,
  );

  return rows.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    passed: Number(row.passed),
    rate: Number(row.rate),
    total: Number(row.total),
  }));
};

export const fetchComponentBreakdown = async (
  version: string,
  sinceMs: number,
  components?: ComponentFilter,
): Promise<ComponentBreakdownEntry[]> => {
  const params: unknown[] = [version, sinceMs];
  const componentClause = buildComponentClause(components, params);

  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      l.component,
      COUNT(*)::int as total_launches,
      COUNT(*) FILTER (WHERE l.status = 'FAILED' OR l.status = 'INTERRUPTED')::int as failed_launches,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as pass_rate
    FROM launches l
    WHERE l.cnv_version = $1 AND l.start_time >= $2 AND l.component IS NOT NULL${componentClause}
    GROUP BY l.component
    ORDER BY pass_rate ASC
  `,
    params,
  );

  return rows.map((row: Record<string, unknown>) => ({
    component: row.component as string,
    failedLaunches: Number(row.failed_launches),
    passRate: Number(row.pass_rate),
    totalLaunches: Number(row.total_launches),
  }));
};

export const fetchVersionSummaries = async (
  sinceMs: number,
  components?: ComponentFilter,
): Promise<VersionSummary[]> => {
  const params: unknown[] = [sinceMs];
  const componentClause = buildComponentClause(components, params);

  const launchRows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      l.cnv_version,
      COUNT(*)::int as total_launches,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as pass_rate,
      MAX(l.start_time) as last_run
    FROM launches l
    WHERE l.cnv_version IS NOT NULL
      AND l.cnv_version != ''
      AND l.cnv_version != '-'
      AND l.start_time >= $1${componentClause}
    GROUP BY l.cnv_version
    ORDER BY l.cnv_version DESC
  `,
    params,
  );

  return launchRows.map((row: Record<string, unknown>) => {
    const passRate = Number(row.pass_rate) || 0;
    return {
      lastRun: row.last_run ? new Date(Number(row.last_run)).toISOString() : null,
      passRate,
      recommendation: computeRecommendation(passRate, 0),
      totalLaunches: Number(row.total_launches),
      version: row.cnv_version as string,
    };
  });
};
