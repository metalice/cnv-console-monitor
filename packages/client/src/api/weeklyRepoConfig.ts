import { type CreateWeeklyRepo, type UpdateWeeklyRepo, type WeeklyRepo } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

export const fetchWeeklyRepos = (component?: string): Promise<WeeklyRepo[]> => {
  const query = component ? `?component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/weekly-repos${query}`);
};

export const createWeeklyRepoApi = (data: CreateWeeklyRepo): Promise<WeeklyRepo> =>
  apiPost('/weekly-repos', data);

export const updateWeeklyRepoApi = (id: string, data: UpdateWeeklyRepo): Promise<WeeklyRepo> =>
  apiFetch(`/weekly-repos/${id}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const deleteWeeklyRepoApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/weekly-repos/${id}`, { method: 'DELETE' });
