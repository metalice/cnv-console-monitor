import https from 'https';

import axios, { type AxiosRequestConfig } from 'axios';

import { resolveComponent } from '../../componentMap';
import { config } from '../../config';
import { type LaunchRecord, upsertLaunch } from '../../db/store';
import { withRetry } from '../../utils/retry';
import type { PhaseContext, PhaseEstimate, PipelinePhase } from '../types';

const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

const buildJenkinsRequestConfig = (): AxiosRequestConfig => {
  const requestConfig: AxiosRequestConfig = { httpsAgent: jenkinsHttpsAgent, timeout: 15000 };
  if (config.jenkins.user && config.jenkins.token) {
    requestConfig.auth = { password: config.jenkins.token, username: config.jenkins.user };
  }
  return requestConfig;
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (error && typeof error === 'object') {
    return ((error as Record<string, unknown>).response as Record<string, unknown> | undefined)
      ?.status as number | undefined;
  }
  return undefined;
};

export class EnrichJenkinsPhase implements PipelinePhase {
  private launches: LaunchRecord[] = [];
  private prunedJobCache = new Set<string>();

  readonly displayName = 'Jenkins Enrichment';
  readonly name = 'jenkins';

  private async checkJobExists(artifactsUrl: string): Promise<boolean> {
    const jobUrl = artifactsUrl.replace(/\/\d+\/artifact\/?$/, '/api/json?tree=name');
    try {
      await axios.get(jobUrl, buildJenkinsRequestConfig());
      return true;
    } catch {
      return false;
    }
  }

