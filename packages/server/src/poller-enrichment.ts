import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { LaunchRecord } from './db/store';
import { config } from './config';
import { logger } from './logger';
import { withRetry } from './utils/retry';
import { resolveComponent } from './componentMap';

const log = logger.child({ module: 'PollerEnrichment' });
const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

export type JenkinsResult = {
  status: 'success' | 'failed' | 'not_found' | 'build_pruned' | 'auth_required';
  team: string | null;
  tier: string | null;
  metadata: Record<string, unknown> | null;
  error?: string;
};

const getHttpStatus = (error: unknown): number | undefined => {
  if (error && typeof error === 'object') {
    const resp = (error as Record<string, unknown>).response as Record<string, unknown> | undefined;
    return resp?.status as number | undefined;
  }
  return undefined;
};

const checkJobExists = async (artifactsUrl: string): Promise<boolean> => {
  const jobUrl = artifactsUrl.replace(/\/\d+\/artifact\/?$/, '/api/json?tree=name');
  try {
    await axios.get(jobUrl, buildJenkinsRequestConfig());
    return true;
  } catch {
    return false;
  }
};

const buildJenkinsRequestConfig = (): AxiosRequestConfig => {
  const requestConfig: AxiosRequestConfig = { httpsAgent: jenkinsHttpsAgent, timeout: 15000 };
  if (config.jenkins.user && config.jenkins.token) {
    requestConfig.auth = { username: config.jenkins.user, password: config.jenkins.token };
  }
  return requestConfig;
};

const fetchJenkinsData = async (artifactsUrl: string): Promise<JenkinsResult> => {
  const buildApiUrl = artifactsUrl.replace(/\/artifact\/?$/, '/api/json?tree=actions[parameters[name,value]]');
  try {
    const requestConfig = buildJenkinsRequestConfig();
    const response = await withRetry(
      () => axios.get(buildApiUrl, requestConfig),
      'fetchJenkinsData',
      {
        maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 15000,
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

    const tier = (metadata?.tier != null ? `TIER-${metadata.tier}` : null)
      || params.DATA_TIER_NAME || params.CNV_TIER_NAME || null;

    return { status: 'success', team, tier, metadata };
  } catch (error) {
    const httpStatus = getHttpStatus(error);
    if (httpStatus === 403) {
      return { status: 'auth_required', team: null, tier: null, metadata: null, error: 'Jenkins authentication required' };
    }
    if (httpStatus === 404 || httpStatus === 410) {
      const jobExists = await checkJobExists(artifactsUrl);
      if (jobExists) {
        return { status: 'build_pruned', team: null, tier: null, metadata: null, error: 'Build pruned but job still exists' };
      }
      return { status: 'not_found', team: null, tier: null, metadata: null, error: 'Job deleted from Jenkins' };
    }
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'failed', team: null, tier: null, metadata: null, error: errorMsg };
  }
};

export const enrichLaunchFromJenkins = async (launch: LaunchRecord): Promise<string | null> => {
  if (!launch.artifacts_url) {
    launch.jenkins_status = 'no_url';
    return null;
  }

  const result = await fetchJenkinsData(launch.artifacts_url);
  launch.jenkins_status = result.status;

  if (result.status !== 'success') {
    if (result.status === 'failed') {
      log.debug({ launchName: launch.name, error: result.error }, 'Jenkins enrichment failed (retryable)');
    }
    return result.error || null;
  }

  if (result.team) {
    launch.jenkins_team = result.team;
    launch.component = result.team;
  } else {
    const fromRegex = resolveComponent(null, launch.name);
    if (fromRegex) launch.component = fromRegex;
  }
  if (result.metadata) {
    launch.jenkins_metadata = result.metadata;
  }
  if (result.tier && (!launch.tier || launch.tier === '-')) {
    launch.tier = result.tier;
  }
  return null;
};
