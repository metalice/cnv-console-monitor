import type { CreateQuarantine, QuarantineRecord, QuarantineStats } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchQuarantines = (params?: {
  status?: string;
  component?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: QuarantineRecord[]; total: number }> => {
  const searchParams = new URLSearchParams();
  if (params?.status) {
    searchParams.set('status', params.status);
  }
  if (params?.component) {
    searchParams.set('component', params.component);
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }
  if (params?.offset) {
    searchParams.set('offset', String(params.offset));
  }
  const query = searchParams.toString();
  return apiFetch(`/quarantine${query ? `?${query}` : ''}`);
};

export const createQuarantineApi = (data: CreateQuarantine): Promise<Record<string, unknown>> =>
  apiFetch('/quarantine', { body: JSON.stringify(data), method: 'POST' });

export const fetchQuarantineStats = (): Promise<QuarantineStats> => apiFetch('/quarantine/stats');
