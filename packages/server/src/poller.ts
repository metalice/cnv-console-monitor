import {
  extractAttribute,
  fetchLaunchById,
  fetchLaunches,
  type RPLaunch,
} from './clients/reportportal';
import { toEpochMs } from './clients/reportportal-types';
import { type LaunchRecord, type TestItemRecord, upsertLaunch } from './db/store';
import { getErrorInfo, setGlobalRetryCounter } from './utils/retry';
import { logger } from './logger';
import { fetchFailedItemsForLaunch } from './poller-backfill';
import { enrichLaunchFromJenkins, resolveJenkinsUrl } from './poller-enrichment';
import {
  addFailedItemLaunch,
  getFailedItemLaunches,
  isJenkinsCancelled,
  isPollCancelled,
  type PollPhaseSummary,
  resetJenkinsCancelled,
  updatePollProgress,
} from './pollLock';
import { broadcast } from './ws';
export { fetchAllItemsForLaunch, refreshLaunchTestItems } from './poller-backfill';

import { config } from './config';

const log = logger.child({ module: 'Poller' });
const JENKINS_BATCH_DELAY_MS = 50;
let activePollId = 0;

let phaseStartedAt = 0;

const emitProgress = (
  channel: string,
  phase: string,
  current: number,
  total: number,
  message: string,
): void => {
  if (channel === 'poll-progress') {
    updatePollProgress(activePollId, { current, message, phase, total });
  }
  broadcast(channel, { current, message, phase, startedAt: phaseStartedAt || activePollId, total });
};

type PollResult = {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
  startedAt: number;
  launchStats: PollPhaseSummary;
  itemStats: PollPhaseSummary;
};

const parseArtifactsUrl = (description?: string): string | undefined => {
  if (!description) {
    return undefined;
  }
  const match = /\[Artifacts Link\]\((https?:\/\/[^\s)]+)\)/.exec(description);
  return match?.[1];
};

const parseClusterFromHosts = (hosts?: string): string | undefined => {
  if (!hosts) {
    return undefined;
  }
  const match = /cluster-name-([^\s.]+)/.exec(hosts);
  return match ? match[1] : hosts.trim();
};

const parseLaunchRecord = (rpLaunch: RPLaunch): LaunchRecord => {
  const attrs = rpLaunch.attributes;
  const execs = rpLaunch.statistics.executions;
  const artifactsUrl = parseArtifactsUrl(rpLaunch.description);

  return {
    artifacts_url: artifactsUrl,
    bundle: extractAttribute(attrs, 'BUNDLE'),
    cluster_name:
      extractAttribute(attrs, 'CLUSTER_NAME') ||
      parseClusterFromHosts(extractAttribute(attrs, 'HOSTS')),
    cnv_version: extractAttribute(attrs, 'CNV_XY_VER') || extractAttribute(attrs, 'VERSION'),
    duration: rpLaunch.approximateDuration,
    end_time: rpLaunch.endTime != null ? toEpochMs(rpLaunch.endTime) : undefined,
    failed: execs.failed || 0,
    name: rpLaunch.name,
    number: rpLaunch.number,
    ocp_version: extractAttribute(attrs, 'OCP'),
    passed: execs.passed || 0,
    rp_id: rpLaunch.id,
    skipped: execs.skipped || 0,
    start_time: toEpochMs(rpLaunch.startTime),
    status: rpLaunch.status,
    tier: extractAttribute(attrs, 'TIER'),
    total: execs.total || 0,
    uuid: rpLaunch.uuid,
  };
};

