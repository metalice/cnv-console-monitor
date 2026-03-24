import type { TreeNode } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchTree = (component?: string): Promise<TreeNode[]> =>
  apiFetch(`/test-explorer/tree${component ? `?component=${encodeURIComponent(component)}` : ''}`);

export const fetchFileDetail = (
  repoId: string,
  filePath: string,
  branch = 'main',
): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/file/${repoId}/${filePath}?branch=${encodeURIComponent(branch)}`);

export const fetchGaps = (
  component?: string,
): Promise<{ gaps: Record<string, unknown>[]; total: number }> =>
  apiFetch(`/test-explorer/gaps${component ? `?component=${encodeURIComponent(component)}` : ''}`);

export const syncRepo = (repoId: string): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/sync/${repoId}`, { method: 'POST' });

export const syncAllRepos = (): Promise<Record<string, unknown>> =>
  apiFetch('/test-explorer/sync', { method: 'POST' });

export const fetchExplorerStats = (component?: string): Promise<Record<string, unknown>> =>
  apiFetch(`/test-explorer/stats${component ? `?component=${encodeURIComponent(component)}` : ''}`);

export type DraftInfo = {
  id: string;
  user_email: string;
  repo_id: string;
  branch: string;
  file_path: string;
  original_content: string;
  draft_content: string;
  base_commit_sha: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export const fetchUserDrafts = (): Promise<DraftInfo[]> => apiFetch('/test-explorer/drafts');

export const fetchDraftCount = (): Promise<{ count: number }> =>
  apiFetch('/test-explorer/draft-count');

export const fetchDraftPaths = (): Promise<string[]> => apiFetch('/test-explorer/draft-paths');

export const saveDraftApi = (
  repoId: string,
  filePath: string,
  data: {
    branch: string;
    originalContent: string;
    draftContent: string;
    baseCommitSha: string;
  },
): Promise<{ id: string; status: string; updatedAt: string }> =>
  apiFetch(`/test-explorer/draft/${repoId}/${filePath}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const deleteDraftApi = (
  repoId: string,
  filePath: string,
  branch = 'main',
): Promise<{ success: boolean }> =>
  apiFetch(`/test-explorer/draft/${repoId}/${filePath}?branch=${encodeURIComponent(branch)}`, {
    method: 'DELETE',
  });

export const submitDraftsApi = (data: {
  draftIds: string[];
  prTitle: string;
  prDescription?: string;
}): Promise<{ success: boolean; prUrl: string; prNumber: number; filesCommitted: number }> =>
  apiFetch('/test-explorer/submit-drafts', { body: JSON.stringify(data), method: 'POST' });
