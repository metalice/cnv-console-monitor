import { AppDataSource } from '../data-source';
import { ComponentMapping } from '../entities/ComponentMapping';

export type ComponentMappingRecord = {
  pattern: string;
  component: string;
  type: string;
  createdAt: string;
};

const mappings = () => AppDataSource.getRepository(ComponentMapping);

const toRecord = (row: ComponentMapping): ComponentMappingRecord => ({
  component: row.component,
  createdAt: row.created_at?.toISOString() ?? new Date().toISOString(),
  pattern: row.pattern,
  type: row.type,
});

export const getAllComponentMappings = async (): Promise<ComponentMappingRecord[]> => {
  const rows = await mappings().find({ order: { component: 'ASC', pattern: 'ASC' } });
  return rows.map(toRecord);
};

export const upsertComponentMapping = async (
  pattern: string,
  component: string,
  type: string,
): Promise<void> => {
  await mappings().upsert({ component, pattern, type }, { conflictPaths: ['pattern'] });
};

export const deleteComponentMapping = async (pattern: string): Promise<void> => {
  await mappings().delete({ pattern });
};

export type UnmappedLaunchEntry = { name: string; count: number; jobDeleted: boolean };

export const getUnmappedLaunchNames = async (): Promise<UnmappedLaunchEntry[]> => {
  const rows = await AppDataSource.getRepository('Launch')
    .createQueryBuilder('l')
    .select('l.name', 'name')
    .addSelect('COUNT(*)', 'count')
    .addSelect("BOOL_AND(l.jenkins_status IN ('job_deleted', 'not_found'))", 'job_deleted')
    .where('l.component IS NULL')
    .groupBy('l.name')
    .orderBy('count', 'DESC')
    .addOrderBy('l.name', 'ASC')
    .getRawMany();
  return rows.map((row: { name: string; count: string; job_deleted: boolean }) => ({
    count: parseInt(row.count, 10),
    jobDeleted: row.job_deleted,
    name: row.name,
  }));
};

export const applyRegexMapping = async (
  pattern: string,
  component: string,
  includeDeleted = false,
): Promise<number> => {
  try {
    const statusFilter = includeDeleted
      ? ''
      : " AND jenkins_status NOT IN ('job_deleted', 'not_found')";
    const result = await AppDataSource.query(
      `UPDATE launches SET component = $1, jenkins_status = 'regex_mapped' WHERE component IS NULL AND jenkins_team IS NULL${statusFilter} AND name ~* $2`,
      [component, pattern],
    );
    return result[1] ?? 0;
  } catch {
    return 0;
  }
};

export const clearRegexMapping = async (pattern: string, component: string): Promise<number> => {
  try {
    const result = await AppDataSource.query(
      `UPDATE launches SET component = NULL, jenkins_status = 'pending' WHERE jenkins_status = 'regex_mapped' AND jenkins_team IS NULL AND name ~* $1 AND component = $2`,
      [pattern, component],
    );
    return result[1] ?? 0;
  } catch {
    return 0;
  }
};

export const getMatchCountForPattern = async (
  pattern: string,
  includeDeleted = false,
): Promise<{ launches: number; names: number }> => {
  const baseWhere = includeDeleted
    ? 'l.component IS NULL AND l.jenkins_team IS NULL'
    : "l.component IS NULL AND l.jenkins_team IS NULL AND l.jenkins_status NOT IN ('job_deleted', 'not_found')";
  const launchCount = await AppDataSource.getRepository('Launch')
    .createQueryBuilder('l')
    .where(baseWhere)
    .andWhere('l.name ~* :pattern', { pattern })
    .getCount();
  const nameResult = await AppDataSource.getRepository('Launch')
    .createQueryBuilder('l')
    .select('COUNT(DISTINCT l.name)', 'count')
    .where(baseWhere)
    .andWhere('l.name ~* :pattern', { pattern })
    .getRawOne();
  return { launches: launchCount, names: parseInt(nameResult?.count ?? '0', 10) };
};

export const getMatchingLaunchNames = async (
  pattern: string,
  limit = 20,
  includeDeleted = false,
): Promise<string[]> => {
  const baseWhere = includeDeleted
    ? 'l.component IS NULL AND l.jenkins_team IS NULL'
    : "l.component IS NULL AND l.jenkins_team IS NULL AND l.jenkins_status NOT IN ('job_deleted', 'not_found')";
  const rows = await AppDataSource.getRepository('Launch')
    .createQueryBuilder('l')
    .select('DISTINCT l.name', 'name')
    .where(baseWhere)
    .andWhere('l.name ~* :pattern', { pattern })
    .orderBy('l.name', 'ASC')
    .limit(limit)
    .getRawMany();
  return rows.map((r: { name: string }) => r.name);
};
