import type { ReleaseInfo } from '@cnv-monitor/shared';

import type { ColumnDef } from '../../hooks/useColumnManagement';

export const TIMELINE_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'phase', title: 'Phase' },
  { id: 'gaDate', title: 'GA Date' },
  { id: 'zStream', title: 'Current Z-Stream' },
  { id: 'lastReleased', title: 'Last Released' },
  { id: 'nextRelease', title: 'Next Release' },
  { id: 'countdown', title: 'Countdown' },
  { id: 'releases', title: 'Releases' },
];

export const SORT_ACCESSORS: Record<number, (r: ReleaseInfo) => string | number | null> = {
  0: release => release.shortname,
  1: release => release.phase,
  2: release => (release.gaDate ? new Date(release.gaDate).getTime() : null),
  3: release => release.currentZStream,
  4: release =>
    release.currentZStreamDate ? new Date(release.currentZStreamDate).getTime() : null,
  5: release => (release.nextRelease ? new Date(release.nextRelease.date).getTime() : null),
  6: release => release.daysUntilNext,
  7: release => release.milestones.filter(milestone => milestone.isPast).length,
};

const COUNTDOWN_THRESHOLDS = { caution: 14, critical: 3, warning: 7 } as const;

export const countdownColor = (days: number | null): 'grey' | 'orange' | 'red' | 'yellow' => {
  if (days === null) return 'grey';
  if (days <= COUNTDOWN_THRESHOLDS.critical) return 'red';
  if (days <= COUNTDOWN_THRESHOLDS.warning) return 'orange';
  if (days <= COUNTDOWN_THRESHOLDS.caution) return 'yellow';
  return 'grey';
};

export const countdownLabel = (days: number | null, nextName?: string | null): string => {
  if (days === null) {
    return 'No upcoming';
  }
  const shortName = nextName
    ?.replace(/Batch |GA Stable Release|Development Cutoff/g, '')
    .replace(/CNV-/i, '')
    .trim();
  return shortName ? `${days}d to ${shortName}` : `${days}d`;
};

export const fmtDate = (dateStr: string | null): string =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '--';

export const extractVersion = (name: string): string => {
  const match = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(name);
  return match
    ? match[1]
    : name
        .replace(/^Batch\s+/, '')
        .replace(/GA.*$/, '')
        .trim();
};

export type ReleaseTimelineProps = {
  releases: ReleaseInfo[] | undefined;
  isLoading: boolean;
  selectedVersion?: string | null;
  onSelectVersion?: (shortname: string) => void;
};
