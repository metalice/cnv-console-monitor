import {
  fetchLaunches,
  fetchTestItems,
  extractAttribute,
  RPLaunch,
  RPTestItem,
} from './clients/reportportal';
import { upsertLaunch, upsertTestItem, LaunchRecord, TestItemRecord } from './db/store';
import { config } from './config';

export interface PollResult {
  launches: LaunchRecord[];
  failedItems: Map<number, TestItemRecord[]>;
  timestamp: Date;
}

function parseLaunchRecord(launch: RPLaunch): LaunchRecord {
  const attrs = launch.attributes;
  const execs = launch.statistics.executions;

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
  };
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
    polarion_id: polarionAttr?.value,
    defect_type: item.issue?.issueType,
    defect_comment: item.issue?.comment,
    ai_prediction: aiPrediction?.value,
    ai_confidence: aiConfidence ? parseInt(aiConfidence.value, 10) : undefined,
    jira_key: item.issue?.externalSystemIssues?.[0]?.ticketId,
    unique_id: item.uniqueId,
    start_time: item.startTime,
    end_time: item.endTime,
  };
}

export async function pollReportPortal(lookbackHours = 24): Promise<PollResult> {
  const sinceTime = Date.now() - lookbackHours * 60 * 60 * 1000;
  const launchFilter = config.dashboard.launchFilter;

  console.log(`[Poller] Fetching launches matching "${launchFilter}" since ${new Date(sinceTime).toISOString()}`);

  const allLaunches: LaunchRecord[] = [];
  const allFailedItems = new Map<number, TestItemRecord[]>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchLaunches({
      filterName: launchFilter,
      sinceTime,
      pageSize: 50,
      page,
    });

    totalPages = result.page.totalPages;

    for (const rpLaunch of result.content) {
      const launch = parseLaunchRecord(rpLaunch);
      upsertLaunch(launch);
      allLaunches.push(launch);

      if (launch.failed > 0 || launch.status === 'FAILED') {
        const failedItems = await fetchFailedItemsForLaunch(rpLaunch.id);
        allFailedItems.set(rpLaunch.id, failedItems);
      }
    }

    page++;
  }

  console.log(`[Poller] Fetched ${allLaunches.length} launches, ${allFailedItems.size} with failures`);

  return {
    launches: allLaunches,
    failedItems: allFailedItems,
    timestamp: new Date(),
  };
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
      upsertTestItem(item);
      items.push(item);
    }

    page++;
  }

  return items;
}
