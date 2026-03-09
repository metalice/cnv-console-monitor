import { MoreThanOrEqual, IsNull, Like, In } from 'typeorm';
import { AppDataSource } from './data-source';
import { Launch } from './entities/Launch';
import { TestItem } from './entities/TestItem';
import { Acknowledgment } from './entities/Acknowledgment';
import { TriageLog } from './entities/TriageLog';

export type LaunchRecord = {
  rp_id: number;
  uuid: string;
  name: string;
  number: number;
  status: string;
  cnv_version?: string;
  bundle?: string;
  ocp_version?: string;
  tier?: string;
  cluster_name?: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  start_time: number;
  end_time?: number;
  duration?: number;
  artifacts_url?: string;
};

export type TestItemRecord = {
  rp_id: number;
  launch_rp_id: number;
  name: string;
  status: string;
  polarion_id?: string;
  defect_type?: string;
  defect_comment?: string;
  ai_prediction?: string;
  ai_confidence?: number;
  error_message?: string;
  jira_key?: string;
  jira_status?: string;
  unique_id?: string;
  start_time?: number;
  end_time?: number;
};

export type AcknowledgmentRecord = {
  date: string;
  reviewer: string;
  notes?: string;
  acknowledged_at?: string;
};

export type TriageLogRecord = {
  test_item_rp_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by?: string;
};

const launches = () => AppDataSource.getRepository(Launch);
const testItems = () => AppDataSource.getRepository(TestItem);
const acknowledgments = () => AppDataSource.getRepository(Acknowledgment);
const triageLogs = () => AppDataSource.getRepository(TriageLog);

export async function upsertLaunch(launch: LaunchRecord): Promise<void> {
  await launches().upsert(
    {
      rp_id: launch.rp_id,
      uuid: launch.uuid,
      name: launch.name,
      number: launch.number,
      status: launch.status,
      cnv_version: launch.cnv_version ?? null,
      bundle: launch.bundle ?? null,
      ocp_version: launch.ocp_version ?? null,
      tier: launch.tier ?? null,
      cluster_name: launch.cluster_name ?? null,
      total: launch.total,
      passed: launch.passed,
      failed: launch.failed,
      skipped: launch.skipped,
      start_time: launch.start_time,
      end_time: launch.end_time ?? null,
      duration: launch.duration ?? null,
      artifacts_url: launch.artifacts_url ?? null,
    },
    { conflictPaths: ['rp_id'], skipUpdateIfNoValuesChanged: true },
  );
}

export async function upsertTestItem(item: TestItemRecord): Promise<void> {
  await testItems().upsert(
    {
      rp_id: item.rp_id,
      launch_rp_id: item.launch_rp_id,
      name: item.name,
      status: item.status,
      polarion_id: item.polarion_id ?? null,
      defect_type: item.defect_type ?? null,
      defect_comment: item.defect_comment ?? null,
      ai_prediction: item.ai_prediction ?? null,
      ai_confidence: item.ai_confidence ?? null,
      error_message: item.error_message ?? null,
      jira_key: item.jira_key ?? null,
      jira_status: item.jira_status ?? null,
      unique_id: item.unique_id ?? null,
      start_time: item.start_time ?? null,
      end_time: item.end_time ?? null,
    },
    { conflictPaths: ['rp_id'], skipUpdateIfNoValuesChanged: true },
  );
}

export async function getLaunchesSince(sinceMs: number): Promise<LaunchRecord[]> {
  const rows = await launches().find({
    where: { start_time: MoreThanOrEqual(sinceMs) },
    order: { start_time: 'DESC' },
  });
  return rows.map(toLaunchRecord);
}

export async function getLaunchesInRange(sinceMs: number, untilMs: number): Promise<LaunchRecord[]> {
  const rows = await launches()
    .createQueryBuilder('l')
    .where('l.start_time >= :sinceMs', { sinceMs })
    .andWhere('l.start_time < :untilMs', { untilMs })
    .orderBy('l.start_time', 'DESC')
    .getMany();
  return rows.map(toLaunchRecord);
}

