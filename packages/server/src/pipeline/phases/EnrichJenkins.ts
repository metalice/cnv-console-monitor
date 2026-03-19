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
    const withArtifacts = this.launches.filter(l => l.artifacts_url);
    const withoutArtifacts = this.launches.filter(l => !l.artifacts_url);

    for (const launch of withoutArtifacts) {
      launch.jenkins_status = 'no_url';
      await upsertLaunch(launch);
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

    try {
      await this.enrichLaunch(launch);
      await upsertLaunch(launch);
      return launch.jenkins_status === 'success' || launch.jenkins_status === 'build_pruned';
    } catch {
      return false;
    }
  }

  isPermanentError(error: unknown): boolean {
    const status = getHttpStatus(error);
    return status === 404 || status === 410;
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
          maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 10000,
          retryableCheck: (err) => {
            const s = getHttpStatus(err);
            if (s === 403 || s === 404 || s === 410) return false;
            const code = (err as Record<string, unknown>)?.code as string | undefined;
            if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') return true;
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
        throw error;
      }
      if (httpStatus === 404 || httpStatus === 410) {
        const jobExists = await this.checkJobExists(launch.artifacts_url);
        launch.jenkins_status = jobExists ? 'build_pruned' : 'not_found';
        if (!jobExists) throw error;
        return;
      }
      launch.jenkins_status = 'failed';
      throw error;
    }
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
