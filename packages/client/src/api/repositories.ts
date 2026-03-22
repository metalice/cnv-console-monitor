import type { Repository, CreateRepository, UpdateRepository } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchRepositories = (): Promise<Repository[]> =>
  apiFetch('/repositories');

export const fetchRepository = (id: string): Promise<Repository> =>
  apiFetch(`/repositories/${id}`);

export const createRepositoryApi = (data: CreateRepository): Promise<Repository> =>
  apiFetch('/repositories', { method: 'POST', body: JSON.stringify(data) });

export const updateRepositoryApi = (id: string, data: UpdateRepository): Promise<Repository> =>
  apiFetch(`/repositories/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteRepositoryApi = (id: string): Promise<{ success: boolean }> =>
  apiFetch(`/repositories/${id}`, { method: 'DELETE' });

export const testRepositoryConnection = (id: string): Promise<{ success: boolean; fileCount: number }> =>
  apiFetch(`/repositories/${id}/test`, { method: 'POST' });

export const resolveGitLabProject = (repoUrl: string, apiBaseUrl: string): Promise<{ projectId: string; name: string; defaultBranch: string }> =>
  apiFetch('/repositories/resolve-project', { method: 'POST', body: JSON.stringify({ repoUrl, apiBaseUrl, provider: 'gitlab' }) });

export const fetchRepoBranches = (apiBaseUrl: string, projectId: string, provider: string): Promise<{ branches: string[] }> =>
  apiFetch('/repositories/resolve-branches', { method: 'POST', body: JSON.stringify({ apiBaseUrl, projectId, provider }) });
