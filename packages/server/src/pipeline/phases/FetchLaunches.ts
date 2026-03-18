import { fetchLaunches, extractAttribute, type RPLaunch } from '../../clients/reportportal';
import { upsertLaunch, clearAllLaunches, clearAllTestItems, getLaunchCount, type LaunchRecord } from '../../db/store';
import { config } from '../../config';
import type { PipelinePhase, PhaseContext, PhaseEstimate } from '../types';

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
    artifacts_url: parseArtifactsUrl(rpLaunch.description),
  };
};

export class FetchLaunchesPhase implements PipelinePhase {
  readonly name = 'launches';
  readonly displayName = 'Launches';

  private lookbackHours = 24;
  private clearFirst = false;
  private launches: LaunchRecord[] = [];

  configure(lookbackHours: number, clearFirst: boolean): void {
    this.lookbackHours = lookbackHours;
    this.clearFirst = clearFirst;
  }

  getLaunches(): LaunchRecord[] {
    return this.launches;
  }

  canSkip(): boolean {
    return false;
  }

  canRunParallel(): string[] {
    return [];
  }

  async estimate(): Promise<PhaseEstimate> {
    const start = Date.now();
    try {
      const sinceTime = Date.now() - this.lookbackHours * 60 * 60 * 1000;
      const result = await fetchLaunches({ sinceTime, pageSize: 1, page: 1 });
      return {
        totalItems: result.page.totalElements,
        estimatedDurationMs: result.page.totalElements * 5,
        connectivity: [{ service: 'ReportPortal', status: 'ok', message: `${Date.now() - start}ms latency, ${result.page.totalElements} launches` }],
      };
    } catch (err) {
      return {
        totalItems: 0,
        estimatedDurationMs: 0,
        connectivity: [{ service: 'ReportPortal', status: 'error', message: err instanceof Error ? err.message : 'Connection failed' }],
      };
    }
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
      if (ctx.isCancelled()) break;

      const result = await fetchLaunches({ sinceTime, pageSize, page });
      totalPages = result.page.totalPages;

      if (page === 1) ctx.setTotal(result.page.totalElements);

      for (const rpLaunch of result.content) {
        const launch = parseLaunchRecord(rpLaunch);
        await upsertLaunch(launch);
        this.launches.push(launch);
        ctx.addSuccess();
      }

      page++;
    }

    ctx.log('info', `Fetched ${this.launches.length} launches`);
  }

  async retryItem(_itemId: number): Promise<boolean> {
    return false;
  }

  isPermanentError(error: unknown): boolean {
    const status = this.getHttpStatus(error);
    return status === 401;
  }

  private getHttpStatus(error: unknown): number | undefined {
    if (error && typeof error === 'object') {
      return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)?.status as number | undefined;
    }
    return undefined;
  }
}
