import type { TreeNode } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchTree = (component?: string): Promise<TreeNode[]> =>
  apiFetch(`/test-explorer/tree${component ? `?component=${encodeURIComponent(component)}` : ''}`);

export const fetchFileDetail = (repoId: string, filePath: string, branch = 'main'): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/file/${repoId}/${filePath}?branch=${encodeURIComponent(branch)}`);

export const fetchGaps = (component?: string): Promise<{ gaps: Array<Record<string, unknown>>; total: number }> =>
  apiFetch(`/test-explorer/gaps${component ? `?component=${encodeURIComponent(component)}` : ''}`);

export const syncRepo = (repoId: string): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/sync/${repoId}`, { method: 'POST' });

export const syncAllRepos = (): Promise<Record<string, unknown>> =>
  apiFetch('/test-explorer/sync', { method: 'POST' });

export const fetchExplorerStats = (component?: string): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/stats${component ? `?component=${encodeURIComponent(component)}` : ''}`);