export async function getLastPassedLaunchTime(launchName: string): Promise<number | null> {
  const row = await launches().findOne({
    where: { name: launchName, status: 'PASSED' },
    order: { start_time: 'DESC' },
  });
  return row ? Number(row.start_time) : null;
}

export async function getLaunchByRpId(rpId: number): Promise<LaunchRecord | undefined> {
  const row = await launches().findOneBy({ rp_id: rpId });
  return row ? toLaunchRecord(row) : undefined;
}

export async function getFailedTestItems(launchRpId: number): Promise<TestItemRecord[]> {
  const rows = await testItems().find({
    where: { launch_rp_id: launchRpId, status: 'FAILED' },
    order: { start_time: 'ASC' },
  });
  return rows.map(toTestItemRecord);
}

export async function getAllTestItems(launchRpId: number): Promise<TestItemRecord[]> {
  const rows = await testItems().find({
    where: { launch_rp_id: launchRpId },
    order: { start_time: 'ASC' },
  });
  return rows.map(toTestItemRecord);
}

export async function getFailedTestItemsForLaunches(launchRpIds: number[]): Promise<TestItemRecord[]> {
  if (launchRpIds.length === 0) return [];
  const rows = await testItems().find({
    where: { launch_rp_id: In(launchRpIds), status: 'FAILED' },
    order: { start_time: 'DESC' },
  });
  return rows.map(toTestItemRecord);
}

export async function getTestItemByRpId(rpId: number): Promise<TestItemRecord | undefined> {
  const row = await testItems().findOneBy({ rp_id: rpId });
  return row ? toTestItemRecord(row) : undefined;
}

export async function updateTestItemDefect(rpId: number, defectType: string, defectComment: string): Promise<void> {
  await testItems().update({ rp_id: rpId }, { defect_type: defectType, defect_comment: defectComment });
}

export async function updateTestItemJira(rpId: number, jiraKey: string, jiraStatus: string): Promise<void> {
  await testItems().update({ rp_id: rpId }, { jira_key: jiraKey, jira_status: jiraStatus });
}

export async function addAcknowledgment(ack: AcknowledgmentRecord): Promise<void> {
  await acknowledgments().upsert(
    { date: ack.date, reviewer: ack.reviewer, notes: ack.notes ?? null },
    { conflictPaths: ['date', 'reviewer'] },
  );
}

export async function getAcknowledgmentsForDate(date: string): Promise<AcknowledgmentRecord[]> {
  const rows = await acknowledgments().find({
    where: { date },
    order: { acknowledged_at: 'ASC' },
  });
  return rows.map(toAckRecord);
}

export async function deleteAcknowledgment(date: string, reviewer: string): Promise<void> {
  await acknowledgments().delete({ date, reviewer });
}

export async function getAckHistory(days: number): Promise<Array<{ date: string; reviewer: string; acknowledged_at: string | null }>> {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return acknowledgments()
    .createQueryBuilder('a')
    .select(['a.date as date', 'a.reviewer as reviewer', 'a.acknowledged_at as acknowledged_at'])
    .where('a.date >= :sinceDate', { sinceDate })
    .orderBy('a.date', 'DESC')
    .addOrderBy('a.acknowledged_at', 'ASC')
    .getRawMany();
}

export async function getApproverStats(days: number): Promise<Array<{ reviewer: string; totalReviews: number; lastReviewDate: string }>> {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const rows = await acknowledgments()
    .createQueryBuilder('a')
    .select('a.reviewer', 'reviewer')
    .addSelect('COUNT(*)', 'totalReviews')
    .addSelect('MAX(a.date)', 'lastReviewDate')
    .where('a.date >= :sinceDate', { sinceDate })
    .groupBy('a.reviewer')
    .orderBy('"totalReviews"', 'DESC')
    .getRawMany();
  return rows.map((r) => ({ reviewer: r.reviewer, totalReviews: Number(r.totalReviews), lastReviewDate: r.lastReviewDate }));
}

