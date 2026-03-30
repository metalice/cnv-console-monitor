import type { MilestoneType, ReleaseInfo } from '@cnv-monitor/shared';

export type ZoomLevel = '3m' | '6m' | '1y' | '2y';

export const ZOOM_DAYS: Record<ZoomLevel, number> = {
  '1y': 365,
  '2y': 730,
  '3m': 90,
  '6m': 180,
};

export const PHASE_COLORS: Record<string, string> = {
  Concept: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  Maintenance: 'var(--pf-t--global--color--status--success--default, #3e8635)',
  'Planning / Development / Testing': 'var(--pf-t--global--color--status--info--default, #2b9af3)',
};

export const MILESTONE_SHAPES: Record<MilestoneType, { color: string; symbol: string }> = {
  batch: { color: '#2b9af3', symbol: '●' },
  blockers_only: { color: '#c9190b', symbol: '▲' },
  code_freeze: { color: '#ec7a08', symbol: '■' },
  custom: { color: '#6753ac', symbol: '◆' },
  feature_freeze: { color: '#f0ab00', symbol: '◆' },
  ga: { color: '#c9190b', symbol: '★' },
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const ROW_HEIGHT = 62;
export const HEADER_HEIGHT = 40;
export const BAR_HEIGHT = 20;

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
