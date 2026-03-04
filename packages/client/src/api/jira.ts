import type { JiraCreateRequest, JiraLinkRequest } from '@cnv-monitor/shared';
import { apiFetch, apiPost } from './client';

export function createJiraBug(data: JiraCreateRequest) {
  return apiPost<{ success: boolean; existing: boolean; issue: { key: string; status: string; summary: string } }>('/jira/create', data);
}

export function linkJiraIssue(data: JiraLinkRequest) {
  return apiPost<{ success: boolean; jiraKey: string; status: string }>('/jira/link', data);
}

export function searchJiraIssues(query: string) {
  return apiFetch<Array<{ key: string; summary: string; status: string }>>(`/jira/search?q=${encodeURIComponent(query)}`);
}
