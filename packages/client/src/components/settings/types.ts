import type { SearchableSelectOption } from '../common/SearchableSelect';

export type AlertMessage = { type: 'success' | 'danger'; text: string };

export type SettingsSectionProps = {
  val: (key: string) => string;
  set: (key: string, settingValue: string) => void;
  adminOnly: boolean;
};

export type TokenEditHandlers = {
  tokenEditing: Record<string, boolean>;
  startTokenEdit: (key: string) => void;
  endTokenEdit: (key: string) => void;
};

export type UserRecord = {
  email: string;
  name: string;
  role: string;
  lastLogin: string | null;
  createdAt: string;
};

export const LOOKBACK_OPTIONS: SearchableSelectOption[] = [
  { label: '1 week', value: '7' },
  { label: '2 weeks', value: '14' },
  { label: '1 month', value: '30' },
  { label: '2 months', value: '60' },
  { label: '3 months', value: '90' },
  { label: '6 months', value: '180' },
  { label: '1 year', value: '365' },
];

export const POLL_INTERVAL_OPTIONS: SearchableSelectOption[] = [
  { label: 'Every 5 minutes', value: '5' },
  { label: 'Every 10 minutes', value: '10' },
  { label: 'Every 15 minutes', value: '15' },
  { label: 'Every 30 minutes', value: '30' },
  { label: 'Every hour', value: '60' },
];

export const isMaskedValue = (value: string): boolean =>
  value.includes('...') || value.includes('••••');

export const toOptions = (values: string[]): SearchableSelectOption[] =>
  values.map(value => ({ label: value, value }));

export const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