export const pollReportPortal = async (
  lookbackHours: number,
  fetchDetails: boolean,
  pollId: number,
  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<PollResult> => {
  activePollId = pollId;
  const sinceTime = Date.now() - lookbackHours * 60 * 60 * 1000;
  log.info({ fetchDetails, pollId, since: new Date(sinceTime).toISOString() }, 'Fetching launches');
  emitProgress('poll-progress', 'fetching', 0, 0, 'Connecting to ReportPortal...');

  const allLaunches: LaunchRecord[] = [];
  const allFailedItems = new Map<number, TestItemRecord[]>();
  let page = 1;
  let totalPages = 1;
  let totalElements = 0;
  let retryCount = 0;
  let errorCount = 0;
  const errorReasons = new Map<string, number>();
  setGlobalRetryCounter(() => {
    retryCount++;
  });

  const trackError = (err: unknown) => {
    errorCount++;
    const info = getErrorInfo(err);
    const reason = info.status ? `HTTP ${info.status}` : info.code || 'Network error';
    errorReasons.set(reason, (errorReasons.get(reason) || 0) + 1);
  };

  const statusParts = () => {
    const parts: string[] = [];
    if (retryCount > 0) {
      parts.push(`${retryCount} retries`);
    }
    if (errorCount > 0) {
      parts.push(`${errorCount} errors`);
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  // ── Phase 1: Fetch all launches (metadata only) ──
  phaseStartedAt = Date.now();
  while (page <= totalPages) {
    if (isPollCancelled()) {
      emitProgress(
        'poll-progress',
        'cancelled',
        allLaunches.length,
        totalElements,
        'Poll cancelled',
      );
      break;
    }
    let result;
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      result = await fetchLaunches({ page, pageSize: config.schedule.rpPageSize, sinceTime });
    } catch (err: unknown) {
      const info = getErrorInfo(err);
      if (info.status === 401) {
        log.error('ReportPortal returned 401 Unauthorized — check your API token. Stopping poll.');
        emitProgress(
          'poll-progress',
          'error',
          allLaunches.length,
          totalElements,
          'Authentication failed (401) — check RP token',
        );
        break;
      }
      throw err;
    }
    totalPages = result.page.totalPages;
    totalElements = result.page.totalElements;

    for (const rpLaunch of result.content) {
      const launch = parseLaunchRecord(rpLaunch);
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await upsertLaunch(launch);
      allLaunches.push(launch);
      emitProgress(
        'poll-progress',
        'fetching',
        allLaunches.length,
        totalElements,
        `Fetching launches ${allLaunches.length} / ${totalElements}${statusParts()}`,
      );
    }
    page++;
  }

  if (isPollCancelled()) {
    setGlobalRetryCounter(null);
    return {
      failedItems: allFailedItems,
      itemStats: { errors: {}, failed: 0, succeeded: 0, total: 0 },
      launches: allLaunches,
      launchStats: { errors: {}, failed: 0, succeeded: allLaunches.length, total: totalElements },
      startedAt: pollId,
      timestamp: new Date(),
    };
  }

  // ── Phase 2: Fetch failed test items for launches with failures ──
  if (fetchDetails) {
    const needItems = allLaunches
      .filter(launch => launch.failed > 0 || launch.status === 'FAILED')
      .map(launch => ({ name: launch.name, rpId: launch.rp_id }));

    if (needItems.length > 0) {
      log.info({ count: needItems.length }, 'Phase 2: Fetching failed test items');
      phaseStartedAt = Date.now();
      let itemsDone = 0;

      for (let i = 0; i < needItems.length; i += config.schedule.rpConcurrency) {
        if (isPollCancelled()) {
          break;
        }
        const batch = needItems.slice(i, i + config.schedule.rpConcurrency);
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const results = await Promise.all(
          batch.map(async ({ name, rpId }) => {
            try {
              return { items: await fetchFailedItemsForLaunch(rpId), rpId };
            } catch (err) {
              trackError(err);
              const info = getErrorInfo(err);
              const reason = info.status ? `HTTP ${info.status}` : info.code || 'Network error';
              addFailedItemLaunch(rpId, name, reason);
              log.warn({ err, rpId }, 'Failed to fetch items for launch');
              return { items: [] as TestItemRecord[], rpId };
            }
          }),
        );
        for (const { items, rpId } of results) {
          if (items.length > 0) {
            allFailedItems.set(rpId, items);
          }
        }
        itemsDone += batch.length;
        emitProgress(
          'poll-progress',
          'items',
          itemsDone,
          needItems.length,
          `Fetching test items ${itemsDone} / ${needItems.length} launches${statusParts()}`,
        );
      }
    }
  }

  const errorSummary =
    errorReasons.size > 0
      ? ` — errors: ${[...errorReasons.entries()].map(([reason, count]) => `${reason}: ${count}`).join(', ')}`
      : '';
  setGlobalRetryCounter(null);
  const completeMsg = `Poll complete — ${allLaunches.length} launches, ${allFailedItems.size} with items${retryCount > 0 ? `, ${retryCount} retries` : ''}${errorSummary}`;
  emitProgress('poll-progress', 'complete', totalElements, totalElements, completeMsg);
  log.info(
    {
      errorReasons: Object.fromEntries(errorReasons),
      errors: errorCount,
      launches: allLaunches.length,
      retries: retryCount,
      withFailures: allFailedItems.size,
    },
    'Poll complete',
  );

  const failedItemsList = getFailedItemLaunches();
  const itemErrors: Record<string, number> = {};
  for (const failedItem of failedItemsList) {
    itemErrors[failedItem.error] = (itemErrors[failedItem.error] || 0) + 1;
  }
  const needItems = allLaunches.filter(launch => launch.failed > 0 || launch.status === 'FAILED');

  return {
    failedItems: allFailedItems,
    itemStats: {
      errors: itemErrors,
      failed: failedItemsList.length,
      succeeded: needItems.length - failedItemsList.length,
      total: needItems.length,
    },
    launches: allLaunches,
    launchStats: {
      errors: Object.fromEntries(errorReasons),
      failed: totalElements - allLaunches.length,
      succeeded: allLaunches.length,
      total: totalElements,
    },
    startedAt: pollId,
    timestamp: new Date(),
  };
};

const JENKINS_RESULT_MAP = {
  ABORTED: 'INTERRUPTED',
  FAILURE: 'FAILED',
  NOT_BUILT: 'STOPPED',
  SUCCESS: 'PASSED',
  UNSTABLE: 'FAILED',
} as const;

const checkJenkinsResult = async (artifactsUrl: string): Promise<string | null> => {
  try {
    const axios = (await import('axios')).default;
    const https = await import('https');
    const { config: appConfig } = await import('./config');
    const buildUrl = artifactsUrl.replace(/\/artifact\/?$/, '/api/json?tree=result');
    const requestConfig: Record<string, unknown> = {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 10000,
    };
    if (appConfig.jenkins.user && appConfig.jenkins.token) {
      requestConfig.auth = { password: appConfig.jenkins.token, username: appConfig.jenkins.user };
    }
    const response = await axios.get<{ result?: string }>(buildUrl, requestConfig);
    const jenkinsResult = response.data.result;
    if (!jenkinsResult || typeof jenkinsResult !== 'string') {
      return null;
    }
    if (jenkinsResult in JENKINS_RESULT_MAP) {
      return JENKINS_RESULT_MAP[jenkinsResult as keyof typeof JENKINS_RESULT_MAP];
    }
    return 'INTERRUPTED';
  } catch {
    return null;
  }
};

export const refreshStaleInProgress = async (): Promise<number> => {
  const staleMs = Date.now() - 24 * 60 * 60 * 1000;
  const { AppDataSource } = await import('./db/data-source');
  const repo = AppDataSource.getRepository('Launch');
  const staleRows = (await repo
    .createQueryBuilder('l')
    .where("l.status = 'IN_PROGRESS'")
    .andWhere('l.start_time < :staleMs', { staleMs })
    .getMany()) as { rp_id: number; name: string; artifacts_url: string | null }[];
  if (staleRows.length === 0) {
    return 0;
  }
  log.info({ count: staleRows.length }, 'Refreshing stale IN_PROGRESS launches');
  let updated = 0;
  for (const row of staleRows) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const rpLaunch = await fetchLaunchById(row.rp_id);
      if (rpLaunch.status !== 'IN_PROGRESS') {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        await repo.update(
          { rp_id: row.rp_id },
          {
            end_time: rpLaunch.endTime != null ? toEpochMs(rpLaunch.endTime) : null,
            failed: rpLaunch.statistics.executions.failed ?? 0,
            passed: rpLaunch.statistics.executions.passed ?? 0,
            skipped: rpLaunch.statistics.executions.skipped ?? 0,
            status: rpLaunch.status,
            total: rpLaunch.statistics.executions.total ?? 0,
          },
        );
        updated++;
        continue;
      }
    } catch {
      /* RP unreachable */
    }
    if (row.artifacts_url) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const jenkinsStatus = await checkJenkinsResult(row.artifacts_url);
      if (jenkinsStatus) {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        await repo.update({ rp_id: row.rp_id }, { status: jenkinsStatus });
        updated++;
        log.info(
          { name: row.name, rpId: row.rp_id, status: jenkinsStatus },
          'Updated from Jenkins result',
        );
      }
    }
  }
  log.info({ total: staleRows.length, updated }, 'Stale IN_PROGRESS refresh complete');
  return updated;
};

