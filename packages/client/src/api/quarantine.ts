import type { CreateQuarantine, QuarantineRecord, QuarantineStats } from '@cnv-monitor/shared';

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

export const createQuarantineApi = (data: CreateQuarantine): Promise<Record<string, unknown>> =>
  apiFetch('/quarantine', { body: JSON.stringify(data), method: 'POST' });

export const fetchQuarantineStats = (): Promise<QuarantineStats> => apiFetch('/quarantine/stats');
