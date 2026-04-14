import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../utils/retry';

import { createJiraClient } from './jira-auth';

export { buildBugDescription } from './jira-helpers';

const log = logger.child({ module: 'Jira' });

type JiraIssue = {
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

type JiraSearchResult = {
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

const jiraSearchPaginated = async (
  client: ReturnType<typeof createJiraClient>,
  jql: string,
  fields: string[],
  maxResults: number,
): Promise<{ data: { issues: unknown[]; total: number } }> => {
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
};

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

const getIssue = async (key: string): Promise<JiraIssue> => {
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

type WeeklyJiraUser = {
  accountId: string;
  displayName: string;
  emailAddress?: string;
};

type WeeklyJiraChangelogItem = {
  field: string;
  fromString: string | null;
  toString: string | null;
};

type WeeklyJiraChangelogHistory = {
  author: WeeklyJiraUser;
  created: string;
  items: WeeklyJiraChangelogItem[];
};

type WeeklyJiraComment = {
  author: WeeklyJiraUser;
  created: string;
};

export type WeeklyJiraIssue = {
  changelog?: { histories: WeeklyJiraChangelogHistory[] };
  fields: {
    assignee: WeeklyJiraUser | null;
    comment?: { comments: WeeklyJiraComment[]; total: number };
    issuetype: { name: string } | null;
    labels: string[];
    priority: { name: string } | null;
    status: { name: string };
    story_points?: number;
    summary: string;
    updated: string;
  };
  key: string;
  self: string;
};

export const searchTeamTickets = async (
  since: string,
  component?: string,
): Promise<WeeklyJiraIssue[]> => {
  const client = createJiraClient();
  const componentClause = component ? `AND component = "${component}"` : '';
  const jql = `project = "${config.jira.projectKey}" ${componentClause} AND updated >= "${since}"`;
  const fields = [
    'summary',
    'status',
    'assignee',
    'comment',
    'priority',
    'issuetype',
    'labels',
    'updated',
    'story_points',
  ];

  const MAX_RESULTS = 100;

  const fetchPage = async (
    token: string | undefined,
    accumulated: WeeklyJiraIssue[],
  ): Promise<WeeklyJiraIssue[]> => {
    const body: Record<string, unknown> = {
      expand: 'changelog',
      fields,
      jql,
      maxResults: MAX_RESULTS,
    };
    if (token) {
      body.nextPageToken = token;
    }

    const response = await withRetry(
      () => client.post('/search/jql', body),
      'jira.searchTeamTickets',
    );

    const data = response.data as {
      isLast?: boolean;
      issues?: WeeklyJiraIssue[];
      nextPageToken?: string;
    };
    const issues = data.issues ?? [];
    const combined = [...accumulated, ...issues];

    if (data.isLast || !data.nextPageToken || issues.length === 0) {
      return combined;
    }
    return fetchPage(data.nextPageToken, combined);
  };

  const allIssues = await fetchPage(undefined, []);
  log.info({ component, count: allIssues.length, jql }, 'Fetched weekly team Jira tickets');
  return allIssues;
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
