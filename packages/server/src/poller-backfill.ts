import { fetchTestItemLogs, fetchTestItems, type RPTestItem } from './clients/reportportal';
import { toEpochMs } from './clients/reportportal-types';
import { type TestItemRecord, upsertTestItem } from './db/store';
import { config } from './config';

const parseTestItemRecord = (item: RPTestItem, launchRpId: number): TestItemRecord => {
  const polarionAttr = item.attributes.find(attr => attr.key === 'polarion-testcase-id');
  const aiPrediction = item.attributes.find(attr => attr.key === 'AI Prediction');
  const aiConfidence = item.attributes.find(attr => attr.key === 'Prediction Score');

  return {
    ai_confidence: aiConfidence
      ? Number.isFinite(parseInt(aiConfidence.value, 10))
        ? parseInt(aiConfidence.value, 10)
        : undefined
      : undefined,
    ai_prediction: aiPrediction?.value ?? undefined,
    defect_comment: item.issue?.comment ?? undefined,
    defect_type: item.issue?.issueType ?? undefined,
    end_time: item.endTime != null ? toEpochMs(item.endTime) : undefined,
    error_message: undefined,
    jira_key: item.issue?.externalSystemIssues?.[0]?.ticketId ?? undefined,
    jira_status: undefined,
    launch_rp_id: launchRpId,
    name: item.name,
    polarion_id: polarionAttr?.value ?? undefined,
    rp_id: item.id,
    start_time: toEpochMs(item.startTime),
    status: item.status,
    unique_id: item.uniqueId ?? undefined,
  };
};

export const fetchFailedItemsForLaunch = async (launchId: number): Promise<TestItemRecord[]> => {
  const allRpItems: { item: TestItemRecord; rpItemId: number }[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const result = await fetchTestItems({ launchId, page, pageSize: 50, status: 'FAILED' });
    totalPages = result.page.totalPages;

    for (const rpItem of result.content) {
      allRpItems.push({ item: parseTestItemRecord(rpItem, launchId), rpItemId: rpItem.id });
    }
    page++;
  }

  const items: TestItemRecord[] = [];
  const itemConcurrency = config.schedule.rpConcurrency;
  for (let i = 0; i < allRpItems.length; i += itemConcurrency) {
    const batch = allRpItems.slice(i, i + itemConcurrency);
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await Promise.all(
      batch.map(async ({ item, rpItemId }) => {
        try {
          const logs = await fetchTestItemLogs(rpItemId, { level: 'ERROR', pageSize: 1 });
          if (logs.content.length > 0) {
            item.error_message = logs.content[0].message.substring(0, 2000);
          }
        } catch {
          // Non-critical
        }
        await upsertTestItem(item);
        items.push(item);
      }),
    );
  }

  return items;
};

export const refreshLaunchTestItems = async (launchId: number): Promise<TestItemRecord[]> =>
  fetchFailedItemsForLaunch(launchId);

export const fetchAllItemsForLaunch = async (launchId: number): Promise<TestItemRecord[]> => {
  const allRpItems: { item: TestItemRecord; rpItemId: number }[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const result = await fetchTestItems({ launchId, page, pageSize: 50 });
    totalPages = result.page.totalPages;
    for (const rpItem of result.content) {
      allRpItems.push({ item: parseTestItemRecord(rpItem, launchId), rpItemId: rpItem.id });
    }
    page++;
  }

  const items: TestItemRecord[] = [];
  for (const { item, rpItemId } of allRpItems) {
    if (item.status === 'FAILED') {
      try {
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        const logs = await fetchTestItemLogs(rpItemId, { level: 'ERROR', pageSize: 1 });
        if (logs.content.length > 0) {
          item.error_message = logs.content[0].message.substring(0, 2000);
        }
      } catch {
        /* Non-critical */
      }
    }
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await upsertTestItem(item);
    items.push(item);
  }

  return items;
};
