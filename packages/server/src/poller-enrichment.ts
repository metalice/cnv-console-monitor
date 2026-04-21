import https from 'https';

import axios, { type AxiosRequestConfig } from 'axios';

import { type LaunchRecord } from './db/store';
import { withRetry } from './utils/retry';
import { resolveComponent } from './componentMap';
import { config } from './config';
import { logger } from './logger';

const log = logger.child({ module: 'PollerEnrichment' });
const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

type JenkinsResult = {
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
    requestConfig.auth = { password: config.jenkins.token, username: config.jenkins.user };
  }
  return requestConfig;
};

const fetchJenkinsData = async (artifactsUrl: string): Promise<JenkinsResult> => {
  const buildApiUrl = artifactsUrl.replace(
    /\/artifact\/?$/,
    '/api/json?tree=actions[parameters[name,value]]',
  );
  try {
    const requestConfig = buildJenkinsRequestConfig();
    const response = await withRetry(
      () =>
        axios.get<{ actions?: { parameters?: { name: string; value: string }[] }[] }>(
          buildApiUrl,
          requestConfig,
        ),
      'fetchJenkinsData',
      {
        baseDelayMs: 2000,
        maxDelayMs: 15000,
        maxRetries: 3,
        retryableCheck: err => {
          const status = getHttpStatus(err);
          if (status === 403 || status === 404 || status === 410) {
            return false;
          }
          const code = (err as Record<string, unknown>).code as string | undefined;
          if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') {
            return true;
          }
          return (
            status === 429 || status === 500 || status === 502 || status === 503 || status === 504
          );
        },
      },
    );

    const actions = response.data.actions ?? [];
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
        if (typeof metadata.team === 'string') {
          team = metadata.team;
        }
      } catch {
        /* Malformed JSON */
      }
    }

    const tier =
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      (metadata?.tier != null ? `TIER-${String(metadata.tier)}` : null) ||
      params.DATA_TIER_NAME ||
      params.CNV_TIER_NAME ||
      null;

    return { metadata, status: 'success', team, tier };
  } catch (error) {
    const httpStatus = getHttpStatus(error);
    if (httpStatus === 403) {
      return {
        error: 'Jenkins authentication required',
        metadata: null,
        status: 'auth_required',
        team: null,
        tier: null,
      };
    }
    if (httpStatus === 404 || httpStatus === 410) {
      const jobExists = await checkJobExists(artifactsUrl);
      if (jobExists) {
        return {
          error: 'Build pruned but job still exists',
          metadata: null,
          status: 'build_pruned',
          team: null,
          tier: null,
        };
      }
      return {
        error: 'Job deleted from Jenkins',
        metadata: null,
        status: 'not_found',
        team: null,
        tier: null,
      };
    }
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return { error: errorMsg, metadata: null, status: 'failed', team: null, tier: null };
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
      log.debug(
        { error: result.error, launchName: launch.name },
        'Jenkins enrichment failed (retryable)',
      );
    }
    return result.error || null;
  }

  if (result.team) {
    launch.jenkins_team = result.team;
    launch.component = result.team;
  } else {
    const fromRegex = resolveComponent(null, launch.name);
    if (fromRegex) {
      launch.component = fromRegex;
    }
  }
  if (result.metadata) {
    launch.jenkins_metadata = result.metadata;
  }
  if (result.tier && (!launch.tier || launch.tier === '-')) {
    launch.tier = result.tier;
  }
  return null;
};

const JENKINS_BASE_URL = 'https://jenkins-csb-cnvqe-main.dno.corp.redhat.com';
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export const resolveJenkinsUrl = async (launch: LaunchRecord): Promise<string | null> => {
  if (!config.jenkins.user || !config.jenkins.token) {
    return null;
  }

  const jobApiUrl = `${JENKINS_BASE_URL}/job/${encodeURIComponent(launch.name)}/api/json?tree=builds[number,timestamp]{0,10}`;

  try {
    type JenkinsBuildsResponse = { builds?: { number: number; timestamp: number }[] };
    const response = await axios.get<JenkinsBuildsResponse>(jobApiUrl, buildJenkinsRequestConfig());
    const builds = response.data.builds ?? [];

    if (builds.length === 0) {
      return null;
    }

    const launchStartMs = launch.start_time;
    let bestMatch = builds[0];
    let bestDiff = Math.abs(builds[0].timestamp - launchStartMs);

    for (const build of builds.slice(1)) {
      const diff = Math.abs(build.timestamp - launchStartMs);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = build;
      }
    }

    if (bestDiff > FIVE_MINUTES_MS) {
      log.debug(
        { bestDiff, buildNumber: bestMatch.number, launchName: launch.name },
        'No Jenkins build within 5 minutes of launch start time',
      );
      return null;
    }

    return `${JENKINS_BASE_URL}/job/${encodeURIComponent(launch.name)}/${bestMatch.number}/artifact`;
  } catch (error) {
    const status = getHttpStatus(error);
    if (status === 404) {
      log.debug({ launchName: launch.name }, 'Jenkins job not found');
    } else {
      log.debug({ error, launchName: launch.name }, 'Failed to resolve Jenkins URL');
    }
    return null;
  }
};
