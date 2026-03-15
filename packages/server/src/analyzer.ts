import { LaunchRecord, TestItemRecord, getLaunchesSince, getLaunchesInRange, getFailedTestItems, getUntriagedItems, getLastPassedLaunchTime } from './db/store';
import { type HealthStatus, type EnrichedFailedItem, parseTier, parseLaunchVariant, parseCnvVersion, computeHealth, enrichFailedItems } from './analyzer-utils';

export type { HealthStatus, EnrichedFailedItem } from './analyzer-utils';

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

export const groupLaunches = async (launches: LaunchRecord[]): Promise<LaunchGroup[]> => {
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

    const totalTests = sorted.reduce((sum, launch) => sum + launch.total, 0);
    const passedTests = sorted.reduce((sum, launch) => sum + launch.passed, 0);
    const failedTests = sorted.reduce((sum, launch) => sum + launch.failed, 0);
    const skippedTests = sorted.reduce((sum, launch) => sum + launch.skipped, 0);

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

export const buildDailyReport = async (lookbackHours = 24, sinceOverride?: number, untilOverride?: number): Promise<DailyReport> => {
  const sinceMs = sinceOverride ?? (Date.now() - lookbackHours * 60 * 60 * 1000);
  const untilMs = untilOverride;

  const launches = untilMs
    ? await getLaunchesInRange(sinceMs, untilMs)
    : await getLaunchesSince(sinceMs);
  const groups = await groupLaunches(launches);

  const passedLaunches = launches.filter(launch => launch.status === 'PASSED').length;
  const failedLaunches = launches.filter(launch => launch.status === 'FAILED').length;
  const inProgressLaunches = launches.filter(launch => launch.status === 'IN_PROGRESS').length;

  const allFailedItems = groups.flatMap(group => group.failedItems);

  const previousDurationMs = untilMs ? (untilMs - sinceMs) : (lookbackHours * 60 * 60 * 1000);
  const previousSinceMs = sinceMs - previousDurationMs;
  const previousLaunches = (await getLaunchesInRange(previousSinceMs, sinceMs));
  const previousGroups = await groupLaunches(previousLaunches);
  const previousFailedUniqueIds = new Set(
    previousGroups.flatMap(group => group.failedItems).map(item => item.unique_id).filter(Boolean),
  );

  const newFailures = allFailedItems.filter(item => item.unique_id && !previousFailedUniqueIds.has(item.unique_id));
  const recurringFailures = allFailedItems.filter(item => item.unique_id && previousFailedUniqueIds.has(item.unique_id));

  const untriagedCount = (await getUntriagedItems(sinceMs, untilMs)).length;
  const overallHealth: HealthStatus = failedLaunches > 0 ? 'red' : inProgressLaunches > 0 ? 'yellow' : 'green';
  const components = [...new Set(groups.map(group => group.component).filter(Boolean) as string[])].sort();

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
