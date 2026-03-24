import { extractAttribute, fetchLaunches, type RPLaunch } from '../../clients/reportportal';
import { config } from '../../config';
import {
  clearAllLaunches,
  clearAllTestItems,
  type LaunchRecord,
  upsertLaunch,
} from '../../db/store';
import type { PhaseContext, PhaseEstimate, PipelinePhase } from '../types';

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
  return {
    artifacts_url: parseArtifactsUrl(rpLaunch.description),
    bundle: extractAttribute(attrs, 'BUNDLE'),
    cluster_name:
      extractAttribute(attrs, 'CLUSTER_NAME') ||
      parseClusterFromHosts(extractAttribute(attrs, 'HOSTS')),
    cnv_version: extractAttribute(attrs, 'CNV_XY_VER') || extractAttribute(attrs, 'VERSION'),
    duration: rpLaunch.approximateDuration,
    end_time: rpLaunch.endTime,
    failed: execs.failed || 0,
    name: rpLaunch.name,
    number: rpLaunch.number,
    ocp_version: extractAttribute(attrs, 'OCP'),
    passed: execs.passed || 0,
    rp_id: rpLaunch.id,
    skipped: execs.skipped || 0,
    start_time: rpLaunch.startTime,
    status: rpLaunch.status,
    tier: extractAttribute(attrs, 'TIER'),
    total: execs.total || 0,
    uuid: rpLaunch.uuid,
  };
};

export class FetchLaunchesPhase implements PipelinePhase {
  private clearFirst = false;
  private launches: LaunchRecord[] = [];

  private lookbackHours = 24;
  readonly displayName = 'Launches';
  readonly name = 'launches';

  private getHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)
        ?.status as number | undefined;
    }
    return undefined;
  }

  canRunParallel(): string[] {
    return [];
  }

  canSkip(): boolean {
    return false;
  }

  configure(lookbackHours: number, clearFirst: boolean): void {
    this.lookbackHours = lookbackHours;
    this.clearFirst = clearFirst;
  }

  async estimate(): Promise<PhaseEstimate> {
    const start = Date.now();
    try {
      const sinceTime = Date.now() - this.lookbackHours * 60 * 60 * 1000;
      const result = await fetchLaunches({ page: 1, pageSize: 1, sinceTime });
      return {
        connectivity: [
          {
            message: `${Date.now() - start}ms latency, ${result.page.totalElements} launches`,
            service: 'ReportPortal',
            status: 'ok',
          },
        ],
        estimatedDurationMs: result.page.totalElements * 5,
        totalItems: result.page.totalElements,
      };
    } catch (err) {
      return {
        connectivity: [
          {
            message: err instanceof Error ? err.message : 'Connection failed',
            service: 'ReportPortal',
            status: 'error',
          },
        ],
        estimatedDurationMs: 0,
        totalItems: 0,
      };
    }
  }

  getLaunches(): LaunchRecord[] {
    return this.launches;
  }

  isPermanentError(error: unknown): boolean {
    const status = this.getHttpStatus(error);
    return status === 401;
  }

  retryItem(_itemId: number): Promise<boolean> {
    return Promise.resolve(false);
  }

  async run(ctx: PhaseContext): Promise<void> {
    if (this.clearFirst) {
      ctx.log('info', 'Clearing existing data');
      await clearAllTestItems();
      await clearAllLaunches();
    }

    this.launches = [];
    const sinceTime = Date.now() - this.lookbackHours * 60 * 60 * 1000;
    const pageSize = config.schedule.rpPageSize;
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      if (ctx.isCancelled()) {
        break;
      }

      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      const result = await fetchLaunches({ page, pageSize, sinceTime });
      totalPages = result.page.totalPages;

      if (page === 1) {
        ctx.setTotal(result.page.totalElements);
      }

      for (const rpLaunch of result.content) {
        const launch = parseLaunchRecord(rpLaunch);
        // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
        await upsertLaunch(launch);
        this.launches.push(launch);
        ctx.addSuccess();
      }

      page++;
    }

    ctx.log('info', `Fetched ${this.launches.length} launches`);
  }
}
