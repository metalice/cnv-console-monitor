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

export async function getFlakyTests(days: number, limit: number): Promise<Array<{ name: string; unique_id: string; flip_count: number; total_runs: number }>> {
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const rows = await AppDataSource.query(`
    WITH test_runs AS (
      SELECT
        ti.unique_id,
        ti.name,
        ti.status,
        ti.start_time,
        LAG(ti.status) OVER (PARTITION BY ti.unique_id ORDER BY ti.start_time) as prev_status
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.start_time >= $1
    )
    SELECT
      name,
      unique_id,
      COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END)::int as flip_count,
      COUNT(*)::int as total_runs
    FROM test_runs
    WHERE unique_id IS NOT NULL
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