type EnrichmentResult = {
  total: number;
  succeeded: number;
  failed: number;
  noUrl: number;
  authRequired: number;
  deleted: number;
  pruned: number;
  errorReasons: Record<string, number>;
};

export const enrichLaunchesFromJenkins = async (
  launchList: LaunchRecord[],
  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
): Promise<EnrichmentResult> => {
  for (const launch of launchList.filter(item => !item.artifacts_url)) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const resolved = await resolveJenkinsUrl(launch);
    if (resolved) {
      launch.artifacts_url = resolved;
      log.info(
        { launchName: launch.name, rpId: launch.rp_id, url: resolved },
        'Resolved Jenkins URL from API',
      );
    } else {
      launch.jenkins_status = 'no_url';
    }
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await upsertLaunch(launch);
  }

  const withArtifacts = launchList.filter(launch => launch.artifacts_url);
  const withoutArtifacts = launchList.length - withArtifacts.length;

  if (withArtifacts.length === 0) {
    emitProgress('jenkins-progress', 'complete', 0, 0, 'No launches with Jenkins URLs');
    return {
      authRequired: 0,
      deleted: 0,
      errorReasons: {},
      failed: 0,
      noUrl: withoutArtifacts,
      pruned: 0,
      succeeded: 0,
      total: launchList.length,
    };
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
      emitProgress(
        'jenkins-progress',
        'cancelled',
        processed,
        withArtifacts.length,
        'Jenkins enrichment cancelled',
      );
      break;
    }
    const batch = withArtifacts.slice(idx, idx + config.schedule.jenkinsConcurrency);
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const results = await Promise.all(
      batch.map(async launch => {
        const error = await enrichLaunchFromJenkins(launch);
        await upsertLaunch(launch);
        return { error, status: launch.jenkins_status };
      }),
    );
    for (const { error, status } of results) {
      if (status === 'success' || status === 'build_pruned') {
        succeeded++;
      } else if (status === 'auth_required') {
        authRequired++;
      } else if (status === 'not_found') {
        notFound++;
      } else if (status === 'failed') {
        errored++;
        const reason = error || 'Unknown';
        const short = reason.includes('timeout')
          ? 'Timeout'
          : reason.includes('ECONNRE')
            ? 'Connection reset'
            : reason.includes('ECONNREFUSED')
              ? 'Connection refused'
              : reason.length > 30
                ? reason.substring(0, 30)
                : reason;
        errorReasons.set(short, (errorReasons.get(short) || 0) + 1);
      }
    }
    processed += batch.length;
    const parts = [`${succeeded} enriched`];
    if (authRequired > 0) {
      parts.push(`${authRequired} auth required`);
    }
    if (notFound > 0) {
      parts.push(`${notFound} deleted`);
    }
    if (errored > 0) {
      const reasons = [...errorReasons.entries()]
        .map(([reason, count]) => `${reason}: ${count}`)
        .join(', ');
      parts.push(`${errored} errors (${reasons})`);
    }
    emitProgress(
      'jenkins-progress',
      'enriching',
      processed,
      withArtifacts.length,
      `Jenkins: ${processed}/${withArtifacts.length} (${parts.join(', ')})`,
    );
    if (idx + config.schedule.jenkinsConcurrency < withArtifacts.length) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await new Promise<void>(resolve => {
        setTimeout(resolve, JENKINS_BATCH_DELAY_MS);
      });
    }
  }

  const errorDetail =
    errorReasons.size > 0
      ? ` (${[...errorReasons.entries()].map(([reason, count]) => `${reason}: ${count}`).join(', ')})`
      : '';
  const message = `Jenkins complete — ${succeeded} enriched, ${notFound} deleted, ${authRequired} auth required, ${errored} errors${errorDetail}`;
  emitProgress('jenkins-progress', 'complete', withArtifacts.length, withArtifacts.length, message);
  log.info(
    { authRequired, errored, notFound, noUrl: withoutArtifacts, succeeded },
    'Jenkins enrichment complete',
  );
  return {
    authRequired,
    deleted: notFound,
    errorReasons: Object.fromEntries(errorReasons),
    failed: errored,
    noUrl: withoutArtifacts,
    pruned: 0,
    succeeded,
    total: launchList.length,
  };
};
