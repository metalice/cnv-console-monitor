import { LaunchRecord, TestItemRecord, getLaunchesSince, getLaunchesInRange, getFailedTestItems, getUntriagedItems, getTestFailureStreak, getLastPassedLaunchTime, FailureStreakInfo, RunStatus } from './db/store';

export type HealthStatus = 'green' | 'yellow' | 'red';

export type EnrichedFailedItem = TestItemRecord & {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: RunStatus[];
};

export type LaunchGroup = {
  cnvVersion: string;
  tier: string;
  launches: LaunchRecord[];
  latestLaunch: LaunchRecord;
  health: HealthStatus;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number;
  failedItems: TestItemRecord[];
  enrichedFailedItems: EnrichedFailedItem[];
  lastPassedTime: number | null;
  component?: string;
};

export type DailyReport = {
  date: string;
  groups: LaunchGroup[];
  overallHealth: HealthStatus;
  totalLaunches: number;
  passedLaunches: number;
  failedLaunches: number;
  inProgressLaunches: number;
  untriagedCount: number;
  newFailures: TestItemRecord[];
  recurringFailures: TestItemRecord[];
  components: string[];
};

function parseTier(launch: LaunchRecord): string {
  const name = launch.name;
  if (name.includes('-t1-')) return 'T1';
  if (name.includes('-t2-')) return 'T2';
  if (launch.tier && launch.tier !== '-') return launch.tier;
  return 'Unknown';
}

function parseLaunchVariant(launch: LaunchRecord): string {
  const name = launch.name;
  const parts: string[] = [];
  if (name.includes('-gating')) parts.push('gating');
  if (name.includes('-ocs-nonpriv')) parts.push('ocs-nonpriv');
  else if (name.includes('-ocs')) parts.push('ocs');
  return parts.length > 0 ? parts.join('-') : 'default';
}

function parseCnvVersion(launch: LaunchRecord): string {
  if (launch.cnv_version && launch.cnv_version !== '-') return launch.cnv_version;
  const match = launch.name.match(/cnv-(\d+\.\d+)/);
  return match ? match[1] : 'unknown';
}

function computeHealth(launches: LaunchRecord[]): HealthStatus {
  if (launches.some(l => l.status === 'FAILED')) return 'red';
  if (launches.some(l => l.status === 'IN_PROGRESS')) return 'yellow';
  return 'green';
}

async function enrichFailedItems(items: TestItemRecord[]): Promise<EnrichedFailedItem[]> {
  const enriched: EnrichedFailedItem[] = [];
  for (const item of items) {
    let streak: FailureStreakInfo = {
      consecutiveFailures: 1,
      totalRuns: 1,
      lastPassDate: null,
      lastPassTime: null,
      recentStatuses: ['FAILED'],
      recentRuns: [{ status: 'FAILED', date: '' }],
    };

    if (item.unique_id) {
      streak = await getTestFailureStreak(item.unique_id);
    }

    enriched.push({
      ...item,
      consecutiveFailures: streak.consecutiveFailures,
      totalRuns: streak.totalRuns,
      lastPassDate: streak.lastPassDate,
      lastPassTime: streak.lastPassTime,
      recentStatuses: streak.recentStatuses,
      recentRuns: streak.recentRuns,
    });
  }
  return enriched;
}

export async function groupLaunches(launches: LaunchRecord[]): Promise<LaunchGroup[]> {
  const groups = new Map<string, LaunchRecord[]>();

  for (const launch of launches) {
    const version = parseCnvVersion(launch);
    const tier = parseTier(launch);
    const variant = parseLaunchVariant(launch);
    const key = `${version}|${tier}|${variant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(launch);
  }

  const result: LaunchGroup[] = [];

  for (const [key, groupLaunches] of groups) {
    const [version, tier, _variant] = key.split('|');
    const sorted = groupLaunches.sort((a, b) => b.start_time - a.start_time);
    const latest = sorted[0];
    const failedItems = await getFailedTestItems(latest.rp_id);
    const enrichedFailedItems = await enrichFailedItems(failedItems);
    const lastPassedTime = await getLastPassedLaunchTime(latest.name);

    const totalTests = sorted.reduce((sum, l) => sum + l.total, 0);
    const passedTests = sorted.reduce((sum, l) => sum + l.passed, 0);
    const failedTests = sorted.reduce((sum, l) => sum + l.failed, 0);
    const skippedTests = sorted.reduce((sum, l) => sum + l.skipped, 0);

    result.push({
      cnvVersion: version,
      tier: `${tier}${_variant !== 'default' ? ` ${_variant}` : ''}`,
      launches: sorted,
      latestLaunch: latest,
      health: computeHealth(sorted),
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0,
      failedItems,
      enrichedFailedItems,
      lastPassedTime,
      component: latest.component,
    });
  }

  return result.sort((a, b) => {
    const versionCompare = a.cnvVersion.localeCompare(b.cnvVersion, undefined, { numeric: true });
    if (versionCompare !== 0) return versionCompare;
    return a.tier.localeCompare(b.tier);
  });
}

export async function buildDailyReport(lookbackHours = 24, sinceOverride?: number, untilOverride?: number): Promise<DailyReport> {
  const sinceMs = sinceOverride ?? (Date.now() - lookbackHours * 60 * 60 * 1000);
  const untilMs = untilOverride;

  const launches = untilMs
    ? await getLaunchesInRange(sinceMs, untilMs)
    : await getLaunchesSince(sinceMs);
  const groups = await groupLaunches(launches);

  const passedLaunches = launches.filter(l => l.status === 'PASSED').length;
  const failedLaunches = launches.filter(l => l.status === 'FAILED').length;
  const inProgressLaunches = launches.filter(l => l.status === 'IN_PROGRESS').length;

  const allFailedItems = groups.flatMap(g => g.failedItems);

  const previousDurationMs = untilMs ? (untilMs - sinceMs) : (lookbackHours * 60 * 60 * 1000);
  const previousSinceMs = sinceMs - previousDurationMs;
  const previousLaunches = (await getLaunchesInRange(previousSinceMs, sinceMs));
  const previousGroups = await groupLaunches(previousLaunches);
  const previousFailedUniqueIds = new Set(
    previousGroups.flatMap(g => g.failedItems).map(i => i.unique_id).filter(Boolean),
  );

  const newFailures = allFailedItems.filter(i => i.unique_id && !previousFailedUniqueIds.has(i.unique_id));
  const recurringFailures = allFailedItems.filter(i => i.unique_id && previousFailedUniqueIds.has(i.unique_id));

  const untriagedCount = (await getUntriagedItems(sinceMs, untilMs)).length;
  const overallHealth: HealthStatus = failedLaunches > 0 ? 'red' : inProgressLaunches > 0 ? 'yellow' : 'green';

  const components = [...new Set(groups.map(g => g.component).filter(Boolean) as string[])].sort();

  const reportDate = untilOverride
    ? new Date(untilOverride).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  return {
    date: reportDate,
    groups,
    overallHealth,
    totalLaunches: launches.length,
    passedLaunches,
    failedLaunches,
    inProgressLaunches,
    untriagedCount,
    newFailures,
    recurringFailures,
    components,
  };
}
