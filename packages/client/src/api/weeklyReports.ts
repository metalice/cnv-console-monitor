import { type UpdateReportRequest, type WeeklyReport } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (component?: string): string =>
  component ? `?component=${encodeURIComponent(component)}` : '';

export const fetchWeeklyReportList = (component?: string): Promise<WeeklyReport[]> =>
  apiFetch(`/weekly-report${buildQuery(component)}`);

export const fetchCurrentWeeklyReport = (component?: string): Promise<WeeklyReport | null> =>
  apiFetch(`/weekly-report/current${buildQuery(component)}`);

export const fetchWeeklyReport = (weekId: string): Promise<WeeklyReport> =>
  apiFetch(`/weekly-report/${weekId}`);

export const updateWeeklyReport = (
  weekId: string,
  data: UpdateReportRequest,
): Promise<WeeklyReport> =>
  apiFetch(`/weekly-report/${weekId}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const finalizeWeeklyReport = (weekId: string): Promise<{ success: boolean }> =>
  apiPost(`/weekly-report/${weekId}/finalize`, {});

export const sendWeeklyReport = (weekId: string): Promise<{ success: boolean }> =>
  apiPost(`/weekly-report/${weekId}/send`, {});

export const aiEnhanceReport = (weekId: string, component?: string): Promise<WeeklyReport> =>
  apiPost(`/weekly-report/${weekId}/ai-enhance${buildQuery(component)}`, {});
