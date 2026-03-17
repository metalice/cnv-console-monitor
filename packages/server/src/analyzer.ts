import { LaunchRecord, TestItemRecord, getLaunchesSince, getLaunchesInRange, getFailedTestItems, getUntriagedItems, getLastPassedLaunchTime } from './db/store';
import { type HealthStatus, type EnrichedFailedItem, parseTier, parseLaunchVariant, parseCnvVersion, computeHealth, enrichFailedItems } from './analyzer-utils';
import { getNewlyFailingUniqueIds } from './db/store';

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

export type LauncherRow = {
  name: string;
  description: string | null;
  component: string | null;
  version: string;
  tier: string;
  totalRuns: number;
  passed: number;
  failed: number;
  inProgress: number;
  passRate: number;
  latestLaunch: LaunchRecord;
};

export type DailyReport = {
  date: string;
  groups: LaunchGroup[];
  launchers: LauncherRow[];
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

export const groupByLaunchName = (launches: LaunchRecord[]): LauncherRow[] => {
  const byName = new Map<string, LaunchRecord[]>();
  for (const launch of launches) {
    if (!byName.has(launch.name)) byName.set(launch.name, []);
    byName.get(launch.name)!.push(launch);
  }

  const rows: LauncherRow[] = [];
  for (const [name, nameLaunches] of byName) {
    const sorted = nameLaunches.sort((first, second) => second.start_time - first.start_time);
    const latest = sorted[0];
    const passedCount = sorted.filter((item) => item.status === 'PASSED').length;
    const failedCount = sorted.filter((item) => item.status === 'FAILED').length;
    const inProgressCount = sorted.filter((item) => item.status === 'IN_PROGRESS').length;

    const metadata = latest.jenkins_metadata as Record<string, unknown> | undefined;
    const description = (metadata?.name as string) ?? null;
    const componentVotes = sorted.map((item) => item.component).filter(Boolean);
    const resolvedComponent = componentVotes.length > 0 ? componentVotes[0] : null;

    rows.push({
      name, description,
      component: resolvedComponent ?? latest.component ?? null,
      version: parseCnvVersion(latest),
      tier: parseTier(latest),
      totalRuns: sorted.length,
      passed: passedCount,
      failed: failedCount,
      inProgress: inProgressCount,
      passRate: sorted.length > 0 ? Math.round((passedCount / sorted.length) * 1000) / 10 : 0,
      latestLaunch: latest,
    });
  }

  return rows.sort((first, second) => second.latestLaunch.start_time - first.latestLaunch.start_time);
};

export const groupLaunches = async (launches: LaunchRecord[]): Promise<LaunchGroup[]> => {
  const groups = new Map<string, LaunchRecord[]>();
  for (const launch of launches) {
    const version = parseCnvVersion(launch);
    const tier = parseTier(launch);
    const variant = parseLaunchVariant(launch);
    const component = launch.component ?? 'unknown';
    const key = `${component}|${version}|${tier}|${variant}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(launch);
  }

  const result: LaunchGroup[] = [];
  for (const [key, groupLaunches] of groups) {
    const [_component, version, tier, _variant] = key.split('|');
    const sorted = groupLaunches.sort((first, second) => second.start_time - first.start_time);
    const latest = sorted[0];
    const failedItems = await getFailedTestItems(latest.rp_id);
    const enrichedFailedItems = await enrichFailedItems(failedItems);
    const lastPassedTime = await getLastPassedLaunchTime(latest.name);
    const totalTests = sorted.reduce((sum, launch) => sum + launch.total, 0);
    const passedTests = sorted.reduce((sum, launch) => sum + launch.passed, 0);

    result.push({
      cnvVersion: version, tier: `${tier}${_variant !== 'default' ? ` ${_variant}` : ''}`,
      launches: sorted, latestLaunch: latest, health: computeHealth(sorted),
      totalTests, passedTests,
      failedTests: sorted.reduce((sum, launch) => sum + launch.failed, 0),
      skippedTests: sorted.reduce((sum, launch) => sum + launch.skipped, 0),
      passRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 1000) / 10 : 0,
      failedItems, enrichedFailedItems, lastPassedTime, component: latest.component,
    });
  }
  return result.sort((first, second) => {
    const vCmp = first.cnvVersion.localeCompare(second.cnvVersion, undefined, { numeric: true });
    return vCmp !== 0 ? vCmp : first.tier.localeCompare(second.tier);
  });
};

export const buildDailyReport = async (lookbackHours = 24, sinceOverride?: number, untilOverride?: number, componentFilter?: string[]): Promise<DailyReport> => {
  const sinceMs = sinceOverride ?? (Date.now() - lookbackHours * 60 * 60 * 1000);
  const untilMs = untilOverride;
  const launches = untilMs ? await getLaunchesInRange(sinceMs, untilMs, componentFilter) : await getLaunchesSince(sinceMs);
  const groups = await groupLaunches(launches);
  const launchers = groupByLaunchName(launches);

  const passedLaunches = launches.filter((item) => item.status === 'PASSED').length;
  const failedLaunches = launches.filter((item) => item.status === 'FAILED').length;
  const inProgressLaunches = launches.filter((item) => item.status === 'IN_PROGRESS').length;
  const allFailedItems = groups.flatMap((item) => item.failedItems);
  const allUniqueIds = allFailedItems.map((item) => item.unique_id).filter(Boolean) as string[];
  const newlyFailingIds = await getNewlyFailingUniqueIds(allUniqueIds);
  const untriagedCount = (await getUntriagedItems(sinceMs, untilMs)).length;
  const components = [...new Set(launches.map((item) => item.component).filter(Boolean) as string[])].sort();

  return {
    date: (untilOverride ? new Date(untilOverride) : new Date()).toISOString().split('T')[0],
    groups, launchers,
    overallHealth: failedLaunches > 0 ? 'red' : inProgressLaunches > 0 ? 'yellow' : 'green',
    totalLaunches: launches.length, passedLaunches, failedLaunches, inProgressLaunches, untriagedCount,
    newFailures: allFailedItems.filter((item) => item.unique_id && newlyFailingIds.has(item.unique_id)),
    recurringFailures: allFailedItems.filter((item) => item.unique_id && !newlyFailingIds.has(item.unique_id)),
    components,
  };
};
