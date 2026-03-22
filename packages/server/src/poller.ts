import { fetchLaunches, fetchLaunchById, extractAttribute, RPLaunch } from './clients/reportportal';
import { upsertLaunch, LaunchRecord, TestItemRecord, getLaunchesWithFailedEnrichment, getLaunchesPendingEnrichment } from './db/store';
import { logger } from './logger';
import { enrichLaunchFromJenkins } from './poller-enrichment';
import { fetchFailedItemsForLaunch } from './poller-backfill';
import { updatePollProgress, isPollCancelled, addFailedItemLaunch, setLastPollSummary, getFailedItemLaunches, isJenkinsCancelled, resetJenkinsCancelled, type PollSummary, type PollPhaseSummary } from './pollLock';
import { broadcast } from './ws';
import { getErrorInfo, setGlobalRetryCounter } from './utils/retry';
export { backfillTestItems, refreshLaunchTestItems, fetchAllItemsForLaunch } from './poller-backfill';

import { config } from './config';

const log = logger.child({ module: 'Poller' });
const JENKINS_BATCH_DELAY_MS = 50;
let activePollId = 0;

let phaseStartedAt = 0;

const emitProgress = (channel: string, phase: string, current: number, total: number, message: string): void => {
  if (channel === 'poll-progress') updatePollProgress(activePollId, { phase, current, total, message });
  broadcast(channel, { phase, current, total, message, startedAt: phaseStartedAt || activePollId });
};