export async function addTriageLog(log: TriageLogRecord): Promise<void> {
  await triageLogs().insert({
    test_item_rp_id: log.test_item_rp_id,
    action: log.action,
    old_value: log.old_value ?? null,
    new_value: log.new_value ?? null,
    performed_by: log.performed_by ?? null,
  });
}

export async function getPassRateTrend(launchName: string, days: number): Promise<Array<{ date: string; total: number; passed: number; rate: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await launches()
    .createQueryBuilder('l')
    .select("TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')", 'date')
    .addSelect('SUM(l.total)', 'total')
    .addSelect('SUM(l.passed)', 'passed')
    .addSelect('ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1)', 'rate')
    .where('l.name LIKE :name', { name: `${launchName}%` })
    .andWhere('l.start_time >= :sinceMs', { sinceMs })
    .groupBy("TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD')")
    .orderBy('date', 'ASC')
    .getRawMany();
  return rows.map((r) => ({ date: r.date, total: Number(r.total), passed: Number(r.passed), rate: Number(r.rate) }));
}

export async function getPassRateTrendByVersion(days: number): Promise<Array<{ date: string; version: string; total: number; passed: number; rate: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date,
      SUBSTRING(l.name FROM 'cnv-(\d+\.\d+)') as version,
      SUM(l.total)::int as total,
      SUM(l.passed)::int as passed,
      ROUND(CAST(SUM(l.passed) AS NUMERIC) / NULLIF(SUM(l.total), 0) * 100, 1) as rate
    FROM launches l
    WHERE l.start_time >= $1 AND l.name LIKE 'test-kubevirt-console%'
    GROUP BY date, version
    HAVING SUBSTRING(l.name FROM 'cnv-(\d+\.\d+)') IS NOT NULL
    ORDER BY date, version
  `, [sinceMs]);
  return rows.map((r: Record<string, unknown>) => ({
    date: r.date as string,
    version: r.version as string,
    total: Number(r.total),
    passed: Number(r.passed),
    rate: Number(r.rate),
  }));
}

export async function getFailureHeatmap(days: number, limit: number): Promise<Array<{ unique_id: string; name: string; fail_count: number; date: string; status: string }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    WITH top_failures AS (
      SELECT ti.unique_id, ti.name, COUNT(*)::int as fail_count
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE ti.status = 'FAILED' AND l.start_time >= $1 AND ti.unique_id IS NOT NULL
      GROUP BY ti.unique_id, ti.name
      ORDER BY fail_count DESC
      LIMIT $2
    ),
    date_range AS (
      SELECT DISTINCT TO_CHAR(TO_TIMESTAMP(l.start_time / 1000), 'YYYY-MM-DD') as date
      FROM launches l
      WHERE l.start_time >= $1
    )
    SELECT
      tf.unique_id, tf.name, tf.fail_count, dr.date,
      CASE WHEN EXISTS (
        SELECT 1 FROM test_items ti2
        WHERE ti2.unique_id = tf.unique_id
          AND ti2.status = 'FAILED'
          AND TO_CHAR(TO_TIMESTAMP(ti2.start_time / 1000), 'YYYY-MM-DD') = dr.date
      ) THEN 'FAILED' ELSE 'OK' END as status
    FROM top_failures tf
    CROSS JOIN date_range dr
    ORDER BY tf.fail_count DESC, tf.name, dr.date
  `, [sinceMs, limit]);
  return rows;
}

