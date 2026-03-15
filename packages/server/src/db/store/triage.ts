import { AppDataSource } from '../data-source';
import { TriageLog } from '../entities/TriageLog';
import type { TriageLogRecord, ActivityLogEntry } from './types';

const triageLogs = () => AppDataSource.getRepository(TriageLog);

export const addTriageLog = async (log: TriageLogRecord): Promise<void> => {
  await triageLogs().insert({
    test_item_rp_id: log.test_item_rp_id,
    action: log.action,
    old_value: log.old_value ?? null,
    new_value: log.new_value ?? null,
    performed_by: log.performed_by ?? null,
    component: log.component ?? null,
  });
}

export const getActivityLog = async (limit = 50, offset = 0, component?: string): Promise<ActivityLogEntry[]> => {
  const compFilter = component ? `WHERE component = '${component.replace(/'/g, "''")}'` : '';
  const compFilterTl = component ? `AND tl.component = '${component.replace(/'/g, "''")}'` : '';

  const rows = await AppDataSource.query(`
    (
      SELECT
        tl.id,
        tl.test_item_rp_id,
        tl.action,
        tl.old_value,
        tl.new_value,
        tl.performed_by,
        tl.performed_at,
        ti.name as test_name,
        tl.component,
        NULL as notes
      FROM triage_log tl
      LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
      WHERE 1=1 ${compFilterTl}
    )
    UNION ALL
    (
      SELECT
        a.id + 1000000 as id,
        NULL as test_item_rp_id,
        'acknowledge' as action,
        NULL as old_value,
        a.component as new_value,
        a.reviewer as performed_by,
        a.acknowledged_at as performed_at,
        NULL as test_name,
        a.component,
        a.notes
      FROM acknowledgments a
      ${compFilter}
    )
    ORDER BY performed_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);
  return rows;
}