export type PollResult = {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
  startedAt: number;
  launchStats: PollPhaseSummary;
  itemStats: PollPhaseSummary;
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
  let retryCount = 0;
  let errorCount = 0;
  const errorReasons = new Map<string, number>();
  setGlobalRetryCounter(() => { retryCount++; });

  const trackError = (err: unknown) => {
    errorCount++;
    const info = getErrorInfo(err);
    const reason = info.status ? `HTTP ${info.status}` : info.code || 'Network error';
    errorReasons.set(reason, (errorReasons.get(reason) || 0) + 1);
  };

  const statusParts = () => {
    const parts: string[] = [];
    if (retryCount > 0) parts.push(`${retryCount} retries`);
    if (errorCount > 0) parts.push(`${errorCount} errors`);
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  // ── Phase 1: Fetch all launches (metadata only) ──
  phaseStartedAt = Date.now();
  while (page <= totalPages) {
    if (isPollCancelled()) {
      emitProgress('poll-progress', 'cancelled', allLaunches.length, totalElements, 'Poll cancelled');
      break;
    }
    let result;
    try {
      result = await fetchLaunches({ sinceTime, pageSize: config.schedule.rpPageSize, page });
    } catch (err: unknown) {
      const info = getErrorInfo(err);
      if (info.status === 401) {
        log.error('ReportPortal returned 401 Unauthorized — check your API token. Stopping poll.');
        emitProgress('poll-progress', 'error', allLaunches.length, totalElements, 'Authentication failed (401) — check RP token');
        break;
      }
      throw err;
    }
    totalPages = result.page.totalPages;
    totalElements = result.page.totalElements;

    for (const rpLaunch of result.content) {
      const launch = parseLaunchRecord(rpLaunch);
      await upsertLaunch(launch);
      allLaunches.push(launch);
      emitProgress('poll-progress', 'fetching', allLaunches.length, totalElements, `Fetching launches ${allLaunches.length} / ${totalElements}${statusParts()}`);
    }
    page++;
  }

  if (isPollCancelled()) {
    setGlobalRetryCounter(null);
    return { launches: allLaunches, failedItems: allFailedItems, timestamp: new Date(), startedAt: pollId, launchStats: { total: totalElements, succeeded: allLaunches.length, failed: 0, errors: {} }, itemStats: { total: 0, succeeded: 0, failed: 0, errors: {} } };
  }

  // ── Phase 2: Fetch failed test items for launches with failures ──
  if (fetchDetails) {
    const needItems = allLaunches
      .filter(l => l.failed > 0 || l.status === 'FAILED')
      .map(l => ({ rpId: l.rp_id, name: l.name }));

    if (needItems.length > 0) {
      log.info({ count: needItems.length }, 'Phase 2: Fetching failed test items');
      phaseStartedAt = Date.now();
      let itemsDone = 0;

      for (let i = 0; i < needItems.length; i += config.schedule.rpConcurrency) {
        if (isPollCancelled()) break;
        const batch = needItems.slice(i, i + config.schedule.rpConcurrency);
        const results = await Promise.all(batch.map(async ({ rpId, name }) => {
          try {
            return { rpId, items: await fetchFailedItemsForLaunch(rpId) };
          } catch (err) {
            trackError(err);
            const info = getErrorInfo(err);
            const reason = info.status ? `HTTP ${info.status}` : info.code || 'Network error';
            addFailedItemLaunch(rpId, name, reason);
            log.warn({ rpId, err }, 'Failed to fetch items for launch');
            return { rpId, items: [] as TestItemRecord[] };
          }
        }));
        for (const { rpId, items } of results) {
          if (items.length > 0) allFailedItems.set(rpId, items);
        }
        itemsDone += batch.length;
        emitProgress('poll-progress', 'items', itemsDone, needItems.length, `Fetching test items ${itemsDone} / ${needItems.length} launches${statusParts()}`);
      }
    }
  }

  const errorSummary = errorReasons.size > 0
    ? ` — errors: ${[...errorReasons.entries()].map(([reason, count]) => `${reason}: ${count}`).join(', ')}`
    : '';
  setGlobalRetryCounter(null);
  const completeMsg = `Poll complete — ${allLaunches.length} launches, ${allFailedItems.size} with items${retryCount > 0 ? `, ${retryCount} retries` : ''}${errorSummary}`;
  emitProgress('poll-progress', 'complete', totalElements, totalElements, completeMsg);
  log.info({ launches: allLaunches.length, withFailures: allFailedItems.size, retries: retryCount, errors: errorCount, errorReasons: Object.fromEntries(errorReasons) }, 'Poll complete');

  const failedItemsList = getFailedItemLaunches();
  const itemErrors: Record<string, number> = {};
  for (const f of failedItemsList) itemErrors[f.error] = (itemErrors[f.error] || 0) + 1;
  const needItems = allLaunches.filter(l => l.failed > 0 || l.status === 'FAILED');

  return {
    launches: allLaunches,
    failedItems: allFailedItems,
    timestamp: new Date(),
    startedAt: pollId,
    launchStats: { total: totalElements, succeeded: allLaunches.length, failed: totalElements - allLaunches.length, errors: Object.fromEntries(errorReasons) },
    itemStats: { total: needItems.length, succeeded: needItems.length - failedItemsList.length, failed: failedItemsList.length, errors: itemErrors },
  };
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

export type EnrichmentResult = { total: number; succeeded: number; failed: number; noUrl: number; authRequired: number; deleted: number; pruned: number; errorReasons: Record<string, number> };

export const enrichLaunchesFromJenkins = async (launchList: LaunchRecord[]): Promise<EnrichmentResult> => {
  const withArtifacts = launchList.filter((launch) => launch.artifacts_url);
  const withoutArtifacts = launchList.length - withArtifacts.length;

  for (const launch of launchList.filter((item) => !item.artifacts_url)) {
    launch.jenkins_status = 'no_url';
    await upsertLaunch(launch);
  }

  if (withArtifacts.length === 0) {
    emitProgress('jenkins-progress', 'complete', 0, 0, 'No launches with Jenkins URLs');
    return { total: launchList.length, succeeded: 0, failed: 0, noUrl: withoutArtifacts, authRequired: 0, deleted: 0, pruned: 0, errorReasons: {} };
  }

  log.info({ total: withArtifacts.length }, 'Starting Jenkins enrichment');
  resetJenkinsCancelled();
  let processed = 0;
  let succeeded = 0;
  let authRequired = 0;
  let notFound = 0;
  let errored = 0;
  const errorReasons = new Map<string, number>();

  for (let idx = 0; idx < withArtifacts.length; idx += config.schedule.jenkinsConcurrency) {
    if (isJenkinsCancelled()) {
      log.info({ processed }, 'Jenkins enrichment cancelled');
      emitProgress('jenkins-progress', 'cancelled', processed, withArtifacts.length, 'Jenkins enrichment cancelled');
      break;
    }
    const batch = withArtifacts.slice(idx, idx + config.schedule.jenkinsConcurrency);
    await Promise.all(batch.map(async (launch) => {
      const error = await enrichLaunchFromJenkins(launch);
      await upsertLaunch(launch);
      if (launch.jenkins_status === 'success' || launch.jenkins_status === 'build_pruned') succeeded++;
      else if (launch.jenkins_status === 'auth_required') authRequired++;
      else if (launch.jenkins_status === 'not_found') notFound++;
      else if (launch.jenkins_status === 'failed') {
        errored++;
        const reason = error || 'Unknown';
        const short = reason.includes('timeout') ? 'Timeout' : reason.includes('ECONNRE') ? 'Connection reset' : reason.includes('ECONNREFUSED') ? 'Connection refused' : reason.length > 30 ? reason.substring(0, 30) : reason;
        errorReasons.set(short, (errorReasons.get(short) || 0) + 1);
      }
    }));
    processed += batch.length;
    const parts = [`${succeeded} enriched`];
    if (authRequired > 0) parts.push(`${authRequired} auth required`);
    if (notFound > 0) parts.push(`${notFound} deleted`);
    if (errored > 0) {
      const reasons = [...errorReasons.entries()].map(([r, c]) => `${r}: ${c}`).join(', ');
      parts.push(`${errored} errors (${reasons})`);
    }
    emitProgress('jenkins-progress', 'enriching', processed, withArtifacts.length,
      `Jenkins: ${processed}/${withArtifacts.length} (${parts.join(', ')})`);
    if (idx + config.schedule.jenkinsConcurrency < withArtifacts.length) {
      await new Promise((resolve) => setTimeout(resolve, JENKINS_BATCH_DELAY_MS));
    }
  }

  const errorDetail = errorReasons.size > 0 ? ` (${[...errorReasons.entries()].map(([r, c]) => `${r}: ${c}`).join(', ')})` : '';
  const message = `Jenkins complete — ${succeeded} enriched, ${notFound} deleted, ${authRequired} auth required, ${errored} errors${errorDetail}`;
  emitProgress('jenkins-progress', 'complete', withArtifacts.length, withArtifacts.length, message);
  log.info({ succeeded, authRequired, notFound, errored, noUrl: withoutArtifacts }, 'Jenkins enrichment complete');
  return { total: launchList.length, succeeded, failed: errored, noUrl: withoutArtifacts, authRequired, deleted: notFound, pruned: 0, errorReasons: Object.fromEntries(errorReasons) };
};

export const enrichRemainingLaunches = async (): Promise<EnrichmentResult> => {
  const [pending, failed] = await Promise.all([
    getLaunchesPendingEnrichment(50000),
    getLaunchesWithFailedEnrichment(50000),
  ]);
  const allLaunches = [...pending, ...failed];
  if (allLaunches.length === 0) return { total: 0, succeeded: 0, failed: 0, noUrl: 0, authRequired: 0, deleted: 0, pruned: 0, errorReasons: {} };
  log.info({ pending: pending.length, failed: failed.length }, 'Enriching remaining launches');
  return enrichLaunchesFromJenkins(allLaunches);
};
