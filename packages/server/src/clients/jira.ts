import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config } from '../config';
import { withRetry } from '../utils/retry';

export { buildBugDescription } from './jira-helpers';

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    status: { name: string };
    assignee?: { displayName: string };
    created: string;
    updated: string;
    description?: string;
    labels?: string[];
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const createClient = (): AxiosInstance => {
  return axios.create({
    baseURL: `${config.jira.url}/rest/api/2`,
    headers: {
      Authorization: `Bearer ${config.jira.token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
    httpsAgent,
  });
}

export const searchIssues = async (jql: string, maxResults = 10): Promise<JiraSearchResult> => {
  const client = createClient();
  const response = await withRetry(
    () => client.post('/search', {
      jql,
      maxResults,
      fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'labels'],
    }),
    'jira.searchIssues',
  );
  return response.data;
}

export const findExistingIssue = async (testName: string, polarionId?: string): Promise<JiraIssue | null> => {
  const searchTerms: string[] = [];

  if (polarionId) {
    searchTerms.push(`text ~ "${polarionId}"`);
  }

  const shortName = testName.split('.').pop() || testName;
  searchTerms.push(`summary ~ "${shortName.substring(0, 100)}"`);

  const jql = `project = ${config.jira.projectKey} AND (${searchTerms.join(' OR ')}) AND status NOT IN (Closed, Done) ORDER BY updated DESC`;

  try {
    const result = await searchIssues(jql, 5);
    return result.issues.length > 0 ? result.issues[0] : null;
  } catch {
    return null;
  }
}

export const createIssue = async (params: {
  summary: string;
  description: string;
  labels?: string[];
  component?: string;
  rpLaunchUrl?: string;
  rpItemUrl?: string;
}): Promise<JiraIssue> => {
  const client = createClient();

  const fields: Record<string, unknown> = {
    project: { key: config.jira.projectKey },
    issuetype: { name: config.jira.issueType },
    summary: params.summary,
    description: params.description,
  };

  if (params.labels?.length) {
    fields.labels = params.labels;
  }

  if (params.component) {
    fields.components = [{ name: params.component }];
  }

  const response = await withRetry(
    () => client.post('/issue', { fields }),
    'jira.createIssue',
  );
  const created = response.data as { key: string; id: string; self: string };

  if (params.rpItemUrl) {
    try {
      await client.post(`/issue/${created.key}/remotelink`, {
        object: {
          url: params.rpItemUrl,
          title: 'ReportPortal Test Item',
          icon: { url16x16: `${config.reportportal.url}/favicon.ico` },
        },
      });
    } catch {
      // non-critical
    }
  }

  return {
    ...created,
    fields: {
      summary: params.summary,
      status: { name: 'Open' },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      labels: params.labels,
    },
  };
}

export const getIssue = async (key: string): Promise<JiraIssue> => {
  const client = createClient();
  const response = await withRetry(
    () => client.get(`/issue/${key}`, {
      params: { fields: 'summary,status,assignee,created,updated,labels' },
    }),
    `jira.getIssue(${key})`,
  );
  return response.data;
}

export const getIssueStatus = async (key: string): Promise<string> => {
  try {
    const issue = await getIssue(key);
    return issue.fields.status.name;
  } catch {
    return 'Unknown';
  }
}
