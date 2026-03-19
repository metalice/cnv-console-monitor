import axios, { type AxiosRequestConfig } from 'axios';
import https from 'https';
import { upsertLaunch, type LaunchRecord } from '../../db/store';
import { config } from '../../config';
import { withRetry } from '../../utils/retry';
import { resolveComponent } from '../../componentMap';
import type { PipelinePhase, PhaseContext, PhaseEstimate } from '../types';

const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

const buildJenkinsRequestConfig = (): AxiosRequestConfig => {
  const requestConfig: AxiosRequestConfig = { httpsAgent: jenkinsHttpsAgent, timeout: 15000 };
  if (config.jenkins.user && config.jenkins.token) {
    requestConfig.auth = { username: config.jenkins.user, password: config.jenkins.token };
  }
  return requestConfig;
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (error && typeof error === 'object') {
    return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)?.status as number | undefined;
  }
  return undefined;
};

export class EnrichJenkinsPhase implements PipelinePhase {
  readonly name = 'jenkins';
  readonly displayName = 'Jenkins Enrichment';

  private launches: LaunchRecord[] = [];
  private prunedJobCache = new Set<string>();

  setLaunches(launches: LaunchRecord[]): void {
    this.launches = launches;
  }

  canSkip(): boolean {
    return !config.jenkins.user || !config.jenkins.token;
  }

  canRunParallel(): string[] {
    return [];
  }

  async estimate(): Promise<PhaseEstimate> {
    const withArtifacts = this.launches.filter(l => l.artifacts_url);
    const start = Date.now();
    let connectivity: PhaseEstimate['connectivity'][0];

    if (withArtifacts.length > 0) {
      try {
        const url = withArtifacts[0].artifacts_url!.replace(/\/artifact\/?$/, '/api/json?tree=result');
        await axios.get(url, { ...buildJenkinsRequestConfig(), timeout: 5000 });
        connectivity = { service: 'Jenkins', status: 'ok', message: `${Date.now() - start}ms latency` };
      } catch (err) {
        const status = getHttpStatus(err);
        connectivity = { service: 'Jenkins', status: status === 403 ? 'ok' : 'error', message: status ? `HTTP ${status}` : 'Connection failed' };
      }
    } else {
      connectivity = { service: 'Jenkins', status: 'ok', message: 'No launches with artifacts' };
    }

    return {
      totalItems: withArtifacts.length,
      estimatedDurationMs: withArtifacts.length * 600,
      connectivity: [connectivity],
    };
  }

  async run(ctx: PhaseContext): Promise<void> {
    if (this.launches.length === 0) {
      ctx.log('info', 'Loading launches needing enrichment from database');
      this.launches = await this.loadUnenrichedLaunches();
      ctx.log('info', `Found ${this.launches.length} launches needing enrichment`);
    }
    const withArtifacts = this.launches.filter(l => l.artifacts_url);
    const withoutArtifacts = this.launches.filter(l => !l.artifacts_url);

    if (withoutArtifacts.length > 0) {
      await Promise.all(withoutArtifacts.map(l => { l.jenkins_status = 'no_url'; return upsertLaunch(l); }));
    }

    ctx.setTotal(withArtifacts.length);
    if (withArtifacts.length === 0) return;

    ctx.log('info', `Enriching ${withArtifacts.length} launches (${withoutArtifacts.length} without URL)`);

    const concurrency = ctx.getConcurrency();
    for (let i = 0; i < withArtifacts.length; i += concurrency) {
      if (ctx.isCancelled()) break;

      const batch = withArtifacts.slice(i, i + concurrency);
      await Promise.all(batch.map(async (launch) => {
        try {
          await this.enrichLaunch(launch);
          await upsertLaunch(launch);
          ctx.addSuccess();
        } catch (err) {
          ctx.addError(launch.rp_id, launch.name, err);
        }
      }));
      ctx.emit();
    }
  }

  async retryItem(itemId: number): Promise<boolean> {
    const launch = this.launches.find(l => l.rp_id === itemId);
    if (!launch?.artifacts_url) return false;

    await this.enrichLaunch(launch);
    await upsertLaunch(launch);
    return launch.jenkins_status === 'success' || launch.jenkins_status === 'build_pruned';
  }

  isPermanentError(_error: unknown): boolean {
    return false;
  }

