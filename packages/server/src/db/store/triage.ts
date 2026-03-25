import { AppDataSource } from '../data-source';
import { TriageLog } from '../entities/TriageLog';

import type { ActivityFilters, ActivityLogEntry, TriageLogRecord } from './types';

const triageLogs = () => AppDataSource.getRepository(TriageLog);

export const addTriageLog = async (log: TriageLogRecord): Promise<void> => {
  await triageLogs().insert({
    action: log.action,
    component: log.component ?? null,
    new_value: log.new_value ?? null,
    old_value: log.old_value ?? null,
    performed_by: log.performed_by ?? null,
    test_item_rp_id: log.test_item_rp_id,
  });
};

export const getActivityLog = async (
  limit = 50,
  offset = 0,
  filters: ActivityFilters = {},
): Promise<{ entries: ActivityLogEntry[]; total: number }> => {
  const params: unknown[] = [];
  let paramIdx = 1;
  const nextParam = () => `$${paramIdx++}`;

  const triageWhere: string[] = ['1=1'];
  const ackWhere: string[] = ['1=1'];

  if (filters.component) {
    const componentParam = nextParam();
    triageWhere.push(`tl.component = ${componentParam}`);
    ackWhere.push(`a.component = ${componentParam}`);
    params.push(filters.component);
  }
  if (filters.user) {
    const userParam = nextParam();
    triageWhere.push(`tl.performed_by = ${userParam}`);
    ackWhere.push(`a.reviewer = ${userParam}`);
    params.push(filters.user);
  }
  if (filters.since) {
    const sinceParam = nextParam();
    triageWhere.push(`tl.performed_at >= ${sinceParam}::timestamptz`);
    ackWhere.push(`a.acknowledged_at >= ${sinceParam}::timestamptz`);
    params.push(filters.since);
  }
  if (filters.until) {
    const untilParam = nextParam();
    triageWhere.push(`tl.performed_at <= ${untilParam}::timestamptz`);
    ackWhere.push(`a.acknowledged_at <= ${untilParam}::timestamptz`);
    params.push(filters.until);
  }
  if (filters.action) {
    const actions = filters.action
      .split(',')
      .map(act => act.trim())
      .filter(Boolean);
    const hasAck = actions.includes('acknowledge');
    const triageActions = actions.filter(act => act !== 'acknowledge');
    if (triageActions.length > 0) {
      triageWhere.push(`tl.action IN (${triageActions.map(() => nextParam()).join(', ')})`);
      params.push(...triageActions);
    } else {
      triageWhere.push('FALSE');
    }
    if (!hasAck) {
      ackWhere.push('FALSE');
    }
  }
  if (filters.search) {
    const searchParam = nextParam();
    triageWhere.push(
      `(ti.name ILIKE ${searchParam} OR tl.new_value ILIKE ${searchParam} OR tl.performed_by ILIKE ${searchParam})`,
    );
    ackWhere.push(
      `(a.reviewer ILIKE ${searchParam} OR a.notes ILIKE ${searchParam} OR a.component ILIKE ${searchParam})`,
    );
    params.push(`%${filters.search}%`);
  }

  const limitP = nextParam();
  const offsetP = nextParam();
  params.push(limit, offset);

  const query = `
    SELECT * FROM (
      (
        SELECT
          tl.id,
          tl.test_item_rp_id,
          ti.launch_rp_id,
          tl.action,
          tl.old_value,
          tl.new_value,
          tl.performed_by,
          tl.performed_at,
          ti.name as test_name,
          tl.component,
          NULL as notes,
          tl.pinned,
          tl.pin_note
        FROM triage_log tl
        LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE ${triageWhere.join(' AND ')}
      )
      UNION ALL
      (
        SELECT
          a.id + 1000000 as id,
          NULL as test_item_rp_id,
          NULL as launch_rp_id,
          'acknowledge' as action,
          NULL as old_value,
          a.component as new_value,
          a.reviewer as performed_by,
          a.acknowledged_at as performed_at,
          NULL as test_name,
          a.component,
          a.notes,
          FALSE as pinned,
          NULL as pin_note
        FROM acknowledgments a
        WHERE ${ackWhere.join(' AND ')}
      )
    ) combined
    ORDER BY performed_at DESC
    LIMIT ${limitP} OFFSET ${offsetP}
  `;

  const countParams = params.slice(0, -2);
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      (
        SELECT tl.id
        FROM triage_log tl
        LEFT JOIN test_items ti ON tl.test_item_rp_id = ti.rp_id
        WHERE ${triageWhere.join(' AND ')}
      )
      UNION ALL
      (
        SELECT a.id + 1000000 as id
        FROM acknowledgments a
        WHERE ${ackWhere.join(' AND ')}
      )
    ) combined
  `;

  const [rows, countResult] = (await Promise.all([
    AppDataSource.query(query, params),
    AppDataSource.query(countQuery, countParams),
  ])) as [ActivityLogEntry[], Record<string, string>[]];

  return { entries: rows, total: parseInt(countResult[0]?.total ?? '0', 10) };
};
