import { type LaunchGroup } from '@cnv-monitor/shared';

import { type ColumnDef } from '../../hooks/useColumnManagement';

export const DASHBOARD_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'tier', title: 'Tier' },
  { id: 'component', isDefault: false, title: 'Component' },
  { id: 'status', title: 'Status' },
  { id: 'passRate', title: 'Pass Rate' },
  { id: 'tests', title: 'Tests' },
  { id: 'failed', title: 'Failed' },
  { id: 'skipped', isDefault: false, title: 'Skipped' },
  { id: 'lastRun', title: 'Last Run' },
  { id: 'rp', title: 'RP' },
];

export const SORT_ACCESSORS: Record<number, (g: LaunchGroup) => string | number | null> = {
  0: group => group.cnvVersion,
  1: group => group.tier,
  2: group => group.component ?? '',
  3: group => group.latestLaunch.status,
  4: group => group.passRate,
  5: group => group.totalTests,
  6: group => group.failedTests,
  7: group => group.skippedTests,
  8: group => group.latestLaunch.start_time,
};

export const fmtTime = (timestamp: number): string => {
  const dateObj = new Date(timestamp);
  return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};
