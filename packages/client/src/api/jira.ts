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

export const createJiraBug = (data: JiraCreateRequest): Promise<JiraCreateResponse> =>
  apiPost('/jira/create', data);

export const linkJiraIssue = (data: JiraLinkRequest): Promise<JiraLinkResponse> =>
  apiPost('/jira/link', data);

export const searchJiraIssues = (query: string): Promise<JiraSearchResult[]> =>
  apiFetch(`/jira/search?q=${encodeURIComponent(query)}`);
