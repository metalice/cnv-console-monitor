import type { SettingsResponse } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchSettings = (): Promise<SettingsResponse> => apiFetch('/settings');

export const updateSettings = (
  patch: Record<string, string>,
): Promise<{ success: boolean; updated: string[] }> =>
  apiFetch('/settings', {
    body: JSON.stringify(patch),
    method: 'PUT',
  });

export const testEmail = (): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-email', { method: 'POST' });

export const testSlack = (): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-slack', { method: 'POST' });

export const fetchLaunchNames = (): Promise<string[]> => apiFetch('/settings/launch-names');

export type JiraMeta = {
  projects: { key: string; name: string }[];
  issueTypes: string[];
  components: string[];
};

export const fetchJiraMeta = (project?: string): Promise<JiraMeta> => {
  const params = project ? `?project=${encodeURIComponent(project)}` : '';
  return apiFetch(`/settings/jira-meta${params}`);
};

export const fetchRpProjects = (): Promise<string[]> => apiFetch('/settings/rp-projects');

export type RpTestPayload = {
  url?: string;
  project?: string;
  token?: string;
};

export type RpTestResponse = {
  success: boolean;
  message: string;
  projects?: string[];
  launchNames?: string[];
};

export const testRpConnection = (payload?: RpTestPayload): Promise<RpTestResponse> =>
  apiFetch('/settings/test-rp', { body: JSON.stringify(payload ?? {}), method: 'POST' });

export type JiraTestPayload = {
  url?: string;
  token?: string;
  projectKey?: string;
};

export type JiraTestResponse = {
  success: boolean;
  message: string;
  projects?: { key: string; name: string }[];
  issueTypes?: string[];
  components?: string[];
};

export const testJiraConnection = (payload?: JiraTestPayload): Promise<JiraTestResponse> =>
  apiFetch('/settings/test-jira', { body: JSON.stringify(payload ?? {}), method: 'POST' });

export type JenkinsTestResponse = { success: boolean; message: string };

export const testJenkinsConnection = (payload?: {
  user?: string;
  token?: string;
}): Promise<JenkinsTestResponse> =>
  apiFetch('/settings/test-jenkins', { body: JSON.stringify(payload ?? {}), method: 'POST' });

export const testGitLabConnection = (payload?: {
  token?: string;
}): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-gitlab', { body: JSON.stringify(payload ?? {}), method: 'POST' });

export const testGitHubConnection = (payload?: {
  token?: string;
}): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-github', { body: JSON.stringify(payload ?? {}), method: 'POST' });

export type SettingsLogEntry = {
  id: number;
  key: string;
  old_value: string | null;
  new_value: string;
  changed_by: string | null;
  changed_at: string;
};

export const fetchSettingsChangelog = (): Promise<SettingsLogEntry[]> =>
  apiFetch('/settings/changelog');
