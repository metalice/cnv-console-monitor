import { type UpdateReportRequest, type WeeklyReport } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (params: Record<string, string | undefined>): string => {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return `?${entries.map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')}`;
};

export const fetchWeeklyReportList = (component?: string): Promise<WeeklyReport[]> =>
  apiFetch(`/weekly-report${buildQuery({ component })}`);

export const fetchWeeklyReport = (weekId: string, component?: string): Promise<WeeklyReport> =>
  apiFetch(`/weekly-report/${weekId}${buildQuery({ component })}`);

export const updateWeeklyReport = (
  weekId: string,
  data: UpdateReportRequest,
  component?: string,
): Promise<WeeklyReport> =>
  apiFetch(`/weekly-report/${weekId}${buildQuery({ component })}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const finalizeWeeklyReport = (
  weekId: string,
  component?: string,
): Promise<{ success: boolean }> =>
  apiPost(`/weekly-report/${weekId}/finalize${buildQuery({ component })}`, {});

export const sendWeeklyReport = (
  weekId: string,
  component?: string,
): Promise<{ success: boolean }> =>
  apiPost(`/weekly-report/${weekId}/send${buildQuery({ component })}`, {});

export const aiEnhanceReport = (weekId: string, component?: string): Promise<WeeklyReport> =>
  apiPost(`/weekly-report/${weekId}/ai-enhance${buildQuery({ component })}`, {});
