import {
  fetchTestItems,
  fetchTestItemLogs,
  RPTestItem,
} from './clients/reportportal';
import { upsertTestItem, LaunchRecord, TestItemRecord, getFailedTestItems } from './db/store';
import { logger } from './logger';

const log = logger.child({ module: 'PollerBackfill' });

const parseTestItemRecord = (item: RPTestItem, launchRpId: number): TestItemRecord => {
  const polarionAttr = item.attributes.find(attr => attr.key === 'polarion-testcase-id');
  const aiPrediction = item.attributes.find(attr => attr.key === 'AI Prediction');
  const aiConfidence = item.attributes.find(attr => attr.key === 'Prediction Score');

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

export const fetchFailedItemsForLaunch = async (launchId: number): Promise<TestItemRecord[]> => {
  const items: TestItemRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchTestItems({ launchId, status: 'FAILED', pageSize: 50, page });
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

export const backfillTestItems = async (launches: LaunchRecord[], onBatch?: () => void): Promise<void> => {
  const failedLaunches = launches
    .filter(launch => launch.failed > 0 || launch.status === 'FAILED')
    .sort((a, b) => b.start_time - a.start_time);

  log.info({ total: failedLaunches.length }, 'Starting test item backfill');

  for (let launchIdx = 0; launchIdx < failedLaunches.length; launchIdx++) {
    const launch = failedLaunches[launchIdx];
    const existing = await getFailedTestItems(launch.rp_id);
    if (existing.length > 0) continue;

    try {
      await fetchFailedItemsForLaunch(launch.rp_id);
    } catch (err) {
      log.warn({ launchRpId: launch.rp_id, err }, 'Failed to backfill test items');
    }

    if ((launchIdx + 1) % 20 === 0) {
      log.info({ progress: `${launchIdx + 1}/${failedLaunches.length}` }, 'Backfill progress');
      onBatch?.();
    }
  }

  log.info('Backfill complete');
  onBatch?.();
}

export const refreshLaunchTestItems = async (launchId: number): Promise<TestItemRecord[]> => {
  return fetchFailedItemsForLaunch(launchId);
}
