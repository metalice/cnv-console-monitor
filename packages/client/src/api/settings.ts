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
  projects: string[];
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

export function testRpConnection(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/settings/test-rp', { method: 'POST' });
}

export function testJiraConnection(): Promise<{ success: boolean; message: string }> {
  return apiFetch('/settings/test-jira', { method: 'POST' });
}
