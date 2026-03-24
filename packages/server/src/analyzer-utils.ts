import {
  type FailureStreakInfo,
  getTestFailureStreak,
  type LaunchRecord,
  type RunStatus,
  type TestItemRecord,
} from './db/store';

export type HealthStatus = 'green' | 'yellow' | 'red';

export type EnrichedFailedItem = TestItemRecord & {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: RunStatus[];
};

export const parseTier = (launch: LaunchRecord): string => {
  if (launch.tier && launch.tier !== '-') {
    const tierUpper = launch.tier.toUpperCase();
    if (tierUpper === 'TIER-0' || tierUpper === 'TIER0') {
      return 'T0';
    }
    if (tierUpper === 'TIER-1' || tierUpper === 'TIER1') {
      return 'T1';
    }
    if (tierUpper === 'TIER-2' || tierUpper === 'TIER2') {
      return 'T2';
    }
    if (tierUpper === 'TIER-3' || tierUpper === 'TIER3') {
      return 'T3';
    }
    if (tierUpper === 'TIER-4' || tierUpper === 'TIER4') {
      return 'T4';
    }
    if (tierUpper === 'UPGRADE') {
      return 'Upgrade';
    }
    return launch.tier;
  }
  const name = launch.name.toLowerCase();
  if (name.includes('-t1-')) {
    return 'T1';
  }
  if (name.includes('-t2-')) {
    return 'T2';
  }
  if (name.includes('-t3-')) {
    return 'T3';
  }
  if (name.includes('-tier1')) {
    return 'T1';
  }
  if (name.includes('-tier2')) {
    return 'T2';
  }
  if (name.includes('-tier3')) {
    return 'T3';
  }
  if (name.includes('-gating')) {
    return 'T1';
  }
  if (name.includes('upgrade')) {
    return 'Upgrade';
  }
  if (name.includes('smoke')) {
    return 'T0';
  }
  if (name.includes('verify')) {
    return 'Verify';
  }
  return 'T1';
};

export const parseLaunchVariant = (launch: LaunchRecord): string => {
  const { name } = launch;
  const parts: string[] = [];
  if (name.includes('-gating')) {
    parts.push('gating');
  }
  if (name.includes('-ocs-nonpriv')) {
    parts.push('ocs-nonpriv');
  } else if (name.includes('-ocs')) {
    parts.push('ocs');
  }
  if (name.includes('-s390x')) {
    parts.push('s390x');
  } else if (name.includes('-ppc64le')) {
    parts.push('ppc64le');
  } else if (name.includes('-arm64') || name.includes('-aarch64')) {
    parts.push('arm64');
  }
  return parts.length > 0 ? parts.join('-') : 'default';
};

export const parseCnvVersion = (launch: LaunchRecord): string => {
  if (launch.cnv_version && launch.cnv_version !== '-') {
    return launch.cnv_version;
  }
  const match = /cnv-(\d+\.\d+)/.exec(launch.name);
  return match ? match[1] : 'unknown';
};

export const computeHealth = (launches: LaunchRecord[]): HealthStatus => {
  if (launches.some(launch => launch.status === 'FAILED')) {
    return 'red';
  }
  if (launches.some(launch => launch.status === 'IN_PROGRESS')) {
    return 'yellow';
  }
  return 'green';
};

export const enrichFailedItems = async (items: TestItemRecord[]): Promise<EnrichedFailedItem[]> => {
  const enriched: EnrichedFailedItem[] = [];
  for (const item of items) {
    let streak: FailureStreakInfo = {
      consecutiveFailures: 1,
      lastPassDate: null,
      lastPassTime: null,
      recentRuns: [{ date: '', status: 'FAILED' }],
      recentStatuses: ['FAILED'],
      totalRuns: 1,
    };

    if (item.unique_id) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      streak = await getTestFailureStreak(item.unique_id);
    }

    enriched.push({
      ...item,
      consecutiveFailures: streak.consecutiveFailures,
      lastPassDate: streak.lastPassDate,
      lastPassTime: streak.lastPassTime,
      recentRuns: streak.recentRuns,
      recentStatuses: streak.recentStatuses,
      totalRuns: streak.totalRuns,
    });
  }
  return enriched;
};
