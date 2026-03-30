import type { ReleaseInfo } from '@cnv-monitor/shared';

export const VERSION_COLORS = [
  '#2b9af3',
  '#3e8635',
  '#ec7a08',
  '#6753ac',
  '#c9190b',
  '#009596',
  '#f0ab00',
  '#8a8d90',
];

export const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const toDateStr = (date: Date): string => date.toISOString().split('T')[0];

export type CalendarEvent = {
  version: string;
  shortname: string;
  milestone: string;
  color: string;
};

export type DayEntry = { day: number; dateStr: string };

export type ReleaseCalendarProps = {
  releases: ReleaseInfo[];
  onSelectVersion?: (shortname: string) => void;
};

const MAX_VISIBLE_EVENTS = 3;

export { MAX_VISIBLE_EVENTS };
