import { config } from '../config';
import { withRetry } from '../utils/retry';
import { createJiraClient } from './jira-auth';

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

export const searchIssues = async (jql: string, maxResults = 10): Promise<JiraSearchResult> => {
  const client = createJiraClient();
  const fields = ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'labels'];
  const response = await withRetry(
    () => jiraSearch(client, jql, fields, maxResults, 0),
    'jira.searchIssues',
  );
  return response.data;
}

let useNewSearchEndpoint = false;

export const jiraSearch = async (
  client: ReturnType<typeof createJiraClient>,
  jql: string,
  fields: string[],
  maxResults: number,
  startAt: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: { issues: any[]; total: number } }> => {
  if (!useNewSearchEndpoint) {
    try {
      return await client.post('/search', { jql, maxResults, startAt, fields });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 410) {
        useNewSearchEndpoint = true;
      } else {
        throw err;
      }
    }
  }
  return jiraSearchPaginated(client, jql, fields, maxResults);
}

async function jiraSearchPaginated(
  client: ReturnType<typeof createJiraClient>,
  jql: string,
  fields: string[],
  maxResults: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: { issues: any[]; total: number } }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allIssues: any[] = [];
  let nextPageToken: string | undefined;
  let total = 0;

  do {
    const params = new URLSearchParams({ jql, maxResults: String(maxResults), fields: fields.join(',') });
    if (nextPageToken) params.set('nextPageToken', nextPageToken);
    const response = await client.get(`/search/jql?${params.toString()}`);
    const data = response.data;
    total = data.total || 0;
    const issues = data.issues || data.values || [];
    allIssues.push(...issues);
    nextPageToken = data.nextPageToken;
    if (issues.length === 0) break;
  } while (nextPageToken);

  return { data: { issues: allIssues, total: total || allIssues.length } };
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
  const client = createJiraClient();

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
  const client = createJiraClient();
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
