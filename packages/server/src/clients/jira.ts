import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';

import { createJiraClient } from './jira-auth';

export { buildBugDescription } from './jira-helpers';

const log = logger.child({ module: 'Jira' });

export type JiraIssue = {
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
};

export type JiraSearchResult = {
  issues: JiraIssue[];
  total: number;
};

export const searchIssues = async (jql: string, maxResults = 10): Promise<JiraSearchResult> => {
  const client = createJiraClient();
  const fields = ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'labels'];
  const response = await withRetry(
    () => jiraSearch(client, jql, fields, maxResults, 0),
    'jira.searchIssues',
  );
  return response.data as JiraSearchResult;
};

let useNewSearchEndpoint = false;

export const jiraSearch = async (
  client: ReturnType<typeof createJiraClient>,
  jql: string,
  fields: string[],
  maxResults: number,
  startAt: number,
): Promise<{ data: { issues: unknown[]; total: number } }> => {
  if (!useNewSearchEndpoint) {
    try {
      return await client.post('/search', { fields, jql, maxResults, startAt });
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 410) {
        useNewSearchEndpoint = true;
      } else {
        throw err;
      }
    }
  }
  return jiraSearchPaginated(client, jql, fields, maxResults);
};

async function jiraSearchPaginated(
  client: ReturnType<typeof createJiraClient>,
  jql: string,
  fields: string[],
  maxResults: number,
): Promise<{ data: { issues: unknown[]; total: number } }> {
  const allIssues: unknown[] = [];
  let nextPageToken: string | undefined;
  let total: number;

  do {
    const params = new URLSearchParams({
      fields: fields.join(','),
      jql,
      maxResults: String(maxResults),
    });
    if (nextPageToken) {
      params.set('nextPageToken', nextPageToken);
    }
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const response = await client.get(`/search/jql?${params.toString()}`);
    const data = response.data as {
      total?: number;
      issues?: unknown[];
      values?: unknown[];
      nextPageToken?: string;
    };
    total = data.total ?? 0;
    const issues = data.issues ?? data.values ?? [];
    allIssues.push(...issues);
    nextPageToken = data.nextPageToken;
    if (issues.length === 0) {
      break;
    }
  } while (nextPageToken);

  return { data: { issues: allIssues, total: total || allIssues.length } };
}

export const findExistingIssue = async (
  testName: string,
  polarionId?: string,
): Promise<JiraIssue | null> => {
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
  } catch (err) {
    log.warn({ err, testName }, 'Failed to search for existing Jira issue');
    return null;
  }
};

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
    description: params.description,
    issuetype: { name: config.jira.issueType },
    project: { key: config.jira.projectKey },
    summary: params.summary,
  };

  if (params.labels?.length) {
    fields.labels = params.labels;
  }

  if (params.component) {
    fields.components = [{ name: params.component }];
  }

  const response = await withRetry(() => client.post('/issue', { fields }), 'jira.createIssue');
  const created = response.data as { key: string; id: string; self: string };

  if (params.rpItemUrl) {
    try {
      await client.post(`/issue/${created.key}/remotelink`, {
        object: {
          icon: { url16x16: `${config.reportportal.url}/favicon.ico` },
          title: 'ReportPortal Test Item',
          url: params.rpItemUrl,
        },
      });
    } catch (err) {
      log.warn({ err, key: created.key }, 'Failed to add RP remote link to Jira issue');
    }
  }

  return {
    ...created,
    fields: {
      created: new Date().toISOString(),
      labels: params.labels,
      status: { name: 'Open' },
      summary: params.summary,
      updated: new Date().toISOString(),
    },
  };
};

export const getIssue = async (key: string): Promise<JiraIssue> => {
  const client = createJiraClient();
  const response = await withRetry(
    () =>
      client.get(`/issue/${key}`, {
        params: { fields: 'summary,status,assignee,created,updated,labels' },
      }),
    `jira.getIssue(${key})`,
  );
  return response.data as JiraIssue;
};

export const getIssueStatus = async (key: string): Promise<string> => {
  try {
    const issue = await getIssue(key);
    return issue.fields.status.name;
  } catch (err) {
    log.warn({ err, key }, 'Failed to fetch Jira issue status');
    return 'Unknown';
  }
};

export const createIssueWithToken = async (
  personalToken: string,
  params: {
    summary: string;
    description: string;
    labels?: string[];
    component?: string;
  },
): Promise<JiraIssue> => {
  const { createJiraClient: makeClient } = await import('./jira-auth');
  const client = makeClient({ token: personalToken });

  const fields: Record<string, unknown> = {
    description: params.description,
    issuetype: { name: config.jira.issueType },
    project: { key: config.jira.projectKey },
    summary: params.summary,
  };

  if (params.labels?.length) {
    fields.labels = params.labels;
  }
  if (params.component) {
    fields.components = [{ name: params.component }];
  }

  const response = await withRetry(
    () => client.post('/issue', { fields }),
    'jira.createIssueWithToken',
  );
  const created = response.data as { key: string; id: string; self: string };

  return {
    ...created,
    fields: {
      created: new Date().toISOString(),
      labels: params.labels,
      status: { name: 'Open' },
      summary: params.summary,
      updated: new Date().toISOString(),
    },
  };
};
