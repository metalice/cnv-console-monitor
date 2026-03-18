import { fetchTestItems, fetchTestItemLogs, type RPTestItem } from '../../clients/reportportal';
import { upsertTestItem, type LaunchRecord, type TestItemRecord } from '../../db/store';
import { config } from '../../config';
import type { PipelinePhase, PhaseContext, PhaseEstimate } from '../types';

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
};

export class FetchItemsPhase implements PipelinePhase {
  readonly name = 'items';
  readonly displayName = 'Failed Test Items';

  private launches: LaunchRecord[] = [];

  setLaunches(launches: LaunchRecord[]): void {
    this.launches = launches;
  }

  canSkip(): boolean {
    return this.getLaunchesWithFailures().length === 0;
  }

  canRunParallel(): string[] {
    return [];
  }

  async estimate(): Promise<PhaseEstimate> {
    const withFailures = this.getLaunchesWithFailures();
    return {
      totalItems: withFailures.length,
      estimatedDurationMs: withFailures.length * 500,
      connectivity: [{ service: 'ReportPortal (items)', status: 'ok', message: `${withFailures.length} launches with failures` }],
    };
  }

  async run(ctx: PhaseContext): Promise<void> {
    const withFailures = this.getLaunchesWithFailures();
    if (withFailures.length === 0) return;

    ctx.setTotal(withFailures.length);
    ctx.log('info', `Fetching items for ${withFailures.length} launches with failures`);

    const concurrency = ctx.getConcurrency();

    for (let i = 0; i < withFailures.length; i += concurrency) {
      if (ctx.isCancelled()) break;

      const batch = withFailures.slice(i, i + concurrency);
      await Promise.all(batch.map(async (launch) => {
        try {
          await this.fetchItemsForLaunch(launch.rp_id);
          ctx.addSuccess();
        } catch (err) {
          ctx.addError(launch.rp_id, launch.name, err);
        }
      }));
      ctx.emit();
    }
  }

  async retryItem(itemId: number): Promise<boolean> {
    try {
      const items = await this.fetchItemsForLaunch(itemId);
      if (items.length === 0) {
        const { AppDataSource } = await import('../../db/data-source');
        await AppDataSource.query('UPDATE launches SET failed = 0 WHERE rp_id = $1', [itemId]);
      }
      return true;
    } catch {
      return false;
    }
  }

  isPermanentError(error: unknown): boolean {
    const status = this.getHttpStatus(error);
    return status === 404 || status === 410;
  }

  private getLaunchesWithFailures(): LaunchRecord[] {
    return this.launches.filter(l => l.failed > 0);
  }

  private async fetchItemsForLaunch(launchId: number): Promise<TestItemRecord[]> {
    const allItems: TestItemRecord[] = [];
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
        } catch { /* non-critical */ }
        await upsertTestItem(item);
        allItems.push(item);
      }
      page++;
    }

    return allItems;
  }

  private getHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)?.status as number | undefined;
    }
    return undefined;
  }
}
