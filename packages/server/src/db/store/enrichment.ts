import { IsNull } from 'typeorm';

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

export type EnrichmentStats = {
  success: number;
  mapped: number;
  failed: number;
  pending: number;
  noUrl: number;
  notFound: number;
  authRequired: number;
};

export const getEnrichmentStats = async (): Promise<EnrichmentStats> => {
  const rows = await launches()
    .createQueryBuilder('l')
    .select('l.jenkins_status', 'status')
    .addSelect('COUNT(*)', 'count')
    .groupBy('l.jenkins_status')
    .getRawMany();
  const stats: EnrichmentStats = {
    authRequired: 0,
    failed: 0,
    mapped: 0,
    notFound: 0,
    noUrl: 0,
    pending: 0,
    success: 0,
  };
  for (const row of rows) {
    const count = parseInt(row.count, 10);
    if (row.status === 'success') {
      stats.success = count;
    } else if (row.status === 'mapped') {
      stats.mapped = count;
    } else if (row.status === 'failed') {
      stats.failed = count;
    } else if (row.status === 'no_url') {
      stats.noUrl = count;
    } else if (row.status === 'not_found') {
      stats.notFound = count;
    } else if (row.status === 'auth_required') {
      stats.authRequired = count;
    } else if (row.status === 'job_deleted') {
      stats.notFound += count;
    } else if (row.status === 'build_pruned') {
      stats.success += count;
    } else if (row.status === 'regex_mapped') {
      stats.mapped += count;
    } else {
      stats.pending += count;
    }
  }
  return stats;
};

export const getLaunchesWithFailedEnrichment = async (limit = 500): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    order: { start_time: 'DESC' },
    take: limit,
    where: { jenkins_status: 'failed' },
  });
  return rows.map(toLaunchRecord);
};

export const getLaunchesPendingEnrichment = async (limit = 50000): Promise<LaunchRecord[]> => {
  const rows = await launches().find({
    order: { start_time: 'DESC' },
    take: limit,
    where: { jenkins_status: 'pending' },
  });
  return rows.map(toLaunchRecord);
};

export const getDistinctJenkinsTeams = async (): Promise<string[]> => {
  const rows = await launches()
    .createQueryBuilder('l')
    .select('DISTINCT l.jenkins_team', 'jenkins_team')
    .where('l.jenkins_team IS NOT NULL')
    .orderBy('l.jenkins_team', 'ASC')
    .getRawMany();
  return rows.map((row: { jenkins_team: string }) => row.jenkins_team);
};

export const updateComponentByJenkinsTeam = async (
  jenkinsTeam: string,
  component: string,
): Promise<number> => {
  const result = await launches().update({ jenkins_team: jenkinsTeam }, { component });
  return result.affected ?? 0;
};

export const backfillComponentFromSiblings = async (): Promise<number> => {
  const componentResult = await AppDataSource.query(`
    UPDATE launches target
    SET component = source.component
    FROM (
      SELECT DISTINCT name, component
      FROM launches
      WHERE component IS NOT NULL
    ) source
    WHERE target.name = source.name
      AND target.component IS NULL
  `);
  const siblingCount = componentResult[1] ?? 0;

  let regexCount = 0;
  try {
    const { resolveComponent } = await import('../../componentMap');
    const unmapped = await launches().find({
      select: ['rp_id', 'name', 'jenkins_team'],
      where: { component: IsNull() },
    });
    for (const launch of unmapped) {
      const resolved = resolveComponent(launch.jenkins_team, launch.name);
      if (resolved) {
        await launches().update({ rp_id: launch.rp_id }, { component: resolved });
        regexCount++;
      }
    }
  } catch {
    /* Mapping cache not ready */
  }

  await AppDataSource.query(`
    UPDATE launches
    SET jenkins_status = 'mapped'
    WHERE jenkins_status IN ('pending', 'failed', 'not_found', 'auth_required')
      AND component IS NOT NULL
      AND tier IS NOT NULL
      AND tier != '-'
  `);

  return siblingCount + regexCount;
};
