import { AppDataSource } from '../data-source';
import type { TestItemRecord, FailureStreakInfo, RunStatus } from './types';

const toTestItemRecord = (row: Record<string, unknown>): TestItemRecord => {
  return {
    rp_id: Number(row.rp_id),
    launch_rp_id: Number(row.launch_rp_id),
    name: row.name as string,
    status: row.status as string,
    polarion_id: (row.polarion_id as string) ?? undefined,
    defect_type: (row.defect_type as string) ?? undefined,
    defect_comment: (row.defect_comment as string) ?? undefined,
    ai_prediction: (row.ai_prediction as string) ?? undefined,
    ai_confidence: row.ai_confidence != null ? Number(row.ai_confidence) : undefined,
    error_message: (row.error_message as string) ?? undefined,
    jira_key: (row.jira_key as string) ?? undefined,
    jira_status: (row.jira_status as string) ?? undefined,
    unique_id: (row.unique_id as string) ?? undefined,
    start_time: row.start_time != null ? Number(row.start_time) : undefined,
    end_time: row.end_time != null ? Number(row.end_time) : undefined,
  };
}

export const getTestFailureStreak = async (uniqueId: string, maxRuns = 8): Promise<FailureStreakInfo> => {
  const rows: Array<{ launch_start_time: string; status: string }> = await AppDataSource.query(`
    WITH failed_item AS (
      SELECT launch_rp_id FROM test_items WHERE unique_id = $1 LIMIT 1
    ),
    launch_name AS (
      SELECT l.name FROM launches l JOIN failed_item fi ON l.rp_id = fi.launch_rp_id LIMIT 1
    ),
    recent_launches AS (
      SELECT l.rp_id, l.start_time as launch_start_time
      FROM launches l, launch_name ln
      WHERE l.name = ln.name
      ORDER BY l.start_time DESC
      LIMIT $2
    )
    SELECT
      rl.launch_start_time,
      CASE WHEN ti.rp_id IS NOT NULL THEN 'FAILED' ELSE 'PASSED' END as status
    FROM recent_launches rl
    LEFT JOIN test_items ti ON ti.launch_rp_id = rl.rp_id AND ti.unique_id = $1 AND ti.status = 'FAILED'
    ORDER BY rl.launch_start_time DESC
  `, [uniqueId, maxRuns]);

  const recentRuns: RunStatus[] = rows.map(row => ({
    status: row.status,
    date: new Date(Number(row.launch_start_time)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const recentStatuses = rows.map(row => row.status);

  let consecutiveFailures = 0;
  for (const status of recentStatuses) {
    if (status === 'FAILED') consecutiveFailures++;
    else break;
  }

  let lastPassDate: string | null = null;
  let lastPassTime: number | null = null;
  const passedRow = rows.find(row => row.status === 'PASSED');
  if (passedRow) {
    lastPassTime = Number(passedRow.launch_start_time);
    lastPassDate = new Date(lastPassTime).toISOString().split('T')[0];
  }

  return {
    consecutiveFailures,
    totalRuns: rows.length,
    lastPassDate,
    lastPassTime,
    recentStatuses,
    recentRuns,
  };
}

export const getCurrentlyFailingTests = async (): Promise<TestItemRecord[]> => {
  const rows = await AppDataSource.query(`
    SELECT * FROM (
      SELECT DISTINCT ON (ti.unique_id) ti.*
      FROM test_items ti
      WHERE ti.unique_id IS NOT NULL
      ORDER BY ti.unique_id, ti.start_time DESC
    ) latest
    WHERE latest.status = 'FAILED'
  `);
  return rows.map(toTestItemRecord);
}

export const getFailuresByHour = async (
  days: number,
  component?: string,
): Promise<Array<{ hour: number; total: number; failed: number; failRate: number }>> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND component = $2' : '';
  const params: unknown[] = [sinceMs];
  if (component) params.push(component);
  const rows = await AppDataSource.query(`
    SELECT
      EXTRACT(HOUR FROM TO_TIMESTAMP(start_time / 1000))::int as hour,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed,
      ROUND(COUNT(*) FILTER (WHERE status = 'FAILED')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as fail_rate
    FROM launches
    WHERE start_time >= $1${compFilter}
    GROUP BY hour
    ORDER BY hour
  `, params);
  return rows.map((row: Record<string, unknown>) => ({
    hour: Number(row.hour),
    total: Number(row.total),
    failed: Number(row.failed),
    failRate: Number(row.fail_rate),
  }));
}

export const getClusterReliability = async (
  days: number,
  component?: string,
): Promise<Array<{ cluster: string; total: number; passed: number; failed: number; passRate: number }>> => {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const compFilter = component ? ' AND component = $2' : '';
  const params: unknown[] = [sinceMs];
  if (component) params.push(component);
  const rows = await AppDataSource.query(`
    SELECT
      cluster_name as cluster,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'PASSED')::int as passed,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed,
      ROUND(COUNT(*) FILTER (WHERE status = 'PASSED')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as pass_rate
    FROM launches
    WHERE cluster_name IS NOT NULL AND cluster_name != '' AND start_time >= $1${compFilter}
    GROUP BY cluster_name
    HAVING COUNT(*) >= 3
    ORDER BY pass_rate ASC
  `, params);
  return rows.map((row: Record<string, unknown>) => ({
    cluster: row.cluster as string,
    total: Number(row.total),
    passed: Number(row.passed),
    failed: Number(row.failed),
    passRate: Number(row.pass_rate),
  }));
}
