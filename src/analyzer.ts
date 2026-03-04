import { LaunchRecord, TestItemRecord, getLaunchesSince, getFailedTestItems } from './db/store';

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface LaunchGroup {
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
}

export interface DailyReport {
  date: string;
  groups: LaunchGroup[];
  overallHealth: HealthStatus;
  totalLaunches: number;
  passedLaunches: number;
  failedLaunches: number;
  inProgressLaunches: number;
  newFailures: TestItemRecord[];
  recurringFailures: TestItemRecord[];
}

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
  const hasFailed = launches.some(l => l.status === 'FAILED');
  const hasInProgress = launches.some(l => l.status === 'IN_PROGRESS');

  if (hasFailed) return 'red';
  if (hasInProgress) return 'yellow';
  return 'green';
}

export function groupLaunches(launches: LaunchRecord[]): LaunchGroup[] {
  const groups = new Map<string, LaunchRecord[]>();

  for (const launch of launches) {
    const version = parseCnvVersion(launch);
    const tier = parseTier(launch);
    const variant = parseLaunchVariant(launch);
    const key = `${version}|${tier}|${variant}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(launch);
  }

  const result: LaunchGroup[] = [];

  for (const [key, groupLaunches] of groups) {
    const [version, tier, _variant] = key.split('|');
    const sorted = groupLaunches.sort((a, b) => b.start_time - a.start_time);
    const latest = sorted[0];
    const failedItems = getFailedTestItems(latest.rp_id);

    result.push({
      cnvVersion: version,
      tier: `${tier}${_variant !== 'default' ? ` ${_variant}` : ''}`,
      launches: sorted,
      latestLaunch: latest,
      health: computeHealth([latest]),
      totalTests: latest.total,
      passedTests: latest.passed,
      failedTests: latest.failed,
      skippedTests: latest.skipped,
      passRate: latest.total > 0 ? Math.round((latest.passed / latest.total) * 1000) / 10 : 0,
      failedItems,
    });
  }

  return result.sort((a, b) => {
    const versionCompare = a.cnvVersion.localeCompare(b.cnvVersion, undefined, { numeric: true });
    if (versionCompare !== 0) return versionCompare;
    return a.tier.localeCompare(b.tier);
  });
}

export function buildDailyReport(lookbackHours = 24): DailyReport {
  const sinceMs = Date.now() - lookbackHours * 60 * 60 * 1000;
  const launches = getLaunchesSince(sinceMs);
  const groups = groupLaunches(launches);

  const passedLaunches = launches.filter(l => l.status === 'PASSED').length;
  const failedLaunches = launches.filter(l => l.status === 'FAILED').length;
  const inProgressLaunches = launches.filter(l => l.status === 'IN_PROGRESS').length;

  const allFailedItems = groups.flatMap(g => g.failedItems);

  const previousSinceMs = sinceMs - lookbackHours * 60 * 60 * 1000;
  const previousLaunches = getLaunchesSince(previousSinceMs)
    .filter(l => l.start_time < sinceMs);
  const previousFailedUniqueIds = new Set(
    groupLaunches(previousLaunches)
      .flatMap(g => g.failedItems)
      .map(i => i.unique_id)
      .filter(Boolean)
  );

  const newFailures = allFailedItems.filter(
    i => i.unique_id && !previousFailedUniqueIds.has(i.unique_id)
  );
  const recurringFailures = allFailedItems.filter(
    i => i.unique_id && previousFailedUniqueIds.has(i.unique_id)
  );

  const overallHealth: HealthStatus = failedLaunches > 0 ? 'red' : inProgressLaunches > 0 ? 'yellow' : 'green';

  return {
    date: new Date().toISOString().split('T')[0],
    groups,
    overallHealth,
    totalLaunches: launches.length,
    passedLaunches,
    failedLaunches,
    inProgressLaunches,
    newFailures,
    recurringFailures,
  };
}
