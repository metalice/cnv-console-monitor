import { fetchTestItemLogs, fetchTestItems, type RPTestItem } from '../../clients/reportportal';
import {
  getLaunchesSince,
  type LaunchRecord,
  type TestItemRecord,
  upsertTestItem,
} from '../../db/store';
import type { PhaseContext, PhaseEstimate, PipelinePhase } from '../types';

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
    end_time: item.endTime ?? undefined,
    error_message: undefined,
    jira_key: item.issue?.externalSystemIssues?.[0]?.ticketId ?? undefined,
    jira_status: undefined,
    launch_rp_id: launchRpId,
    name: item.name,
    polarion_id: polarionAttr?.value ?? undefined,
    rp_id: item.id,
    start_time: item.startTime,
    status: item.status,
    unique_id: item.uniqueId ?? undefined,
  };
};

export class FetchItemsPhase implements PipelinePhase {
  private launches: LaunchRecord[] = [];
  readonly displayName = 'Failed Test Items';

  readonly name = 'items';

  private async fetchItemsForLaunch(launchId: number): Promise<TestItemRecord[]> {
    const allItems: TestItemRecord[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const result = await fetchTestItems({ launchId, page, pageSize: 50, status: 'FAILED' });
      totalPages = result.page.totalPages;

      for (const rpItem of result.content) {
        const item = parseTestItemRecord(rpItem, launchId);
        try {
          // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
          const logs = await fetchTestItemLogs(rpItem.id, { level: 'ERROR', pageSize: 1 });
          if (logs.content.length > 0) {
            item.error_message = logs.content[0].message.substring(0, 2000);
          }
        } catch {
          /* Non-critical */
        }
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        await upsertTestItem(item);
        allItems.push(item);
      }
      page++;
    }

    return allItems;
  }

  private getHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)
        ?.status as number | undefined;
    }
    return undefined;
  }

  private getLaunchesWithFailures(): LaunchRecord[] {
    return this.launches.filter(launch => launch.failed > 0 || launch.status === 'FAILED');
  }

  canRunParallel(): string[] {
    return [];
  }

  canSkip(): boolean {
    return this.getLaunchesWithFailures().length === 0;
  }

  estimate(): Promise<PhaseEstimate> {
    const withFailures = this.getLaunchesWithFailures();
    return Promise.resolve({
      connectivity: [
        {
          message: `${withFailures.length} launches with failures`,
          service: 'ReportPortal (items)',
          status: 'ok',
        },
      ],
      estimatedDurationMs: withFailures.length * 500,
      totalItems: withFailures.length,
    });
  }

  isPermanentError(error: unknown): boolean {
    const status = this.getHttpStatus(error);
    return status === 404 || status === 410;
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

  async run(ctx: PhaseContext): Promise<void> {
    if (this.launches.length === 0) {
      ctx.log('info', 'Loading launches from database');
      this.launches = await getLaunchesSince(0);
      ctx.log(
        'info',
        `Loaded ${this.launches.length} launches (${this.getLaunchesWithFailures().length} with failures)`,
      );
    }
    const withFailures = this.getLaunchesWithFailures();
    if (withFailures.length === 0) {
      return;
    }

    ctx.setTotal(withFailures.length);
    ctx.log('info', `Fetching items for ${withFailures.length} launches with failures`);

    const concurrency = ctx.getConcurrency();

    for (let i = 0; i < withFailures.length; i += concurrency) {
      if (ctx.isCancelled()) {
        break;
      }

      const batch = withFailures.slice(i, i + concurrency);
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await Promise.all(
        batch.map(async launch => {
          try {
            await this.fetchItemsForLaunch(launch.rp_id);
            ctx.addSuccess();
          } catch (err) {
            ctx.addError(launch.rp_id, launch.name, err);
          }
        }),
      );
      ctx.emit();
    }
  }

  setLaunches(launches: LaunchRecord[]): void {
    this.launches = launches;
  }
}
