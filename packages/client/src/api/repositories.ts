import type { CreateRepository, Repository, UpdateRepository } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchRepositories = (): Promise<Repository[]> => apiFetch('/repositories');

export const createRepositoryApi = (data: CreateRepository): Promise<Repository> =>
  apiFetch('/repositories', { body: JSON.stringify(data), method: 'POST' });

export const updateRepositoryApi = (id: string, data: UpdateRepository): Promise<Repository> =>
  apiFetch(`/repositories/${id}`, { body: JSON.stringify(data), method: 'PUT' });

export const deleteRepositoryApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/repositories/${id}`, { method: 'DELETE' });

export const testRepositoryConnection = (
  id: string,
): Promise<{ success: boolean; fileCount: number }> =>
  apiFetch(`/repositories/${id}/test`, { method: 'POST' });