  // TODO: Refactor to reduce cognitive complexity
  // eslint-disable-next-line sonarjs/cognitive-complexity
  private async enrichLaunch(launch: LaunchRecord): Promise<void> {
    if (!launch.artifacts_url) {
      launch.jenkins_status = 'no_url';
      return;
    }

    const buildApiUrl = launch.artifacts_url.replace(
      /\/artifact\/?$/,
      '/api/json?tree=result,actions[parameters[name,value]]',
    );
    const requestConfig = buildJenkinsRequestConfig();

    try {
      type JenkinsBuildResponse = {
        result?: string;
        actions: { parameters?: { name: string; value: string }[] }[];
      };

      const response = await withRetry(
        () => axios.get<JenkinsBuildResponse>(buildApiUrl, requestConfig),
        `jenkins(${launch.rp_id})`,
        {
          baseDelayMs: 1000,
          maxDelayMs: 5000,
          maxRetries: 2,
          retryableCheck: err => {
            const s = getHttpStatus(err);
            if (s === 403 || s === 404 || s === 410) {
              return false;
            }
            const code = (err as Record<string, unknown>).code as string | undefined;
            if (
              code === 'ECONNRESET' ||
              code === 'ETIMEDOUT' ||
              code === 'ENOTFOUND' ||
              code === 'ECONNABORTED' ||
              code === 'ERR_STREAM_PREMATURE_CLOSE' ||
              code === 'ABORT_ERR' ||
              code === 'ERR_CANCELED'
            ) {
              return true;
            }
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            const msg = String((err as Record<string, unknown>).message ?? '').toLowerCase();
            if (msg.includes('aborted') || msg.includes('socket hang up')) {
              return true;
            }
            return s === 429 || s === 500 || s === 502 || s === 503 || s === 504;
          },
        },
      );

      /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: Jenkins API data */
      const actions = response.data?.actions || [];
      const params: Record<string, string> = {};
      for (const action of actions) {
        for (const param of action.parameters ?? []) {
          if (param.name) {
            params[param.name] = param.value;
          }
        }
      }

      let metadata: Record<string, unknown> | null = null;
      let team: string | null = null;
      const jobMetaStr = params.JOB_METADATA;
      if (jobMetaStr) {
        try {
          metadata = JSON.parse(jobMetaStr) as Record<string, unknown>;
          if (metadata && typeof metadata.team === 'string') {
            team = metadata.team;
          }
        } catch {
          /* Malformed JSON */
        }
      }

      launch.jenkins_status = 'success';
      const jenkinsResult = response.data?.result;
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */
      if (team) {
        launch.jenkins_team = team;
        launch.component = team;
      } else {
        const fromRegex = resolveComponent(null, launch.name);
        if (fromRegex) {
          launch.component = fromRegex;
        }
      }
      if (metadata) {
        launch.jenkins_metadata = metadata;
      }
      if (jenkinsResult) {
        launch.jenkins_metadata = { ...launch.jenkins_metadata, buildResult: jenkinsResult };
        if (jenkinsResult === 'SUCCESS' && launch.status === 'FAILED' && launch.failed === 0) {
          launch.status = 'PASSED';
        }
      }
      const tier =
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        (metadata?.tier != null ? `TIER-${String(metadata.tier)}` : null) ||
        params.DATA_TIER_NAME ||
        params.CNV_TIER_NAME ||
        null;
      if (tier && (!launch.tier || launch.tier === '-')) {
        launch.tier = tier;
      }
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
        if (jobExists && jobPath) {
          this.prunedJobCache.add(jobPath);
        }
        return;
      }
      launch.jenkins_status = 'failed';
      throw error;
    }
  }

  private extractJobPath(artifactsUrl: string): string | null {
    const match = /\/job\/([^/]+)\//.exec(artifactsUrl);
    return match ? match[1] : null;
  }

  private async loadUnenrichedLaunches(): Promise<LaunchRecord[]> {
    const { AppDataSource } = await import('../../db/data-source');
    const { Launch } = await import('../../db/entities/Launch');
    const repo = AppDataSource.getRepository(Launch);
    const rows = await repo
      .createQueryBuilder('l')
      .where('l.jenkins_status IN (:...statuses)', {
        statuses: ['pending', 'failed', 'auth_required'],
      })
      .orderBy('l.start_time', 'DESC')
      .getMany();

    return rows.map(r => ({
      artifacts_url: r.artifacts_url ?? undefined,
      bundle: r.bundle ?? undefined,
      cluster_name: r.cluster_name ?? undefined,
      cnv_version: r.cnv_version ?? undefined,
      component: r.component ?? undefined,
      duration: r.duration ?? undefined,
      end_time: r.end_time ?? undefined,
      failed: r.failed,
      jenkins_metadata: r.jenkins_metadata ?? undefined,
      jenkins_status: r.jenkins_status ?? undefined,
      jenkins_team: r.jenkins_team ?? undefined,
      name: r.name,
      number: r.number,
      ocp_version: r.ocp_version ?? undefined,
      passed: r.passed,
      rp_id: r.rp_id,
      skipped: r.skipped,
      start_time: r.start_time,
      status: r.status,
      tier: r.tier ?? undefined,
      total: r.total,
      uuid: r.uuid,
    }));
  }

  canRunParallel(): string[] {
    return [];
  }

  canSkip(): boolean {
    return !config.jenkins.user || !config.jenkins.token;
  }

  async estimate(): Promise<PhaseEstimate> {
    const withArtifacts = this.launches.filter(l => l.artifacts_url);
    const start = Date.now();
    let connectivity: PhaseEstimate['connectivity'][0];

    if (withArtifacts.length > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const url = withArtifacts[0].artifacts_url!.replace(
          /\/artifact\/?$/,
          '/api/json?tree=result',
        );
        await axios.get(url, { ...buildJenkinsRequestConfig(), timeout: 5000 });
        connectivity = {
          message: `${Date.now() - start}ms latency`,
          service: 'Jenkins',
          status: 'ok',
        };
      } catch (err) {
        const status = getHttpStatus(err);
        connectivity = {
          message: status ? `HTTP ${status}` : 'Connection failed',
          service: 'Jenkins',
          status: status === 403 ? 'ok' : 'error',
        };
      }
    } else {
      connectivity = { message: 'No launches with artifacts', service: 'Jenkins', status: 'ok' };
    }

    return {
      connectivity: [connectivity],
      estimatedDurationMs: withArtifacts.length * 600,
      totalItems: withArtifacts.length,
    };
  }

  isPermanentError(_error: unknown): boolean {
    return false;
  }

  async retryItem(itemId: number): Promise<boolean> {
    const launch = this.launches.find(l => l.rp_id === itemId);
    if (!launch?.artifacts_url) {
      return false;
    }

    await this.enrichLaunch(launch);
    await upsertLaunch(launch);
    return launch.jenkins_status === 'success' || launch.jenkins_status === 'build_pruned';
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
      await Promise.all(
        withoutArtifacts.map(l => {
          l.jenkins_status = 'no_url';
          return upsertLaunch(l);
        }),
      );
    }

    ctx.setTotal(withArtifacts.length);
    if (withArtifacts.length === 0) {
      return;
    }

    ctx.log(
      'info',
      `Enriching ${withArtifacts.length} launches (${withoutArtifacts.length} without URL)`,
    );

    const concurrency = ctx.getConcurrency();
    for (let i = 0; i < withArtifacts.length; i += concurrency) {
      if (ctx.isCancelled()) {
        break;
      }

      const batch = withArtifacts.slice(i, i + concurrency);
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await Promise.all(
        batch.map(async launch => {
          try {
            await this.enrichLaunch(launch);
            await upsertLaunch(launch);
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
