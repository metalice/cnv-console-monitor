import axios, { AxiosInstance } from 'axios';
import { config } from '../config';

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

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: `${config.jira.url}/rest/api/2`,
    headers: {
      Authorization: `Bearer ${config.jira.token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}

export async function searchIssues(jql: string, maxResults = 10): Promise<JiraSearchResult> {
  const client = createClient();
  const response = await client.post('/search', {
    jql,
    maxResults,
    fields: ['summary', 'status', 'assignee', 'created', 'updated', 'description', 'labels'],
  });
  return response.data;
}

export async function findExistingIssue(testName: string, polarionId?: string): Promise<JiraIssue | null> {
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

export async function createIssue(params: {
  summary: string;
  description: string;
  labels?: string[];
  component?: string;
  rpLaunchUrl?: string;
  rpItemUrl?: string;
}): Promise<JiraIssue> {
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

  const response = await client.post('/issue', { fields });
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

export async function getIssue(key: string): Promise<JiraIssue> {
  const client = createClient();
  const response = await client.get(`/issue/${key}`, {
    params: { fields: 'summary,status,assignee,created,updated,labels' },
  });
  return response.data;
}

export async function getIssueStatus(key: string): Promise<string> {
  try {
    const issue = await getIssue(key);
    return issue.fields.status.name;
  } catch {
    return 'Unknown';
  }
}

export function buildBugDescription(params: {
  testName: string;
  polarionId?: string;
  launchName: string;
  cnvVersion?: string;
  ocpVersion?: string;
  clusterName?: string;
  errorMessage?: string;
  rpLaunchUrl: string;
  rpItemUrl: string;
}): string {
  const lines = [
    `h2. Automated Test Failure`,
    ``,
    `*Test:* ${params.testName}`,
  ];

  if (params.polarionId) lines.push(`*Polarion ID:* ${params.polarionId}`);
  lines.push(`*Launch:* ${params.launchName}`);
  if (params.cnvVersion) lines.push(`*CNV Version:* ${params.cnvVersion}`);
  if (params.ocpVersion) lines.push(`*OCP Version:* ${params.ocpVersion}`);
  if (params.clusterName) lines.push(`*Cluster:* ${params.clusterName}`);
  lines.push('');
  lines.push(`*ReportPortal:* [Launch|${params.rpLaunchUrl}] | [Test Item|${params.rpItemUrl}]`);

  if (params.errorMessage) {
    lines.push('');
    lines.push(`h3. Error`);
    lines.push(`{code}`);
    lines.push(params.errorMessage.substring(0, 3000));
    lines.push(`{code}`);
  }

  return lines.join('\n');
}
