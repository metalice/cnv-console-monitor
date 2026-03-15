import axios from 'axios';
import https from 'https';
import { LaunchRecord, getLaunchesWithoutComponent } from './db/store';
import { config } from './config';
import { logger } from './logger';
import { resolveComponent, parseJenkinsParams } from './componentMap';
import { withRetry } from './utils/retry';
import { upsertLaunch } from './db/store';

const log = logger.child({ module: 'PollerEnrichment' });
const jenkinsHttpsAgent = new https.Agent({ rejectUnauthorized: false });

type JenkinsInfo = { team: string | null; tier: string | null };

const fetchJenkinsInfo = async (artifactsUrl: string): Promise<JenkinsInfo> => {
  try {
    const buildApiUrl = artifactsUrl.replace(/\/artifact\/?$/, '/api/json?tree=actions[parameters[name,value]]');
    const response = await withRetry(
      () => axios.get(buildApiUrl, { httpsAgent: jenkinsHttpsAgent, timeout: 10000 }),
      'fetchJenkinsInfo',
      { maxRetries: 2 },
    );
    const actions: Array<{ parameters?: Array<{ name: string; value: string }> }> = response.data?.actions || [];
    const params: Record<string, string> = {};
    for (const action of actions) {
      if (Array.isArray(action.parameters)) {
        for (const param of action.parameters) {
          if (param.name) params[param.name] = String(param.value ?? '');
        }
      }
    }
    const info = parseJenkinsParams(params);
    const tier = params.DATA_TIER_NAME || params.CNV_TIER_NAME || null;
    return { team: info.team, tier };
  } catch {
    return { team: null, tier: null };
  }
}

export const enrichLaunchFromJenkins = async (launch: LaunchRecord): Promise<void> => {
  if (!launch.artifacts_url) {
    launch.component = resolveComponent(null, launch.name) ?? undefined;
    return;
  }
  const jenkins = await fetchJenkinsInfo(launch.artifacts_url);
  launch.component = resolveComponent(jenkins.team, launch.name) ?? undefined;
  if ((!launch.tier || launch.tier === '-') && jenkins.tier) {
    launch.tier = jenkins.tier;
  }
}

export const backfillComponents = async (onBatch?: () => void): Promise<void> => {
  const missing = await getLaunchesWithoutComponent(1000);
  if (missing.length === 0) {
    log.info('No launches missing component');
    return;
  }

  log.info({ count: missing.length }, 'Backfilling components');

  for (let launchIdx = 0; launchIdx < missing.length; launchIdx++) {
    const launch = missing[launchIdx];
    await enrichLaunchFromJenkins(launch);
    if (launch.component || launch.tier) {
      await upsertLaunch(launch);
    }

    if ((launchIdx + 1) % 50 === 0) {
      log.info({ progress: `${launchIdx + 1}/${missing.length}` }, 'Component backfill progress');
      onBatch?.();
    }
  }

  log.info('Component backfill complete');
  onBatch?.();
}
