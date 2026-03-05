import type { JiraCreateRequest, JiraLinkRequest } from '@cnv-monitor/shared';
import { apiFetch, apiPost } from './client';

type JiraCreateResponse = {
  success: boolean;
  existing: boolean;
  issue: { key: string; status: string; summary: string };
};

type JiraLinkResponse = {
  success: boolean;
  jiraKey: string;
  status: string;
};

type JiraSearchResult = {
  key: string;
  summary: string;
  status: string;
};

export function createJiraBug(data: JiraCreateRequest): Promise<JiraCreateResponse> {
  return apiPost('/jira/create', data);
}

export function linkJiraIssue(data: JiraLinkRequest): Promise<JiraLinkResponse> {
  return apiPost('/jira/link', data);
}

export function searchJiraIssues(query: string): Promise<JiraSearchResult[]> {
  return apiFetch(`/jira/search?q=${encodeURIComponent(query)}`);
}
