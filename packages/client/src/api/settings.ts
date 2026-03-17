import type { SettingsResponse } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchSettings = (): Promise<SettingsResponse> =>
  apiFetch('/settings');

export const updateSettings = (patch: Record<string, string>): Promise<{ success: boolean; updated: string[] }> =>
  apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });

export const testEmail = (): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-email', { method: 'POST' });

export const testSlack = (): Promise<{ success: boolean; message: string }> =>
  apiFetch('/settings/test-slack', { method: 'POST' });

export const fetchLaunchNames = (): Promise<string[]> =>
  apiFetch('/settings/launch-names');

export type JiraMeta = {
  projects: Array<{ key: string; name: string }>;
  issueTypes: string[];
  components: string[];
};

export const fetchJiraMeta = (project?: string): Promise<JiraMeta> => {
  const params = project ? `?project=${encodeURIComponent(project)}` : '';
  return apiFetch(`/settings/jira-meta${params}`);
};

export const fetchRpProjects = (): Promise<string[]> =>
  apiFetch('/settings/rp-projects');

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
  apiFetch('/settings/test-rp', { method: 'POST', body: JSON.stringify(payload ?? {}) });

export type JiraTestPayload = {
  url?: string;
  token?: string;
  projectKey?: string;
};

export type JiraTestResponse = {
  success: boolean;
  message: string;
  projects?: Array<{ key: string; name: string }>;
  issueTypes?: string[];
  components?: string[];
};

export const testJiraConnection = (payload?: JiraTestPayload): Promise<JiraTestResponse> =>
  apiFetch('/settings/test-jira', { method: 'POST', body: JSON.stringify(payload ?? {}) });

export type JenkinsTestResponse = { success: boolean; message: string };

export const testJenkinsConnection = (payload?: { user?: string; token?: string }): Promise<JenkinsTestResponse> =>
  apiFetch('/settings/test-jenkins', { method: 'POST', body: JSON.stringify(payload ?? {}) });