  private async enrichLaunch(launch: LaunchRecord): Promise<void> {
    if (!launch.artifacts_url) {
      launch.jenkins_status = 'no_url';
      return;
    }

    const buildApiUrl = launch.artifacts_url.replace(/\/artifact\/?$/, '/api/json?tree=actions[parameters[name,value]]');
    const requestConfig = buildJenkinsRequestConfig();

    try {
      const response = await withRetry(
        () => axios.get(buildApiUrl, requestConfig),
        `jenkins(${launch.rp_id})`,
        {
          maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000,
          retryableCheck: (err) => {
            const s = getHttpStatus(err);
            if (s === 403 || s === 404 || s === 410) return false;
            const code = (err as Record<string, unknown>)?.code as string | undefined;
            if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND'
              || code === 'ECONNABORTED' || code === 'ERR_STREAM_PREMATURE_CLOSE' || code === 'ABORT_ERR' || code === 'ERR_CANCELED') return true;
            const msg = ((err as Record<string, unknown>)?.message as string || '').toLowerCase();
            if (msg.includes('aborted') || msg.includes('socket hang up')) return true;
            return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
          },
        },
      );

      const actions: Array<{ parameters?: Array<{ name: string; value: string }> }> = response.data?.actions || [];
      const params: Record<string, string> = {};
      for (const action of actions) {
        for (const param of action.parameters ?? []) {
          if (param.name) params[param.name] = String(param.value ?? '');
        }
      }

      let metadata: Record<string, unknown> | null = null;
      let team: string | null = null;
      const jobMetaStr = params.JOB_METADATA;
      if (jobMetaStr) {
        try {
          metadata = JSON.parse(jobMetaStr);
          if (metadata && typeof metadata.team === 'string') team = metadata.team;
        } catch { /* malformed JSON */ }
      }

      launch.jenkins_status = 'success';
      if (team) {
        launch.jenkins_team = team;
        launch.component = team;
      } else {
        const fromRegex = resolveComponent(null, launch.name);
        if (fromRegex) launch.component = fromRegex;
      }
      if (metadata) launch.jenkins_metadata = metadata;
      const tier = (metadata?.tier != null ? `TIER-${metadata.tier}` : null) || params.DATA_TIER_NAME || params.CNV_TIER_NAME || null;
      if (tier && (!launch.tier || launch.tier === '-')) launch.tier = tier;

    } catch (error) {
      const httpStatus = getHttpStatus(error);
      if (httpStatus === 403) {
        launch.jenkins_status = 'auth_required';
        return;
      }
      if (httpStatus === 404 || httpStatus === 410) {
        const jobPath = this.extractJobPath(launch.artifacts_url);
        if (jobPath && this.prunedJobCache.has(jobPath)) {
          launch.jenkins_status = 'build_pruned';
          return;
        }
        const jobExists = await this.checkJobExists(launch.artifacts_url);
        launch.jenkins_status = jobExists ? 'build_pruned' : 'not_found';
        if (jobExists && jobPath) this.prunedJobCache.add(jobPath);
        return;
      }
      launch.jenkins_status = 'failed';
      throw error;
    }
  }

  private async loadUnenrichedLaunches(): Promise<LaunchRecord[]> {
    const { AppDataSource } = await import('../../db/data-source');
    const { Launch } = await import('../../db/entities/Launch');
    const repo = AppDataSource.getRepository(Launch);
    const rows = await repo
      .createQueryBuilder('l')
      .where('l.jenkins_status IN (:...statuses)', { statuses: ['pending', 'failed', 'auth_required'] })
      .orderBy('l.start_time', 'DESC')
      .getMany();

    return rows.map(r => ({
      rp_id: r.rp_id, uuid: r.uuid, name: r.name, number: r.number,
      status: r.status, cnv_version: r.cnv_version ?? undefined,
      bundle: r.bundle ?? undefined, ocp_version: r.ocp_version ?? undefined,
      tier: r.tier ?? undefined, cluster_name: r.cluster_name ?? undefined,
      total: r.total, passed: r.passed, failed: r.failed, skipped: r.skipped,
      start_time: Number(r.start_time), end_time: r.end_time ? Number(r.end_time) : undefined,
      duration: r.duration ?? undefined, artifacts_url: r.artifacts_url ?? undefined,
      component: r.component ?? undefined, jenkins_team: r.jenkins_team ?? undefined,
      jenkins_metadata: r.jenkins_metadata ?? undefined, jenkins_status: r.jenkins_status ?? undefined,
    }));
  }

  private extractJobPath(artifactsUrl: string): string | null {
    const match = artifactsUrl.match(/\/job\/([^/]+)\//);
    return match ? match[1] : null;
  }

  private async checkJobExists(artifactsUrl: string): Promise<boolean> {
    const jobUrl = artifactsUrl.replace(/\/\d+\/artifact\/?$/, '/api/json?tree=name');
    try {
      await axios.get(jobUrl, buildJenkinsRequestConfig());
      return true;
    } catch {
      return false;
    }
  }
}