export async function getTopFailingTests(days: number, limit: number): Promise<Array<{
  name: string;
  unique_id: string;
  fail_count: number;
  total_runs: number;
  failure_rate: number;
  recent_trend: 'worsening' | 'improving' | 'stable';
}>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const midMs = Date.now() - (days / 2) * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
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
      WHERE l.start_time >= $1 AND ti.unique_id IS NOT NULL
      GROUP BY ti.unique_id, ti.name
      HAVING COUNT(*) FILTER (WHERE ti.status = 'FAILED') > 0
      ORDER BY fail_count DESC
      LIMIT $2
    )
    SELECT
      name, unique_id, fail_count, total_runs,
      ROUND(CAST(fail_count AS NUMERIC) / NULLIF(total_runs, 0) * 100, 1) as failure_rate,
      first_half_fails, first_half_runs, second_half_fails, second_half_runs
    FROM test_failures
  `, [sinceMs, limit, midMs]);

  return rows.map((r: Record<string, unknown>) => {
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
}

export async function getAIPredictionAccuracy(days: number): Promise<Array<{ prediction: string; actual: string; count: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      ti.ai_prediction as prediction,
      CASE
        WHEN ti.defect_type LIKE 'pb%' THEN 'Product Bug'
        WHEN ti.defect_type LIKE 'ab%' THEN 'Automation Bug'
        WHEN ti.defect_type LIKE 'si%' THEN 'System Issue'
        WHEN ti.defect_type LIKE 'nd%' THEN 'No Defect'
        ELSE 'Other'
      END as actual,
      COUNT(*)::int as count
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.ai_prediction IS NOT NULL
      AND ti.defect_type IS NOT NULL
      AND ti.defect_type NOT LIKE 'ti_%' AND ti.defect_type != 'ti001'
      AND l.start_time >= $1
    GROUP BY prediction, actual
    ORDER BY count DESC
  `, [sinceMs]);
  return rows;
}

export async function getClusterReliability(days: number): Promise<Array<{ cluster: string; total: number; passed: number; failed: number; passRate: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      cluster_name as cluster,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'PASSED')::int as passed,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed,
      ROUND(COUNT(*) FILTER (WHERE status = 'PASSED')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as pass_rate
    FROM launches
    WHERE cluster_name IS NOT NULL AND cluster_name != '' AND start_time >= $1
    GROUP BY cluster_name
    HAVING COUNT(*) >= 3
    ORDER BY pass_rate ASC
  `, [sinceMs]);
  return rows.map((r: Record<string, unknown>) => ({
    cluster: r.cluster as string,
    total: Number(r.total),
    passed: Number(r.passed),
    failed: Number(r.failed),
    passRate: Number(r.pass_rate),
  }));
}

export async function getErrorPatterns(days: number, limit: number): Promise<Array<{ pattern: string; count: number; uniqueTests: number; firstSeen: string; lastSeen: string }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      LEFT(ti.error_message, 100) as pattern,
      COUNT(*)::int as count,
      COUNT(DISTINCT ti.unique_id)::int as unique_tests,
      TO_CHAR(TO_TIMESTAMP(MIN(ti.start_time) / 1000), 'YYYY-MM-DD') as first_seen,
      TO_CHAR(TO_TIMESTAMP(MAX(ti.start_time) / 1000), 'YYYY-MM-DD') as last_seen
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.error_message IS NOT NULL AND l.start_time >= $1
    GROUP BY LEFT(ti.error_message, 100)
    ORDER BY count DESC
    LIMIT $2
  `, [sinceMs, limit]);
  return rows.map((r: Record<string, unknown>) => ({
    pattern: r.pattern as string,
    count: Number(r.count),
    uniqueTests: Number(r.unique_tests),
    firstSeen: r.first_seen as string,
    lastSeen: r.last_seen as string,
  }));
}

export async function getDefectTypesTrend(days: number): Promise<Array<{ week: string; productBug: number; automationBug: number; systemIssue: number; noDefect: number; toInvestigate: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', TO_TIMESTAMP(ti.start_time / 1000)), 'YYYY-MM-DD') as week,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'pb%')::int as product_bug,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'ab%')::int as automation_bug,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'si%')::int as system_issue,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'nd%')::int as no_defect,
      COUNT(*) FILTER (WHERE ti.defect_type LIKE 'ti%' OR ti.defect_type IS NULL)::int as to_investigate
    FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.status = 'FAILED' AND l.start_time >= $1
    GROUP BY week
    ORDER BY week
  `, [sinceMs]);
  return rows.map((r: Record<string, unknown>) => ({
    week: r.week as string,
    productBug: Number(r.product_bug),
    automationBug: Number(r.automation_bug),
    systemIssue: Number(r.system_issue),
    noDefect: Number(r.no_defect),
    toInvestigate: Number(r.to_investigate),
  }));
}

export async function getFailuresByHour(days: number): Promise<Array<{ hour: number; total: number; failed: number; failRate: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    SELECT
      EXTRACT(HOUR FROM TO_TIMESTAMP(start_time / 1000))::int as hour,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed,
      ROUND(COUNT(*) FILTER (WHERE status = 'FAILED')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as fail_rate
    FROM launches
    WHERE start_time >= $1
    GROUP BY hour
    ORDER BY hour
  `, [sinceMs]);
  return rows.map((r: Record<string, unknown>) => ({
    hour: Number(r.hour),
    total: Number(r.total),
    failed: Number(r.failed),
    failRate: Number(r.fail_rate),
  }));
}

