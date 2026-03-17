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
  status: 'success' | 'failed' | 'not_found' | 'auth_required';
  team: string | null;
  tier: string | null;
  metadata: Record<string, unknown> | null;
  error?: string;
};

const getPermanentStatus = (error: unknown): string | null => {
  if (error && typeof error === 'object') {
    const status = (error as Record<string, unknown>).response
      ? ((error as Record<string, unknown>).response as Record<string, unknown>).status as number
      : undefined;
    if (status === 404 || status === 410) return 'not_found';
    if (status === 403) return 'auth_required';
  }
  return null;
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
      { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 15000 },
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
    const permanentStatus = getPermanentStatus(error);
    if (permanentStatus) {
      const message = permanentStatus === 'not_found' ? 'Build deleted from Jenkins' : 'Jenkins authentication required';
      return { status: permanentStatus as JenkinsResult['status'], team: null, tier: null, metadata: null, error: message };
    }
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { status: 'failed', team: null, tier: null, metadata: null, error: errorMsg };
  }
};

export const enrichLaunchFromJenkins = async (launch: LaunchRecord): Promise<void> => {
  if (!launch.artifacts_url) {
    launch.jenkins_status = 'no_url';
    return;
  }

  const result = await fetchJenkinsData(launch.artifacts_url);
  launch.jenkins_status = result.status;

  if (result.status !== 'success') {
    if (result.status === 'failed') {
      log.debug({ launchName: launch.name, error: result.error }, 'Jenkins enrichment failed (retryable)');
    }
    return;
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
};
