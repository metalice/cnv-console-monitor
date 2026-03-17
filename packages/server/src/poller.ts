import { fetchLaunches, fetchLaunchById, extractAttribute, RPLaunch } from './clients/reportportal';
import { upsertLaunch, LaunchRecord, TestItemRecord, getLaunchesWithFailedEnrichment, getLaunchesPendingEnrichment } from './db/store';
import { logger } from './logger';
import { enrichLaunchFromJenkins } from './poller-enrichment';
import { fetchFailedItemsForLaunch } from './poller-backfill';
import { updatePollProgress, isPollCancelled } from './pollLock';
import { broadcast } from './ws';
export { backfillTestItems, refreshLaunchTestItems } from './poller-backfill';

const log = logger.child({ module: 'Poller' });
const JENKINS_CONCURRENCY = 3;
const JENKINS_BATCH_DELAY_MS = 500;
let activePollId = 0;

const emitProgress = (channel: string, phase: string, current: number, total: number, message: string): void => {
  if (channel === 'poll-progress') updatePollProgress(activePollId, { phase, current, total, message });
  broadcast(channel, { phase, current, total, message });
};

export type PollResult = {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
};

const parseArtifactsUrl = (description?: string): string | undefined => {
  if (!description) return undefined;
  const match = description.match(/\[Artifacts Link\]\((https?:\/\/[^\s)]+)\)/);
  return match?.[1];
};

const parseClusterFromHosts = (hosts?: string): string | undefined => {
  if (!hosts) return undefined;
  const match = hosts.match(/cluster-name-([^\s.]+)/);
  return match ? match[1] : hosts.trim();
};

const parseLaunchRecord = (rpLaunch: RPLaunch): LaunchRecord => {
  const attrs = rpLaunch.attributes;
  const execs = rpLaunch.statistics.executions;
  const artifactsUrl = parseArtifactsUrl(rpLaunch.description);

  return {
    rp_id: rpLaunch.id,
    uuid: rpLaunch.uuid,
    name: rpLaunch.name,
    number: rpLaunch.number,
    status: rpLaunch.status,
    cnv_version: extractAttribute(attrs, 'CNV_XY_VER') || extractAttribute(attrs, 'VERSION'),
    bundle: extractAttribute(attrs, 'BUNDLE'),
    ocp_version: extractAttribute(attrs, 'OCP'),
    tier: extractAttribute(attrs, 'TIER'),
    cluster_name: extractAttribute(attrs, 'CLUSTER_NAME') || parseClusterFromHosts(extractAttribute(attrs, 'HOSTS')),
    total: execs.total || 0,
    passed: execs.passed || 0,
    failed: execs.failed || 0,
    skipped: execs.skipped || 0,
    start_time: rpLaunch.startTime,
    end_time: rpLaunch.endTime,
    duration: rpLaunch.approximateDuration,
    artifacts_url: artifactsUrl,
  };
};

export const pollReportPortal = async (lookbackHours: number, fetchDetails: boolean, pollId: number): Promise<PollResult> => {
  activePollId = pollId;
  const sinceTime = Date.now() - lookbackHours * 60 * 60 * 1000;
  log.info({ since: new Date(sinceTime).toISOString(), fetchDetails, pollId }, 'Fetching launches');
  emitProgress('poll-progress', 'fetching', 0, 0, 'Connecting to ReportPortal...');

  const allLaunches: LaunchRecord[] = [];
  const allFailedItems = new Map<number, TestItemRecord[]>();
  let page = 1;
  let totalPages = 1;
  let totalElements = 0;

  while (page <= totalPages) {
    if (isPollCancelled()) {
      emitProgress('poll-progress', 'cancelled', allLaunches.length, totalElements, 'Poll cancelled');
      break;
    }
    const result = await fetchLaunches({ sinceTime, pageSize: 50, page });
    totalPages = result.page.totalPages;
    totalElements = result.page.totalElements;

    for (const rpLaunch of result.content) {
      if (isPollCancelled()) break;
      const launch = parseLaunchRecord(rpLaunch);
      await upsertLaunch(launch);
      allLaunches.push(launch);

      if (fetchDetails && (launch.failed > 0 || launch.status === 'FAILED')) {
        const items = await fetchFailedItemsForLaunch(rpLaunch.id);
        allFailedItems.set(rpLaunch.id, items);
      }
    }
    emitProgress('poll-progress', 'fetching', allLaunches.length, totalElements, `Fetched ${allLaunches.length} of ${totalElements} launches`);
    page++;
  }

  emitProgress('poll-progress', 'complete', totalElements, totalElements, `Poll complete — ${allLaunches.length} launches`);
  log.info({ launches: allLaunches.length, withFailures: allFailedItems.size }, 'Poll complete');
  return { launches: allLaunches, failedItems: allFailedItems, timestamp: new Date() };
};

const JENKINS_RESULT_MAP: Record<string, string> = {
  SUCCESS: 'PASSED', FAILURE: 'FAILED', ABORTED: 'INTERRUPTED', UNSTABLE: 'FAILED', NOT_BUILT: 'STOPPED',
};

const checkJenkinsResult = async (artifactsUrl: string): Promise<string | null> => {
  try {
    const axios = (await import('axios')).default;
    const https = await import('https');
    const { config } = await import('./config');
    const buildUrl = artifactsUrl.replace(/\/artifact\/?$/, '/api/json?tree=result');
    const requestConfig: Record<string, unknown> = { httpsAgent: new https.Agent({ rejectUnauthorized: false }), timeout: 10000 };
    if (config.jenkins.user && config.jenkins.token) requestConfig.auth = { username: config.jenkins.user, password: config.jenkins.token };
    const response = await axios.get(buildUrl, requestConfig);
    const jenkinsResult = response.data?.result;
    return jenkinsResult ? (JENKINS_RESULT_MAP[jenkinsResult] ?? 'INTERRUPTED') : null;
  } catch { return null; }
};

