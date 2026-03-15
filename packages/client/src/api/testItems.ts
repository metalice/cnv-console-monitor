import type { TestItem, LogEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchTestItems = (launchId: number, status?: string): Promise<TestItem[]> => {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/test-items/launch/${launchId}${params}`);
};

export const fetchTestItemsForLaunches = (launchIds: number[]): Promise<TestItem[]> =>
  apiFetch(`/test-items/launches?ids=${launchIds.join(',')}`);

export const fetchUntriagedItems = (hours = 24): Promise<TestItem[]> =>
  apiFetch(`/test-items/untriaged?hours=${hours}`);

export const fetchUntriagedForDate = (dateStr: string): Promise<TestItem[]> => {
  const since = new Date(dateStr + 'T00:00:00').getTime();
  const until = since + 24 * 60 * 60 * 1000;
  return apiFetch(`/test-items/untriaged?since=${since}&until=${until}`);
};

export const fetchUntriagedForRange = (since: number, until: number, component?: string): Promise<TestItem[]> => {
  const componentParam = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/test-items/untriaged?since=${since}&until=${until}${componentParam}`);
};

export const fetchTestItemHistory = (uniqueId: string, limit = 20): Promise<TestItem[]> =>
  apiFetch(`/test-items/history/${encodeURIComponent(uniqueId)}?limit=${limit}`);

export const fetchTestItemLogs = (itemId: number, level = 'ERROR'): Promise<{ content: LogEntry[]; page: { totalElements: number } }> =>
  apiFetch(`/test-items/${itemId}/logs?level=${level}`);

export type StreakInfo = {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: Array<{ status: string; date: string }>;
};

export const fetchStreaks = (uniqueIds: string[]): Promise<Record<string, StreakInfo>> =>
  apiFetch(`/test-items/streaks?uniqueIds=${uniqueIds.map(encodeURIComponent).join(',')}`);
