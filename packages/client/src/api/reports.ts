import { type TeamReport, type UpdateReportRequest } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (params: Record<string, string | undefined>): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return `?${entries.map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')}`;
};

export const fetchReportList = (component?: string): Promise<TeamReport[]> =>
  apiFetch(`/report${buildQuery({ component })}`);

export const fetchReport = (weekId: string, component?: string): Promise<TeamReport> =>
  apiFetch(`/report/${weekId}${buildQuery({ component })}`);

export const updateReport = (
  weekId: string,
  data: UpdateReportRequest,
  component?: string,
): Promise<TeamReport> =>
  apiFetch(`/report/${weekId}${buildQuery({ component })}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const finalizeReport = (weekId: string, component?: string): Promise<{ success: boolean }> =>
  apiPost(`/report/${weekId}/finalize${buildQuery({ component })}`, {});

export const sendReport = (weekId: string, component?: string): Promise<{ success: boolean }> =>
  apiPost(`/report/${weekId}/send${buildQuery({ component })}`, {});

export const deleteReportApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/report/${id}`, { method: 'DELETE' });
