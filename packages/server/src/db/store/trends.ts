import { AppDataSource } from '../data-source';
import { Launch } from '../entities/Launch';

const launches = () => AppDataSource.getRepository(Launch);

export const getPassRateTrend = async (
  launchName: string,
  days: number,
  component?: string,
): Promise<{ date: string; total: number; passed: number; rate: number }[]> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const queryBuilder = launches()
    .createQueryBuilder('l')
    .select("TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')", 'date')
    .addSelect('SUM(l.total)', 'total')
    .addSelect('SUM(l.passed)', 'passed')
    .addSelect('ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1)', 'rate')
    .where('l.start_time >= :sinceMs', { sinceMs });

  if (launchName) {
    queryBuilder.andWhere('l.name LIKE :name', { name: `${launchName}%` });
  }
  if (component) {
    queryBuilder.andWhere('l.component = :component', { component });
  }

  const rows: Record<string, unknown>[] = await queryBuilder
    .groupBy("TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')")
    .orderBy('date', 'ASC')
    .getRawMany();
  return rows.map(row => ({
    date: row.date as string,
    passed: Number(row.passed),
    rate: Number(row.rate),
    total: Number(row.total),
  }));
};

export const getPassRateTrendByVersion = async (
  days: number,
  component?: string,
): Promise<{ date: string; version: string; total: number; passed: number; rate: number }[]> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $2' : '';
  const params: unknown[] = [sinceMs];
  if (component) {
    params.push(component);
  }
  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date,
      SUBSTRING(l.name FROM 'cnv-(\\d+\\.\\d+)') as version,
      SUM(l.total)::int as total,
      SUM(l.passed)::int as passed,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as rate
    FROM launches l
    WHERE l.start_time >= $1${compFilter}
    GROUP BY date, version
    HAVING SUBSTRING(l.name FROM 'cnv-(\\d+\\.\\d+)') IS NOT NULL
    ORDER BY date, version
  `,
    params,
  );
  return rows.map((row: Record<string, unknown>) => ({
    date: row.date as string,
    passed: Number(row.passed),
    rate: Number(row.rate),
    total: Number(row.total),
    version: row.version as string,
  }));
};

export const getErrorPatterns = async (
  days: number,
  limit: number,
  component?: string,
): Promise<
  {
    pattern: string;
    count: number;
    uniqueTests: number;
    firstSeen: string;
    lastSeen: string;
  }[]
> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $3' : '';
  const params: unknown[] = [sinceMs, limit];
  if (component) {
    params.push(component);
  }
  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      LEFT(ti.error_message, 100) as pattern,
      COUNT(*)::int as count,
      COUNT(DISTINCT ti.unique_id)::int as unique_tests,
      TO_CHAR(TO_TIMESTAMP(MIN(ti.start_time) / 1000), 'YYYY-MM-DD') as first_seen,
      TO_CHAR(TO_TIMESTAMP(MAX(ti.start_time) / 1000), 'YYYY-MM-DD') as last_seen
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.error_message IS NOT NULL AND l.start_time >= $1${compFilter}
    GROUP BY LEFT(ti.error_message, 100)
    ORDER BY count DESC
    LIMIT $2
  `,
    params,
  );
  return rows.map((row: Record<string, unknown>) => ({
    count: Number(row.count),
    firstSeen: row.first_seen as string,
    lastSeen: row.last_seen as string,
    pattern: row.pattern as string,
    uniqueTests: Number(row.unique_tests),
  }));
};

export const getDefectTypesTrend = async (
  days: number,
  component?: string,
): Promise<
  {
    week: string;
    productBug: number;
    automationBug: number;
    systemIssue: number;
    noDefect: number;
    toInvestigate: number;
  }[]
> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND l.component = $2' : '';
  const params: unknown[] = [sinceMs];
  if (component) {
    params.push(component);
  }
  const rows: Record<string, unknown>[] = await AppDataSource.query(
    `
    SELECT
      TO_CHAR(DATE_TRUNC('week', TO_TIMESTAMP(ti.start_time / 1000)), 'YYYY-MM-DD') as week,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'pb%')::int as product_bug,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'ab%')::int as automation_bug,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'si%')::int as system_issue,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'nd%')::int as no_defect,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'ti%' OR ti.defect_type IS NULL)::int as to_investigate
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.status = 'FAILED' AND l.start_time >= $1${compFilter}
    GROUP BY week
    ORDER BY week
  `,
    params,
  );
  return rows.map((row: Record<string, unknown>) => ({
    automationBug: Number(row.automation_bug),
    noDefect: Number(row.no_defect),
    productBug: Number(row.product_bug),
    systemIssue: Number(row.system_issue),
    toInvestigate: Number(row.to_investigate),
    week: row.week as string,
  }));
};
