import type { MilestoneType, ReleaseInfo } from '@cnv-monitor/shared';

export type ZoomLevel = '3m' | '6m' | '1y' | '2y';

export const ZOOM_DAYS: Record<ZoomLevel, number> = {
  '1y': 365,
  '2y': 730,
  '3m': 90,
  '6m': 180,
};

export const PHASE_COLORS: Record<string, string> = {
  'Blockers Only': '#c9190b',
  'Code Freeze': '#6753ac',
  Development: '#2b9af3',
  'Feature Freeze': '#f0ab00',
  GA: '#3e8635',
  Maintenance: '#009596',
  Planning: '#8a8d90',
};

export const MILESTONE_SHAPES: Record<
  MilestoneType,
  { color: string; label: string; symbol: string }
> = {
  batch: {
    color: 'var(--pf-t--global--color--status--info--default, #2b9af3)',
    label: 'Z-Stream Release',
    symbol: '●',
  },
  blockers_only: {
    color: 'var(--pf-t--global--color--status--danger--default, #c9190b)',
    label: 'Blockers Only',
    symbol: '▲',
  },
  code_freeze: {
    color: 'var(--pf-t--global--color--status--warning--default, #ec7a08)',
    label: 'Code Freeze',
    symbol: '■',
  },
  custom: {
    color: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
    label: 'KubeVirt CF',
    symbol: '◇',
  },
  feature_freeze: {
    color: 'var(--pf-t--global--color--status--warning--default, #f0ab00)',
    label: 'Feature Freeze',
    symbol: '◆',
  },
  ga: {
    color: 'var(--pf-t--global--color--status--danger--default, #c9190b)',
    label: 'GA Release',
    symbol: '★',
  },
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const ROW_HEIGHT = 72;
export const HEADER_HEIGHT = 40;
export const BAR_HEIGHT = 28;

export const toDay = (dateInput: string | Date): number => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const extractShortVersion = (name: string): string => {
  const match = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(name);
  return match
    ? match[1]
    : name
        .replace(/^Batch\s+/, '')
        .replace(/GA.*$/, '')
        .trim();
};

export type ReleaseGanttProps = {
  releases: ReleaseInfo[] | undefined;
  isLoading: boolean;
  selectedVersion?: string | null;
  onSelectVersion: (shortname: string) => void;
};
