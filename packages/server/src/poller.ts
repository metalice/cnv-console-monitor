import axios from 'axios';
import https from 'https';
import {
  fetchLaunches,
  fetchTestItems,
  fetchTestItemLogs,
  extractAttribute,
  RPLaunch,
  RPTestItem,
} from './clients/reportportal';
import { upsertLaunch, upsertTestItem, LaunchRecord, TestItemRecord, getFailedTestItems, getLaunchesWithoutComponent, updateLaunchComponent } from './db/store';
import { config } from './config';
import { logger } from './logger';
import { resolveComponent, parseJenkinsParams } from './componentMap';
import { withRetry } from './utils/retry';

const log = logger.child({ module: 'Poller' });
const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

export type PollResult = {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
};

function parseArtifactsUrl(description?: string): string | undefined {
  if (!description) return undefined;
  const match = description.match(/\[Artifacts Link\]\((https?:\/\/[^\s)]+)\)/);
  return match?.[1];
}

function parseLaunchRecord(launch: RPLaunch): LaunchRecord {
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

async function fetchJenkinsTeam(artifactsUrl: string): Promise<string | null> {
  try {
    const buildApiUrl = artifactsUrl.replace(/\/artifact\/?$/, '/api/json?tree=actions[parameters[name,value]]');
    const response = await withRetry(
      () => axios.get(buildApiUrl, { httpsAgent: jenkinsHttpsAgent, timeout: 10000 }),
      'fetchJenkinsTeam',
      { maxRetries: 2 },
    );
    const actions: Array<{ parameters?: Array<{ name: string; value: string }> }> = response.data?.actions || [];
    const params: Record<string, string> = {};
    for (const action of actions) {
      if (Array.isArray(action.parameters)) {
        for (const p of action.parameters) {
          if (p.name) params[p.name] = String(p.value ?? '');
        }
      }
    }
    const info = parseJenkinsParams(params);
    return info.team;
  } catch {
    return null;
  }
}

async function resolveComponentForLaunch(launch: LaunchRecord): Promise<string | null> {
  let team: string | null = null;
  if (launch.artifacts_url) {
    team = await fetchJenkinsTeam(launch.artifacts_url);
  }
  return resolveComponent(team, launch.name);
}

function parseClusterFromHosts(hosts?: string): string | undefined {
  if (!hosts) return undefined;
  const match = hosts.match(/cluster-name-([^\s.]+)/);
  return match ? match[1] : hosts.trim();
}

function parseTestItemRecord(item: RPTestItem, launchRpId: number): TestItemRecord {
  const polarionAttr = item.attributes.find(a => a.key === 'polarion-testcase-id');
  const aiPrediction = item.attributes.find(a => a.key === 'AI Prediction');
  const aiConfidence = item.attributes.find(a => a.key === 'Prediction Score');

  return {
    rp_id: item.id,
    launch_rp_id: launchRpId,
    name: item.name,
    status: item.status,
    polarion_id: polarionAttr?.value ?? undefined,
    defect_type: item.issue?.issueType ?? undefined,
    defect_comment: item.issue?.comment ?? undefined,
    ai_prediction: aiPrediction?.value ?? undefined,
    ai_confidence: aiConfidence ? (Number.isFinite(parseInt(aiConfidence.value, 10)) ? parseInt(aiConfidence.value, 10) : undefined) : undefined,
    error_message: undefined,
    jira_key: item.issue?.externalSystemIssues?.[0]?.ticketId ?? undefined,
    jira_status: undefined,
    unique_id: item.uniqueId ?? undefined,
    start_time: item.startTime,
    end_time: item.endTime ?? undefined,
  };
}

export async function pollReportPortal(lookbackHours = 24, fetchDetails = true): Promise<PollResult> {
  const sinceTime = Date.now() - lookbackHours * 60 * 60 * 1000;
  log.info({ since: new Date(sinceTime).toISOString(), fetchDetails }, 'Fetching all launches');

  const allLaunches: LaunchRecord[] = [];
  const allFailedItems = new Map<number, TestItemRecord[]>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchLaunches({
      sinceTime,
      pageSize: 50,
      page,
    });

    totalPages = result.page.totalPages;

    if (page === 1) {
      log.info({ totalElements: result.page.totalElements, totalPages }, 'RP response');
    }

    for (const rpLaunch of result.content) {
      const launch = parseLaunchRecord(rpLaunch);
      launch.component = (await resolveComponentForLaunch(launch)) ?? undefined;
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

  return {
    launches: allLaunches,
    failedItems: allFailedItems,
    timestamp: new Date(),
  };
}

export async function backfillTestItems(launches: LaunchRecord[], onBatch?: () => void): Promise<void> {
  const failedLaunches = launches
    .filter(l => l.failed > 0 || l.status === 'FAILED')
    .sort((a, b) => b.start_time - a.start_time);

  log.info({ total: failedLaunches.length }, 'Starting test item backfill');

  for (let i = 0; i < failedLaunches.length; i++) {
    const launch = failedLaunches[i];
    const existing = await getFailedTestItems(launch.rp_id);
    if (existing.length > 0) continue;

    try {
      await fetchFailedItemsForLaunch(launch.rp_id);
    } catch (err) {
      log.warn({ launchRpId: launch.rp_id, err }, 'Failed to backfill test items');
    }

    if ((i + 1) % 20 === 0) {
      log.info({ progress: `${i + 1}/${failedLaunches.length}` }, 'Backfill progress');
      onBatch?.();
    }
  }

  log.info('Backfill complete');
  onBatch?.();
}

export async function refreshLaunchTestItems(launchId: number): Promise<TestItemRecord[]> {
  return fetchFailedItemsForLaunch(launchId);
}

export async function backfillComponents(onBatch?: () => void): Promise<void> {
  const missing = await getLaunchesWithoutComponent(1000);
  if (missing.length === 0) {
    log.info('No launches missing component');
    return;
  }

  log.info({ count: missing.length }, 'Backfilling components');

  for (let i = 0; i < missing.length; i++) {
    const launch = missing[i];
    const component = await resolveComponentForLaunch(launch);
    if (component) {
      await updateLaunchComponent(launch.rp_id, component);
    }

    if ((i + 1) % 50 === 0) {
      log.info({ progress: `${i + 1}/${missing.length}` }, 'Component backfill progress');
      onBatch?.();
    }
  }

  log.info('Component backfill complete');
  onBatch?.();
}

async function fetchFailedItemsForLaunch(launchId: number): Promise<TestItemRecord[]> {
  const items: TestItemRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchTestItems({
      launchId,
      status: 'FAILED',
      pageSize: 50,
      page,
    });

    totalPages = result.page.totalPages;

    for (const rpItem of result.content) {
      const item = parseTestItemRecord(rpItem, launchId);

      try {
        const logs = await fetchTestItemLogs(rpItem.id, { level: 'ERROR', pageSize: 1 });
        if (logs.content.length > 0) {
          item.error_message = logs.content[0].message.substring(0, 2000);
        }
      } catch {
        // non-critical
      }

      await upsertTestItem(item);
      items.push(item);
    }

    page++;
  }

  return items;
}