export const refreshStaleInProgress = async (): Promise<number> => {
  const staleMs = Date.now() - 24 * 60 * 60 * 1000;
  const { AppDataSource } = await import('./db/data-source');
  const repo = AppDataSource.getRepository('Launch');
  const staleRows = await repo.createQueryBuilder('l')
    .where("l.status = 'IN_PROGRESS'").andWhere('l.start_time < :staleMs', { staleMs })
    .getMany() as Array<{ rp_id: number; name: string; artifacts_url: string | null }>;
  if (staleRows.length === 0) return 0;
  log.info({ count: staleRows.length }, 'Refreshing stale IN_PROGRESS launches');
  let updated = 0;
  for (const row of staleRows) {
    try {
      const rpLaunch = await fetchLaunchById(row.rp_id);
      if (rpLaunch.status !== 'IN_PROGRESS') {
        await repo.update({ rp_id: row.rp_id }, {
          status: rpLaunch.status, end_time: rpLaunch.endTime ?? null,
          total: rpLaunch.statistics.executions.total ?? 0, passed: rpLaunch.statistics.executions.passed ?? 0,
          failed: rpLaunch.statistics.executions.failed ?? 0, skipped: rpLaunch.statistics.executions.skipped ?? 0,
        });
        updated++;
        continue;
      }
    } catch { /* RP unreachable */ }
    if (row.artifacts_url) {
      const jenkinsStatus = await checkJenkinsResult(row.artifacts_url);
      if (jenkinsStatus) {
        await repo.update({ rp_id: row.rp_id }, { status: jenkinsStatus });
        updated++;
        log.info({ rpId: row.rp_id, name: row.name, status: jenkinsStatus }, 'Updated from Jenkins result');
      }
    }
  }
  log.info({ updated, total: staleRows.length }, 'Stale IN_PROGRESS refresh complete');
  return updated;
};

export type EnrichmentResult = { total: number; succeeded: number; failed: number; noUrl: number };

export const enrichLaunchesFromJenkins = async (launchList: LaunchRecord[]): Promise<EnrichmentResult> => {
  const withArtifacts = launchList.filter((launch) => launch.artifacts_url);
  const withoutArtifacts = launchList.length - withArtifacts.length;

  for (const launch of launchList.filter((item) => !item.artifacts_url)) {
    launch.jenkins_status = 'no_url';
    await upsertLaunch(launch);
  }

  if (withArtifacts.length === 0) {
    emitProgress('jenkins-progress', 'complete', 0, 0, 'No launches with Jenkins URLs');
    return { total: launchList.length, succeeded: 0, failed: 0, noUrl: withoutArtifacts };
  }

  log.info({ total: withArtifacts.length }, 'Starting Jenkins enrichment');
  let processed = 0;
  let succeeded = 0;
  let authRequired = 0;
  let notFound = 0;
  let errored = 0;

  for (let idx = 0; idx < withArtifacts.length; idx += JENKINS_CONCURRENCY) {
    const batch = withArtifacts.slice(idx, idx + JENKINS_CONCURRENCY);
    await Promise.all(batch.map(async (launch) => {
      await enrichLaunchFromJenkins(launch);
      await upsertLaunch(launch);
      if (launch.jenkins_status === 'success') succeeded++;
      else if (launch.jenkins_status === 'auth_required') authRequired++;
      else if (launch.jenkins_status === 'not_found') notFound++;
      else errored++;
    }));
    processed += batch.length;
    const parts = [`${succeeded} enriched`];
    if (authRequired > 0) parts.push(`${authRequired} auth`);
    if (notFound > 0) parts.push(`${notFound} deleted`);
    if (errored > 0) parts.push(`${errored} errors`);
    emitProgress('jenkins-progress', 'enriching', processed, withArtifacts.length,
      `Jenkins: ${processed}/${withArtifacts.length} (${parts.join(', ')})`);
    if (idx + JENKINS_CONCURRENCY < withArtifacts.length) {
      await new Promise((resolve) => setTimeout(resolve, JENKINS_BATCH_DELAY_MS));
    }
  }

  const message = `Jenkins complete — ${succeeded} enriched, ${notFound} deleted, ${authRequired} auth required, ${errored} errors`;
  emitProgress('jenkins-progress', 'complete', withArtifacts.length, withArtifacts.length, message);
  log.info({ succeeded, authRequired, notFound, errored, noUrl: withoutArtifacts }, 'Jenkins enrichment complete');
  return { total: launchList.length, succeeded, failed: errored + authRequired + notFound, noUrl: withoutArtifacts };
};

export const enrichRemainingLaunches = async (): Promise<EnrichmentResult> => {
  const [pending, failed] = await Promise.all([
    getLaunchesPendingEnrichment(50000),
    getLaunchesWithFailedEnrichment(50000),
  ]);
  const allLaunches = [...pending, ...failed];
  if (allLaunches.length === 0) return { total: 0, succeeded: 0, failed: 0, noUrl: 0 };
  log.info({ pending: pending.length, failed: failed.length }, 'Enriching remaining launches');
  return enrichLaunchesFromJenkins(allLaunches);
};
