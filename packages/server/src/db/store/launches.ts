import { MoreThanOrEqual, IsNull } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Launch } from '../entities/Launch';
import type { LaunchRecord } from './types';

const launches = () => AppDataSource.getRepository(Launch);

const toLaunchRecord = (row: Launch): LaunchRecord => {
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
    component: row.component ?? undefined,
  };
}

export const upsertLaunch = async (launch: LaunchRecord): Promise<void> => {
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
      component: launch.component ?? null,
    },
    { conflictPaths: ['rp_id'], skipUpdateIfNoValuesChanged: true },
  );
}

export const getLaunchesSince = async (sinceMs: number): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    where: { start_time: MoreThanOrEqual(sinceMs) },
    order: { start_time: 'DESC' },
  });
  return rows.map(toLaunchRecord);
}

export const getLaunchesInRange = async (sinceMs: number, untilMs: number): Promise<LaunchRecord[]> => {
  const rows = await launches()
    .createQueryBuilder('l')
    .where('l.start_time >= :sinceMs', { sinceMs })
    .andWhere('l.start_time < :untilMs', { untilMs })
    .orderBy('l.start_time', 'DESC')
    .getMany();
  return rows.map(toLaunchRecord);
}

export const getLastPassedLaunchTime = async (launchName: string): Promise<number | null> => {
  const row = await launches().findOne({
    where: { name: launchName, status: 'PASSED' },
    order: { start_time: 'DESC' },
  });
  return row ? Number(row.start_time) : null;
}

export const getLaunchByRpId = async (rpId: number): Promise<LaunchRecord | undefined> => {
  const row = await launches().findOneBy({ rp_id: rpId });
  return row ? toLaunchRecord(row) : undefined;
}

export const getLaunchCount = async (): Promise<number> => {
  return launches().count();
}

export const getDistinctComponents = async (): Promise<string[]> => {
  const rows = await launches()
    .createQueryBuilder('l')
    .select('DISTINCT l.component', 'component')
    .where('l.component IS NOT NULL')
    .orderBy('l.component', 'ASC')
    .getRawMany();
  return rows.map((r: { component: string }) => r.component);
}

export const getLaunchesWithoutComponent = async (limit = 500): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    where: { component: IsNull() },
    order: { start_time: 'DESC' },
    take: limit,
  });
  return rows.map(toLaunchRecord);
}

export const updateLaunchComponent = async (rpId: number, component: string): Promise<void> => {
  await launches().update({ rp_id: rpId }, { component });
}

