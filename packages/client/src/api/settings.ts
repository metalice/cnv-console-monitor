import type { SettingsResponse } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchSettings(): Promise<SettingsResponse> {
  return apiFetch('/settings');
}

export function updateSettings(patch: Record<string, string>): Promise<{ success: boolean; updated: string[] }> {
  return apiFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}

export function testEmail(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/settings/test-email', { method: 'POST' });
}

export function testSlack(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/settings/test-slack', { method: 'POST' });
}

export function fetchLaunchNames(): Promise<string[]> {
  return apiFetch('/settings/launch-names');
}

export type JiraMeta = {
  projects: Array<{ key: string; name: string }>;
  issueTypes: string[];
  components: string[];
};

export function fetchJiraMeta(project?: string): Promise<JiraMeta> {
  const params = project ? `?project=${encodeURIComponent(project)}` : '';
  return apiFetch(`/settings/jira-meta${params}`);
}

export function fetchRpProjects(): Promise<string[]> {
  return apiFetch('/settings/rp-projects');
}

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

export function testRpConnection(payload?: RpTestPayload): Promise<RpTestResponse> {
  return apiFetch('/settings/test-rp', { method: 'POST', body: JSON.stringify(payload ?? {}) });
}

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

export function testJiraConnection(payload?: JiraTestPayload): Promise<JiraTestResponse> {
  return apiFetch('/settings/test-jira', { method: 'POST', body: JSON.stringify(payload ?? {}) });
}
