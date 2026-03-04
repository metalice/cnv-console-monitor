import { getDb } from './schema';

export interface LaunchRecord {
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
}

export interface TestItemRecord {
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
}

export interface AcknowledgmentRecord {
  date: string;
  reviewer: string;
  notes?: string;
  acknowledged_at?: string;
}

export interface TriageLogRecord {
  test_item_rp_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by?: string;
}

export function upsertLaunch(launch: LaunchRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO launches (rp_id, uuid, name, number, status, cnv_version, bundle, ocp_version, tier, cluster_name, total, passed, failed, skipped, start_time, end_time, duration)
    VALUES (@rp_id, @uuid, @name, @number, @status, @cnv_version, @bundle, @ocp_version, @tier, @cluster_name, @total, @passed, @failed, @skipped, @start_time, @end_time, @duration)
    ON CONFLICT(rp_id) DO UPDATE SET
      status = excluded.status,
      total = excluded.total,
      passed = excluded.passed,
      failed = excluded.failed,
      skipped = excluded.skipped,
      end_time = excluded.end_time,
      duration = excluded.duration,
      fetched_at = datetime('now')
  `).run(launch);
}

export function upsertTestItem(item: TestItemRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO test_items (rp_id, launch_rp_id, name, status, polarion_id, defect_type, defect_comment, ai_prediction, ai_confidence, error_message, jira_key, jira_status, unique_id, start_time, end_time)
    VALUES (@rp_id, @launch_rp_id, @name, @status, @polarion_id, @defect_type, @defect_comment, @ai_prediction, @ai_confidence, @error_message, @jira_key, @jira_status, @unique_id, @start_time, @end_time)
    ON CONFLICT(rp_id) DO UPDATE SET
      status = excluded.status,
      defect_type = excluded.defect_type,
      defect_comment = excluded.defect_comment,
      ai_prediction = excluded.ai_prediction,
      ai_confidence = excluded.ai_confidence,
      error_message = excluded.error_message,
      jira_key = excluded.jira_key,
      jira_status = excluded.jira_status,
      fetched_at = datetime('now')
  `).run(item);
}

export function getLaunchesSince(sinceMs: number): LaunchRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM launches WHERE start_time >= ? ORDER BY start_time DESC').all(sinceMs) as LaunchRecord[];
}

export function getLaunchByRpId(rpId: number): LaunchRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM launches WHERE rp_id = ?').get(rpId) as LaunchRecord | undefined;
}

export function getFailedTestItems(launchRpId: number): TestItemRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM test_items WHERE launch_rp_id = ? AND status = ? ORDER BY start_time ASC').all(launchRpId, 'FAILED') as TestItemRecord[];
}

export function getAllTestItems(launchRpId: number): TestItemRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM test_items WHERE launch_rp_id = ? ORDER BY start_time ASC').all(launchRpId) as TestItemRecord[];
}

export function getTestItemByRpId(rpId: number): TestItemRecord | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM test_items WHERE rp_id = ?').get(rpId) as TestItemRecord | undefined;
}

export function updateTestItemDefect(rpId: number, defectType: string, defectComment: string): void {
  const db = getDb();
  db.prepare('UPDATE test_items SET defect_type = ?, defect_comment = ? WHERE rp_id = ?').run(defectType, defectComment, rpId);
}

export function updateTestItemJira(rpId: number, jiraKey: string, jiraStatus: string): void {
  const db = getDb();
  db.prepare('UPDATE test_items SET jira_key = ?, jira_status = ? WHERE rp_id = ?').run(jiraKey, jiraStatus, rpId);
}

export function addAcknowledgment(ack: AcknowledgmentRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO acknowledgments (date, reviewer, notes)
    VALUES (@date, @reviewer, @notes)
    ON CONFLICT(date, reviewer) DO UPDATE SET
      notes = excluded.notes,
      acknowledged_at = datetime('now')
  `).run(ack);
}

export function getAcknowledgmentsForDate(date: string): AcknowledgmentRecord[] {
  const db = getDb();
  return db.prepare('SELECT * FROM acknowledgments WHERE date = ? ORDER BY acknowledged_at ASC').all(date) as AcknowledgmentRecord[];
}

export function addTriageLog(log: TriageLogRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO triage_log (test_item_rp_id, action, old_value, new_value, performed_by)
    VALUES (@test_item_rp_id, @action, @old_value, @new_value, @performed_by)
  `).run(log);
}

export function getPassRateTrend(launchName: string, days: number): Array<{ date: string; total: number; passed: number; rate: number }> {
  const db = getDb();
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  return db.prepare(`
    SELECT
      date(start_time / 1000, 'unixepoch') as date,
      SUM(total) as total,
      SUM(passed) as passed,
      ROUND(CAST(SUM(passed) AS REAL) / NULLIF(SUM(total), 0) * 100, 1) as rate
    FROM launches
    WHERE name LIKE ? AND start_time >= ?
    GROUP BY date(start_time / 1000, 'unixepoch')
    ORDER BY date ASC
  `).all(`${launchName}%`, sinceMs) as Array<{ date: string; total: number; passed: number; rate: number }>;
}

export function getFlakyTests(days: number, limit: number): Array<{ name: string; unique_id: string; flip_count: number; total_runs: number }> {
  const db = getDb();
  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  return db.prepare(`
    WITH test_runs AS (
      SELECT
        ti.unique_id,
        ti.name,
        ti.status,
        ti.start_time,
        LAG(ti.status) OVER (PARTITION BY ti.unique_id ORDER BY ti.start_time) as prev_status
      FROM test_items ti
      JOIN launches l ON ti.launch_rp_id = l.rp_id
      WHERE l.start_time >= ?
    )
    SELECT
      name,
      unique_id,
      COUNT(CASE WHEN status != prev_status AND prev_status IS NOT NULL THEN 1 END) as flip_count,
      COUNT(*) as total_runs
    FROM test_runs
    WHERE unique_id IS NOT NULL
    GROUP BY unique_id
    HAVING flip_count > 0
    ORDER BY flip_count DESC
    LIMIT ?
  `).all(sinceMs, limit) as Array<{ name: string; unique_id: string; flip_count: number; total_runs: number }>;
}

export function getUntriagedItems(sinceMs: number): TestItemRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT ti.* FROM test_items ti
    JOIN launches l ON ti.launch_rp_id = l.rp_id
    WHERE ti.status = 'FAILED'
      AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
      AND l.start_time >= ?
    ORDER BY ti.start_time DESC
  `).all(sinceMs) as TestItemRecord[];
}

export function getTestItemHistory(uniqueId: string, limit = 20): TestItemRecord[] {
  const db = getDb();
  return db.prepare(`
    SELECT ti.* FROM test_items ti
    WHERE ti.unique_id = ?
    ORDER BY ti.start_time DESC
    LIMIT ?
  `).all(uniqueId, limit) as TestItemRecord[];
}

export function getActivityLog(limit = 50, offset = 0): Array<{
  id: number;
  test_item_rp_id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  test_name: string | null;
}> {
  const db = getDb();
  return db.prepare(`
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
    LIMIT ? OFFSET ?
  `).all(limit, offset) as Array<{
    id: number;
    test_item_rp_id: number;
    action: string;
    old_value: string | null;
    new_value: string | null;
    performed_by: string | null;
    performed_at: string;
    test_name: string | null;
  }>;
}
