import {
  fetchLaunches,
  extractAttribute,
  RPLaunch,
} from './clients/reportportal';
import { upsertLaunch, LaunchRecord, TestItemRecord } from './db/store';
import { logger } from './logger';
import { enrichLaunchFromJenkins } from './poller-enrichment';
import { fetchFailedItemsForLaunch } from './poller-backfill';

export { backfillComponents } from './poller-enrichment';
export { backfillTestItems, refreshLaunchTestItems } from './poller-backfill';

const log = logger.child({ module: 'Poller' });

export type PollResult = {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
};

const parseArtifactsUrl = (description?: string): string | undefined => {
  if (!description) return undefined;
  const match = description.match(/\[Artifacts Link\]\((https?:\/\/[^\s)]+)\)/);
  return match?.[1];
}

const parseClusterFromHosts = (hosts?: string): string | undefined => {
  if (!hosts) return undefined;
  const match = hosts.match(/cluster-name-([^\s.]+)/);
  return match ? match[1] : hosts.trim();
}

const parseLaunchRecord = (launch: RPLaunch): LaunchRecord => {
  const attrs = launch.attributes;
  const execs = launch.statistics.executions;
  const artifactsUrl = parseArtifactsUrl(launch.description);

  return {
    rp_id: launch.id,
    uuid: launch.uuid,
    name: launch.name,
    number: launch.number,
    status: launch.status,
    cnv_version: extractAttribute(attrs, 'CNV_XY_VER') || extractAttribute(attrs, 'VERSION'),
    bundle: extractAttribute(attrs, 'BUNDLE'),
    ocp_version: extractAttribute(attrs, 'OCP'),
    tier: extractAttribute(attrs, 'TIER'),
    cluster_name: extractAttribute(attrs, 'CLUSTER_NAME') || parseClusterFromHosts(extractAttribute(attrs, 'HOSTS')),
    total: execs.total || 0,
    passed: execs.passed || 0,
    failed: execs.failed || 0,
    skipped: execs.skipped || 0,
    start_time: launch.startTime,
    end_time: launch.endTime,
    duration: launch.approximateDuration,
    artifacts_url: artifactsUrl,
  };
}

export const pollReportPortal = async (lookbackHours = 24, fetchDetails = true): Promise<PollResult> => {
  const sinceTime = Date.now() - lookbackHours * 60 * 60 * 1000;
  log.info({ since: new Date(sinceTime).toISOString(), fetchDetails }, 'Fetching all launches');

  const allLaunches: LaunchRecord[] = [];
  const allFailedItems = new Map<number, TestItemRecord[]>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchLaunches({ sinceTime, pageSize: 50, page });
    totalPages = result.page.totalPages;

    if (page === 1) {
      log.info({ totalElements: result.page.totalElements, totalPages }, 'RP response');
    }

    for (const rpLaunch of result.content) {
      const launch = parseLaunchRecord(rpLaunch);
      await enrichLaunchFromJenkins(launch);
      await upsertLaunch(launch);
      allLaunches.push(launch);

      if (fetchDetails && (launch.failed > 0 || launch.status === 'FAILED')) {
        const failedItems = await fetchFailedItemsForLaunch(rpLaunch.id);
        allFailedItems.set(rpLaunch.id, failedItems);
      }
    }

    if (page % 10 === 0) {
      log.info({ page, totalPages, launchesSoFar: allLaunches.length }, 'Polling progress');
    }
    page++;
  }

  log.info({ launches: allLaunches.length, withFailures: allFailedItems.size }, 'Poll complete');
  return { launches: allLaunches, failedItems: allFailedItems, timestamp: new Date() };
}
