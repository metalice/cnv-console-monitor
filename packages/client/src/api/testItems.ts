import type { TestItem, LogEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchTestItems(launchId: number, status?: string): Promise<TestItem[]> {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/test-items/launch/${launchId}${params}`);
}

export function fetchTestItemsForLaunches(launchIds: number[]): Promise<TestItem[]> {
  return apiFetch(`/test-items/launches?ids=${launchIds.join(',')}`);
}

export function fetchUntriagedItems(hours = 24): Promise<TestItem[]> {
  return apiFetch(`/test-items/untriaged?hours=${hours}`);
}

export function fetchUntriagedForDate(dateStr: string): Promise<TestItem[]> {
  const since = new Date(dateStr + 'T00:00:00').getTime();
  const until = since + 24 * 60 * 60 * 1000;
  return apiFetch(`/test-items/untriaged?since=${since}&until=${until}`);
}

export function fetchUntriagedForRange(since: number, until: number, component?: string): Promise<TestItem[]> {
  const comp = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/test-items/untriaged?since=${since}&until=${until}${comp}`);
}

export function fetchTestItemHistory(uniqueId: string, limit = 20): Promise<TestItem[]> {
  return apiFetch(`/test-items/history/${encodeURIComponent(uniqueId)}?limit=${limit}`);
}

export function fetchTestItemLogs(itemId: number, level = 'ERROR'): Promise<{ content: LogEntry[]; page: { totalElements: number } }> {
  return apiFetch(`/test-items/${itemId}/logs?level=${level}`);
}

export type StreakInfo = {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: Array<{ status: string; date: string }>;
};

export function fetchStreaks(uniqueIds: string[]): Promise<Record<string, StreakInfo>> {
  return apiFetch(`/test-items/streaks?uniqueIds=${uniqueIds.map(encodeURIComponent).join(',')}`);
}
