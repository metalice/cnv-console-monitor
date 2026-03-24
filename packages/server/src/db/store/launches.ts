import { IsNull, MoreThanOrEqual } from 'typeorm';

import { AppDataSource } from '../data-source';
import { Launch } from '../entities/Launch';

import type { LaunchRecord } from './types';

const launches = () => AppDataSource.getRepository(Launch);

const toLaunchRecord = (row: Launch): LaunchRecord => ({
  artifacts_url: row.artifacts_url ?? undefined,
  bundle: row.bundle ?? undefined,
  cluster_name: row.cluster_name ?? undefined,
  cnv_version: row.cnv_version ?? undefined,
  component: row.component ?? undefined,
  duration: row.duration ?? undefined,
  end_time: row.end_time ?? undefined,
  failed: row.failed,
  jenkins_metadata: row.jenkins_metadata ?? undefined,
  jenkins_status: row.jenkins_status ?? undefined,
  jenkins_team: row.jenkins_team ?? undefined,
  name: row.name,
  number: row.number,
  ocp_version: row.ocp_version ?? undefined,
  passed: row.passed,
  rp_id: row.rp_id,
  skipped: row.skipped,
  start_time: row.start_time,
  status: row.status,
  tier: row.tier ?? undefined,
  total: row.total,
  uuid: row.uuid,
});

export const upsertLaunch = async (launch: LaunchRecord): Promise<void> => {
  const repo = launches();
  const existing = await repo.findOneBy({ rp_id: launch.rp_id });
  const entity = existing ?? repo.create({ rp_id: launch.rp_id });

  entity.uuid = launch.uuid;
  entity.name = launch.name;
  entity.number = launch.number;
  entity.status = launch.status;
  entity.cnv_version = launch.cnv_version ?? null;
  entity.bundle = launch.bundle ?? null;
  entity.ocp_version = launch.ocp_version ?? null;
  entity.tier = launch.tier ?? null;
  entity.cluster_name = launch.cluster_name ?? null;
  entity.total = launch.total;
  entity.passed = launch.passed;
  entity.failed = launch.failed;
  entity.skipped = launch.skipped;
  entity.start_time = launch.start_time;
  entity.end_time = launch.end_time ?? null;
  entity.duration = launch.duration ?? null;
  entity.artifacts_url = launch.artifacts_url ?? null;
  entity.component = launch.component ?? null;
  entity.jenkins_team = launch.jenkins_team ?? null;
  entity.jenkins_metadata = launch.jenkins_metadata ?? null;
  entity.jenkins_status = launch.jenkins_status ?? 'pending';

  await repo.save(entity);
};

export const getLaunchesSince = async (sinceMs: number): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    order: { start_time: 'DESC' },
    where: { start_time: MoreThanOrEqual(sinceMs) },
  });
  return rows.map(toLaunchRecord);
};

export const getLaunchesInRange = async (
  sinceMs: number,
  untilMs: number,
  components?: string[],
): Promise<LaunchRecord[]> => {
  const queryBuilder = launches()
    .createQueryBuilder('l')
    .where('l.start_time >= :sinceMs', { sinceMs })
    .andWhere('l.start_time < :untilMs', { untilMs });
  if (components && components.length > 0) {
    queryBuilder.andWhere('l.component IN (:...components)', { components });
  }
  const rows = await queryBuilder.orderBy('l.start_time', 'DESC').getMany();
  return rows.map(toLaunchRecord);
};

export const getLastPassedLaunchTime = async (launchName: string): Promise<number | null> => {
  const row = await launches().findOne({
    order: { start_time: 'DESC' },
    where: { name: launchName, status: 'PASSED' },
  });
  return row ? row.start_time : null;
};

export const getLaunchByRpId = async (rpId: number): Promise<LaunchRecord | undefined> => {
  const row = await launches().findOneBy({ rp_id: rpId });
  return row ? toLaunchRecord(row) : undefined;
};

export const getLaunchCount = async (): Promise<number> => launches().count();

export const getDistinctComponents = async (): Promise<string[]> => {
  const rows = await launches()
    .createQueryBuilder('l')
    .select('DISTINCT l.component', 'component')
    .where('l.component IS NOT NULL')
    .orderBy('l.component', 'ASC')
    .getRawMany();
  return rows.map((r: { component: string }) => r.component);
};

export const getLaunchesWithoutComponent = async (limit = 500): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    order: { start_time: 'DESC' },
    take: limit,
    where: { component: IsNull() },
  });
  return rows.map(toLaunchRecord);
};

export const getAllLaunchesForRemap = async (
  batchSize = 500,
  offset = 0,
): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    order: { start_time: 'DESC' },
    skip: offset,
    take: batchSize,
  });
  return rows.map(toLaunchRecord);
};

export const updateLaunchComponent = async (rpId: number, component: string): Promise<void> => {
  await launches().update({ rp_id: rpId }, { component });
};

export const clearAllLaunches = async (): Promise<void> => {
  await launches().clear();
};

export const getMostRecentLaunchTime = async (): Promise<number | null> => {
  const row = await launches().findOne({
    order: { start_time: 'DESC' },
    select: ['start_time'],
    where: {},
  });
  return row?.start_time ?? null;
};
