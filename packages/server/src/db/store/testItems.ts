import { In } from 'typeorm';
import { AppDataSource } from '../data-source';
import { TestItem } from '../entities/TestItem';
import type { TestItemRecord } from './types';

const testItems = () => AppDataSource.getRepository(TestItem);

const toTestItemRecord = (row: TestItem | Record<string, unknown>): TestItemRecord => {
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

export const upsertTestItem = async (item: TestItemRecord): Promise<void> => {
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

export const getFailedTestItems = async (launchRpId: number): Promise<TestItemRecord[]> => {
  const rows = await testItems().find({
    where: { launch_rp_id: launchRpId, status: 'FAILED' },
    order: { start_time: 'ASC' },
  });
  return rows.map(toTestItemRecord);
}

export const getAllTestItems = async (launchRpId: number): Promise<TestItemRecord[]> => {
  const rows = await testItems().find({
    where: { launch_rp_id: launchRpId },
    order: { start_time: 'ASC' },
  });
  return rows.map(toTestItemRecord);
}

export const getFailedTestItemsForLaunches = async (launchRpIds: number[]): Promise<TestItemRecord[]> => {
  if (launchRpIds.length === 0) return [];
  const rows = await testItems().find({
    where: { launch_rp_id: In(launchRpIds), status: 'FAILED' },
    order: { start_time: 'DESC' },
  });
  return rows.map(toTestItemRecord);
}

export const getTestItemByRpId = async (rpId: number): Promise<TestItemRecord | undefined> => {
  const row = await testItems().findOneBy({ rp_id: rpId });
  return row ? toTestItemRecord(row) : undefined;
}

export const updateTestItemDefect = async (rpId: number, defectType: string, defectComment: string): Promise<void> => {
  await testItems().update({ rp_id: rpId }, { defect_type: defectType, defect_comment: defectComment });
}

export const updateTestItemJira = async (rpId: number, jiraKey: string, jiraStatus: string): Promise<void> => {
  await testItems().update({ rp_id: rpId }, { jira_key: jiraKey, jira_status: jiraStatus });
}

export const getUntriagedItems = async (sinceMs: number, untilMs?: number, component?: string): Promise<TestItemRecord[]> => {
  const compFilter = component ? ` AND l.component = $${untilMs ? 3 : 2}` : '';
  const query = untilMs
    ? `SELECT ti.* FROM test_items ti
       JOIN launches l ON ti.launch_rp_id = l.rp_id
       WHERE ti.status = 'FAILED'
         AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
         AND l.start_time >= $1 AND l.start_time < $2${compFilter}
       ORDER BY ti.start_time DESC`
    : `SELECT ti.* FROM test_items ti
       JOIN launches l ON ti.launch_rp_id = l.rp_id
       WHERE ti.status = 'FAILED'
         AND (ti.defect_type IS NULL OR ti.defect_type = 'ti001' OR ti.defect_type LIKE 'ti_%')
         AND l.start_time >= $1${compFilter}
       ORDER BY ti.start_time DESC`;
  const params: unknown[] = untilMs ? [sinceMs, untilMs] : [sinceMs];
  if (component) params.push(component);
  const rows = await AppDataSource.query(query, params);
  return rows.map(toTestItemRecord);
}

export const getTestItemHistory = async (uniqueId: string, limit = 20): Promise<TestItemRecord[]> => {
  const rows = await testItems().find({
    where: { unique_id: uniqueId },
    order: { start_time: 'DESC' },
    take: limit,
  });
  return rows.map(toTestItemRecord);
}