export async function getFlakyTests(days: number, limit: number): Promise<Array<{ name: string; unique_id: string; flip_count: number; total_runs: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    WITH failed_tests AS (
      SELECT DISTINCT ti.unique_id, ti.name
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.start_time >= $1 AND ti.unique_id IS NOT NULL AND ti.status = 'FAILED'
    ),
    test_launches AS (
      SELECT
        ft.unique_id, ft.name, l.rp_id as launch_rp_id, l.name as launch_name, l.start_time,
        CASE WHEN ti.rp_id IS NOT NULL THEN 'FAILED' ELSE 'PASSED' END as status,
        LAG(CASE WHEN ti.rp_id IS NOT NULL THEN 'FAILED' ELSE 'PASSED' END)
          OVER (PARTITION BY ft.unique_id, l.name ORDER BY l.start_time) as prev_status
      FROM failed_tests ft
      CROSS JOIN LATERAL (
        SELECT l2.* FROM launches l2
        WHERE l2.name IN (
          SELECT DISTINCT l3.name FROM launches l3
          JOIN test_items ti3 ON ti3.launch_rp_id = l3.rp_id
          WHERE ti3.unique_id = ft.unique_id AND l3.start_time >= $1
        )
        AND l2.start_time >= $1
      ) l
      LEFT JOIN test_items ti ON ti.launch_rp_id = l.rp_id AND ti.unique_id = ft.unique_id AND ti.status = 'FAILED'
    )
    SELECT
      name, unique_id,
      COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END)::int as flip_count,
      COUNT(*)::int as total_runs
    FROM test_launches
    GROUP BY unique_id, name
    HAVING COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END) > 0
    ORDER BY flip_count DESC
    LIMIT $2
  `, [sinceMs, limit]);
  return rows;
}

export async function getUntriagedItems(sinceMs: number, untilMs?: number): Promise<TestItemRecord[]> {
  const query = untilMs
    ? `SELECT ti.* FROM test_items ti
       JOIN launches l ON ti.launch_rp_id = l.rp_id
       WHERE ti.status = 'FAILED'
         AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
         AND l.start_time >= $1 AND l.start_time < $2
       ORDER BY ti.start_time DESC`
    : `SELECT ti.* FROM test_items ti
       JOIN launches l ON ti.launch_rp_id = l.rp_id
       WHERE ti.status = 'FAILED'
         AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
         AND l.start_time >= $1
       ORDER BY ti.start_time DESC`;
  const params = untilMs ? [sinceMs, untilMs] : [sinceMs];
  const rows = await AppDataSource.query(query, params);
  return rows.map(toTestItemRecord);
}

export async function getTestItemHistory(uniqueId: string, limit = 20): Promise<TestItemRecord[]> {
  const rows = await testItems().find({
    where: { unique_id: uniqueId },
    order: { start_time: 'DESC' },
    take: limit,
  });
  return rows.map(toTestItemRecord);
}

export type RunStatus = {
  status: string;
  date: string;
};

export type FailureStreakInfo = {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: RunStatus[];
};

export async function getTestFailureStreak(uniqueId: string, maxRuns = 8): Promise<FailureStreakInfo> {
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

  const recentRuns: RunStatus[] = rows.map(r => ({
    status: r.status,
    date: new Date(Number(r.launch_start_time)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));
  const recentStatuses = rows.map(r => r.status);

  let consecutiveFailures = 0;
  for (const s of recentStatuses) {
    if (s === 'FAILED') consecutiveFailures++;
    else break;
  }

  let lastPassDate: string | null = null;
  let lastPassTime: number | null = null;
  const passedRow = rows.find(r => r.status === 'PASSED');
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

export async function getCurrentlyFailingTests(): Promise<TestItemRecord[]> {
  const rows = await AppDataSource.query(`
    SELECT DISTINCT ON (ti.unique_id) ti.*
    FROM test_items ti
    WHERE ti.unique_id IS NOT NULL
    ORDER BY ti.unique_id, ti.start_time DESC
  `);
  return rows.filter((r: Record<string, unknown>) => r.status === 'FAILED').map(toTestItemRecord);
}

export async function getActivityLog(limit = 50, offset = 0): Promise<Array<{
  id: number;
  test_item_rp_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  test_name: string | null;
}>> {
  const rows = await AppDataSource.query(`
    SELECT
      tl.id,
      tl.test_item_rp_id,
      tl.action,
      tl.old_value,
      tl.new_value,
      tl.performed_by,
      tl.performed_at,
      ti.name as test_name
    FROM triage_log tl
    LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
    ORDER BY tl.performed_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return rows;
}

