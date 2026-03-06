import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config } from '../config';

export interface RPLaunch {
  id: number;
  uuid: string;
  name: string;
  number: number;
  status: string;
  description?: string;
  startTime: number;
  endTime?: number;
  lastModified?: number;
  approximateDuration?: number;
  statistics: {
    executions: { total?: number; passed?: number; failed?: number; skipped?: number };
    defects?: Record<string, Record<string, number>>;
  };
  attributes: Array<{ key?: string; value: string }>;
}

export interface RPTestItem {
  id: number;
  uuid: string;
  name: string;
  description?: string;
  status: string;
  type: string;
  startTime: number;
  endTime?: number;
  attributes: Array<{ key?: string; value: string }>;
  issue?: {
    issueType: string;
    comment?: string;
    autoAnalyzed?: boolean;
    externalSystemIssues?: Array<{ url?: string; ticketId?: string }>;
  };
  statistics?: {
    executions: Record<string, number>;
    defects?: Record<string, Record<string, number>>;
  };
  uniqueId?: string;
  testCaseHash?: number;
}

export interface RPDefectType {
  locator: string;
  typeRef: string;
  longName: string;
  shortName: string;
  color: string;
}

export interface RPLogEntry {
  id: number;
  message: string;
  level: string;
  time: number;
  binaryContent?: { id: string; contentType: string };
}

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: `${config.reportportal.url}/api/v1/${config.reportportal.project}`,
    headers: {
      Authorization: `Bearer ${config.reportportal.token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
    httpsAgent,
  });
}

export async function fetchLaunches(params: {
  filterName?: string;
  sinceTime?: number;
  pageSize?: number;
  page?: number;
}): Promise<{ content: RPLaunch[]; page: { totalElements: number; totalPages: number } }> {
  const client = createClient();
  const queryParams: Record<string, string | number> = {
    'page.size': params.pageSize || 20,
    'page.page': params.page || 1,
    'page.sort': 'startTime,number,DESC',
  };

  if (params.filterName) {
    queryParams['filter.cnt.name'] = params.filterName;
  }
  if (params.sinceTime) {
    queryParams['filter.gte.startTime'] = params.sinceTime;
  }

  const response = await client.get('/launch', { params: queryParams });
  return response.data;
}

export async function fetchLaunchById(launchId: number): Promise<RPLaunch> {
  const client = createClient();
  const response = await client.get(`/launch/${launchId}`);
  return response.data;
}

export async function fetchTestItems(params: {
  launchId: number;
  status?: string;
  pageSize?: number;
  page?: number;
}): Promise<{ content: RPTestItem[]; page: { totalElements: number; totalPages: number } }> {
  const client = createClient();
  const queryParams: Record<string, string | number> = {
    'filter.eq.launchId': params.launchId,
    'filter.eq.hasStats': 'true',
    'page.size': params.pageSize || 50,
    'page.page': params.page || 1,
    'page.sort': 'startTime,ASC',
  };

  if (params.status) {
    queryParams['filter.in.status'] = params.status;
  }

  const response = await client.get('/item', { params: queryParams });
  return response.data;
}

export async function fetchTestItemLogs(itemId: number, params?: {
  pageSize?: number;
  page?: number;
  level?: string;
}): Promise<{ content: RPLogEntry[]; page: { totalElements: number } }> {
  const client = createClient();
  const queryParams: Record<string, string | number> = {
    'filter.eq.item': itemId,
    'page.size': params?.pageSize || 50,
    'page.page': params?.page || 1,
    'page.sort': 'logTime,ASC',
  };

  if (params?.level) {
    queryParams['filter.gte.level'] = params.level;
  }

  const response = await client.get('/log', { params: queryParams });
  return response.data;
}

export async function fetchDefectTypes(): Promise<Record<string, RPDefectType[]>> {
  const client = createClient();
  const response = await client.get('/settings');
  return response.data?.subTypes || {};
}

export async function updateDefectType(
  testItemIds: number[],
  defectTypeLocator: string,
  comment?: string,
): Promise<void> {
  const client = createClient();
  const issues = testItemIds.map(id => ({
    testItemId: id,
    issue: {
      issueType: defectTypeLocator,
      comment: comment || '',
      autoAnalyzed: false,
      ignoreAnalyzer: false,
    },
  }));

  await client.put('/item', { issues });
}

export async function addTestItemComment(testItemId: number, comment: string): Promise<void> {
  const client = createClient();
  const item = await client.get(`/item/${testItemId}`);
  const existingIssue = item.data?.issue || {};

  const existingComment = existingIssue.comment || '';
  const newComment = existingComment
    ? `${existingComment}\n---\n${comment}`
    : comment;

  await client.put('/item', {
    issues: [{
      testItemId,
      issue: {
        ...existingIssue,
        comment: newComment,
      },
    }],
  });
}

export async function triggerAutoAnalysis(launchId: number): Promise<void> {
  const client = createClient();
  await client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'autoAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  });
}

export async function triggerPatternAnalysis(launchId: number): Promise<void> {
  const client = createClient();
  await client.post('/launch/analyze', {
    launchId,
    analyzerMode: 'current_launch',
    analyzerTypeName: 'patternAnalyzer',
    analyzeItemsMode: ['to_investigate'],
  });
}

export async function triggerUniqueErrorAnalysis(launchId: number): Promise<void> {
  const client = createClient();
  await client.post('/launch/cluster', { launchId, removeNumbers: false });
}

export function extractAttribute(attrs: Array<{ key?: string; value: string }>, key: string): string | undefined {
  return attrs.find(a => a.key === key)?.value;
}

export function getReportPortalLaunchUrl(launchId: number): string {
  return `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}`;
}

export function getReportPortalItemUrl(launchId: number, itemId: number): string {
  return `${config.reportportal.url}/ui/#${config.reportportal.project.toLowerCase()}/launches/all/${launchId}/${itemId}/log`;
}
