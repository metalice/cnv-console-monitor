import { withRetry } from '../utils/retry';
import { createRPClient, RPLaunch, RPTestItem, RPDefectType, RPLogEntry } from './reportportal-types';

export type { RPLaunch, RPTestItem, RPDefectType, RPLogEntry };

export {
  updateDefectType,
  addTestItemComment,
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
  extractAttribute,
  getReportPortalLaunchUrl,
  getReportPortalItemUrl,
} from './reportportal-analysis';

export const fetchLaunches = async (params: {
  filterName?: string;
  sinceTime?: number;
  pageSize?: number;
  page?: number;
}): Promise<{ content: RPLaunch[]; page: { totalElements: number; totalPages: number } }> => {
  const client = createRPClient();
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

  const response = await withRetry(
    () => client.get('/launch', { params: queryParams }),
    'fetchLaunches',
  );
  return response.data;
}

export const fetchLaunchById = async (launchId: number): Promise<RPLaunch> => {
  const client = createRPClient();
  const response = await withRetry(
    () => client.get(`/launch/${launchId}`),
    `fetchLaunchById(${launchId})`,
  );
  return response.data;
}

export const fetchTestItems = async (params: {
  launchId: number;
  status?: string;
  pageSize?: number;
  page?: number;
}): Promise<{ content: RPTestItem[]; page: { totalElements: number; totalPages: number } }> => {
  const client = createRPClient();
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

  const response = await withRetry(
    () => client.get('/item', { params: queryParams }),
    `fetchTestItems(launch=${params.launchId})`,
  );
  return response.data;
}

export const fetchTestItemLogs = async (itemId: number, params?: {
  pageSize?: number;
  page?: number;
  level?: string;
}): Promise<{ content: RPLogEntry[]; page: { totalElements: number } }> => {
  const client = createRPClient();
  const queryParams: Record<string, string | number> = {
    'filter.eq.item': itemId,
    'page.size': params?.pageSize || 50,
    'page.page': params?.page || 1,
    'page.sort': 'logTime,ASC',
  };

  if (params?.level) {
    queryParams['filter.gte.level'] = params.level;
  }

  const response = await withRetry(
    () => client.get('/log', { params: queryParams }),
    `fetchTestItemLogs(${itemId})`,
  );
  return response.data;
}

export const fetchDefectTypes = async (): Promise<Record<string, RPDefectType[]>> => {
  const client = createRPClient();
  const response = await withRetry(
    () => client.get('/settings'),
    'fetchDefectTypes',
  );
  return response.data?.subTypes || {};
}