export async function getLaunchCount(): Promise<number> {
  return launches().count();
}

function toLaunchRecord(row: Launch): LaunchRecord {
  return {
    rp_id: row.rp_id,
    uuid: row.uuid,
    name: row.name,
    number: row.number,
    status: row.status,
    cnv_version: row.cnv_version ?? undefined,
    bundle: row.bundle ?? undefined,
    ocp_version: row.ocp_version ?? undefined,
    tier: row.tier ?? undefined,
    cluster_name: row.cluster_name ?? undefined,
    total: row.total,
    passed: row.passed,
    failed: row.failed,
    skipped: row.skipped,
    start_time: Number(row.start_time),
    end_time: row.end_time ? Number(row.end_time) : undefined,
    duration: row.duration ?? undefined,
    artifacts_url: row.artifacts_url ?? undefined,
  };
}

function toTestItemRecord(row: TestItem | Record<string, unknown>): TestItemRecord {
  return {
    rp_id: Number((row as Record<string, unknown>).rp_id),
    launch_rp_id: Number((row as Record<string, unknown>).launch_rp_id),
    name: (row as Record<string, unknown>).name as string,
    status: (row as Record<string, unknown>).status as string,
    polarion_id: ((row as Record<string, unknown>).polarion_id as string) ?? undefined,
    defect_type: ((row as Record<string, unknown>).defect_type as string) ?? undefined,
    defect_comment: ((row as Record<string, unknown>).defect_comment as string) ?? undefined,
    ai_prediction: ((row as Record<string, unknown>).ai_prediction as string) ?? undefined,
    ai_confidence: (row as Record<string, unknown>).ai_confidence != null ? Number((row as Record<string, unknown>).ai_confidence) : undefined,
    error_message: ((row as Record<string, unknown>).error_message as string) ?? undefined,
    jira_key: ((row as Record<string, unknown>).jira_key as string) ?? undefined,
    jira_status: ((row as Record<string, unknown>).jira_status as string) ?? undefined,
    unique_id: ((row as Record<string, unknown>).unique_id as string) ?? undefined,
    start_time: (row as Record<string, unknown>).start_time != null ? Number((row as Record<string, unknown>).start_time) : undefined,
    end_time: (row as Record<string, unknown>).end_time != null ? Number((row as Record<string, unknown>).end_time) : undefined,
  };
}

function toAckRecord(row: Acknowledgment): AcknowledgmentRecord {
  return {
    date: row.date,
    reviewer: row.reviewer,
    notes: row.notes ?? undefined,
    acknowledged_at: row.acknowledged_at?.toISOString() ?? undefined,
  };
}
