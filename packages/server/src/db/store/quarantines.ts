import { In } from 'typeorm';

import { AppDataSource } from '../data-source';
import { Quarantine } from '../entities/Quarantine';
import { QuarantineLog } from '../entities/QuarantineLog';

const quarantines = () => AppDataSource.getRepository(Quarantine);
const quarantineLogs = () => AppDataSource.getRepository(QuarantineLog);

export const createQuarantine = async (data: Partial<Quarantine>): Promise<Quarantine> => {
  if (!data.sla_deadline && data.sla_days) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + data.sla_days);
    data.sla_deadline = deadline;
  }
  const entity = quarantines().create(data);
  return quarantines().save(entity);
};

export const getQuarantineById = async (id: string): Promise<Quarantine | null> =>
  quarantines().findOneBy({ id });

export const getQuarantines = async (
  filters: { status?: string; component?: string; limit?: number; offset?: number } = {},
): Promise<{ items: Quarantine[]; total: number }> => {
  const where: Record<string, unknown> = {};
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.component) {
    where.component = filters.component;
  }

  const [items, total] = await quarantines().findAndCount({
    order: { quarantined_at: 'DESC' },
    skip: filters.offset ?? 0,
    take: filters.limit ?? 50,
    where,
  });
  return { items, total };
};

export const getActiveQuarantines = async (): Promise<Quarantine[]> =>
  quarantines().find({
    order: { quarantined_at: 'DESC' },
    where: { status: In(['active', 'overdue']) },
  });

export const getOverdueQuarantines = async (): Promise<Quarantine[]> =>
  quarantines()
    .createQueryBuilder('q')
    .where('q.status = :status', { status: 'active' })
    .andWhere('q.sla_deadline < NOW()')
    .getMany();

export const updateQuarantineStatus = async (
  id: string,
  status: string,
  extra?: Partial<Quarantine>,
): Promise<Quarantine | null> => {
  const q = await quarantines().findOneBy({ id });
  if (!q) {
    return null;
  }
  q.status = status;
  if (extra) {
    Object.assign(q, extra);
  }
  q.updated_at = new Date();
  return quarantines().save(q);
};

export const resolveQuarantine = async (
  id: string,
  resolvedBy: string,
  extra?: Partial<Quarantine>,
): Promise<Quarantine | null> =>
  updateQuarantineStatus(id, 'resolved', {
    resolved_at: new Date(),
    resolved_by: resolvedBy,
    ...extra,
  });

export const getQuarantineByTestName = async (testName: string): Promise<Quarantine | null> =>
  quarantines().findOne({
    order: { quarantined_at: 'DESC' },
    where: { status: In(['active', 'overdue', 'proposed']), test_name: testName },
  });

export const addQuarantineLog = async (
  quarantineId: string,
  action: string,
  actor?: string,
  details?: Record<string, unknown>,
): Promise<void> => {
  await quarantineLogs().insert({
    action,
    actor: actor ?? null,
    details: (details ?? null) as unknown as string,
    quarantine_id: quarantineId,
  });
};

export const getQuarantineLogs = async (quarantineId: string): Promise<QuarantineLog[]> =>
  quarantineLogs().find({ order: { created_at: 'ASC' }, where: { quarantine_id: quarantineId } });

export const getQuarantineStats = async (): Promise<{
  active: number;
  proposed: number;
  overdue: number;
  expired: number;
  resolvedLast30d: number;
  avgDurationDays: number;
}> => {
  const rows = await AppDataSource.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'proposed') AS proposed,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
      COUNT(*) FILTER (WHERE status = 'expired') AS expired,
      COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at > NOW() - INTERVAL '30 days') AS resolved_last_30d,
      COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - quarantined_at)) / 86400) FILTER (WHERE status IN ('active', 'overdue', 'resolved')), 0) AS avg_duration_days
    FROM quarantines
  `);
  const r = rows[0] || {};
  return {
    active: parseInt(r.active ?? '0', 10),
    avgDurationDays: parseFloat(r.avg_duration_days ?? '0'),
    expired: parseInt(r.expired ?? '0', 10),
    overdue: parseInt(r.overdue ?? '0', 10),
    proposed: parseInt(r.proposed ?? '0', 10),
    resolvedLast30d: parseInt(r.resolved_last_30d ?? '0', 10),
  };
};

export const getQuarantineHistory = async (days = 30): Promise<Quarantine[]> =>
  quarantines()
    .createQueryBuilder('q')
    .where('q.status = :status', { status: 'resolved' })
    .andWhere('q.resolved_at > NOW() - INTERVAL :days', { days: `${days} days` })
    .orderBy('q.resolved_at', 'DESC')
    .getMany();
