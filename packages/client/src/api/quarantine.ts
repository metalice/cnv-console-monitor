import type {
  CreateQuarantine,
  QuarantineRecord,
  QuarantineStats,
  ResolveQuarantine,
} from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchQuarantines = (params?: {
  status?: string;
  component?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: QuarantineRecord[]; total: number }> => {
  const qs = new URLSearchParams();
  if (params?.status) {
    qs.set('status', params.status);
  }
  if (params?.component) {
    qs.set('component', params.component);
  }
  if (params?.limit) {
    qs.set('limit', String(params.limit));
  }
  if (params?.offset) {
    qs.set('offset', String(params.offset));
  }
  const query = qs.toString();
  return apiFetch(`/quarantine${query ? `?${query}` : ''}`);
};

export const fetchQuarantineById = (
  id: string,
): Promise<QuarantineRecord & { logs: Record<string, unknown>[] }> => apiFetch(`/quarantine/${id}`);

export const createQuarantineApi = (data: CreateQuarantine): Promise<Record<string, unknown>> =>
  apiFetch('/quarantine', { body: JSON.stringify(data), method: 'POST' });

export const resolveQuarantineApi = (
  id: string,
  data: ResolveQuarantine,
): Promise<Record<string, unknown>> =>
  apiFetch(`/quarantine/${id}/resolve`, { body: JSON.stringify(data), method: 'POST' });

export const approveQuarantineApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/quarantine/${id}/approve`, { method: 'POST' });

export const rejectQuarantineApi = (id: string, reason?: string): Promise<{ success: boolean }> =>
  apiFetch(`/quarantine/${id}/reject`, { body: JSON.stringify({ reason }), method: 'POST' });

export const fetchQuarantineStats = (): Promise<QuarantineStats> => apiFetch('/quarantine/stats');

export const fetchQuarantineHistory = (days = 30): Promise<QuarantineRecord[]> =>
  apiFetch(`/quarantine/history?days=${days}`);
