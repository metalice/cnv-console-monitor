import { type CreateReportRepo, type ReportRepo, type UpdateReportRepo } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

export const fetchReportRepos = (component?: string): Promise<ReportRepo[]> => {
  const query = component ? `?component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/report-repos${query}`);
};

export const createReportRepoApi = (data: CreateReportRepo): Promise<ReportRepo> =>
  apiPost('/report-repos', data);

export const updateReportRepoApi = (id: string, data: UpdateReportRepo): Promise<ReportRepo> =>
  apiFetch(`/report-repos/${id}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const deleteReportRepoApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/report-repos/${id}`, { method: 'DELETE' });
