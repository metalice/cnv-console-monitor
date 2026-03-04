import type { TestItem, LogEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchTestItems(launchId: number, status?: string): Promise<TestItem[]> {
  const params = status ? `?status=${status}` : '';
  return apiFetch(`/test-items/launch/${launchId}${params}`);
}

export function fetchUntriagedItems(hours = 24): Promise<TestItem[]> {
  return apiFetch(`/test-items/untriaged?hours=${hours}`);
}

export function fetchTestItemHistory(uniqueId: string, limit = 20): Promise<TestItem[]> {
  return apiFetch(`/test-items/history/${encodeURIComponent(uniqueId)}?limit=${limit}`);
}

export function fetchTestItemLogs(itemId: number, level = 'ERROR'): Promise<{ content: LogEntry[]; page: { totalElements: number } }> {
  return apiFetch(`/test-items/${itemId}/logs?level=${level}`);
}
