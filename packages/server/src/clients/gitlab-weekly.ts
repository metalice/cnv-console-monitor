import axios, { type AxiosInstance, type AxiosResponse } from 'axios';

import { logger } from '../logger';

const log = logger.child({ module: 'WeeklyReport:GitLab' });

const TIMEOUT_MS = 30_000;
const PER_PAGE = 100;

export type GitLabUser = {
  name: string;
  username: string;
};

export type GitLabMR = {
  author: GitLabUser;
  created_at: string;
  iid: number;
  merged_at: string | null;
  state: 'closed' | 'locked' | 'merged' | 'opened';
  title: string;
  updated_at: string;
  web_url: string;
  work_in_progress: boolean;
};

export type GitLabCommit = {
  author_email: string;
  author_name: string;
  committed_date: string;
  id: string;
  message: string;
  title: string;
  web_url: string;
};

export type GitLabClientConfig = {
  project: string;
  token: string;
  url: string;
};

const createClient = (
  config: GitLabClientConfig,
): {
  client: AxiosInstance;
  encodedProject: string;
} => ({
  client: axios.create({
    baseURL: `${config.url}/api/v4`,
    headers: { 'PRIVATE-TOKEN': config.token },
    timeout: TIMEOUT_MS,
  }),
  encodedProject: encodeURIComponent(config.project),
});

const fetchPage = async <T>(
  client: AxiosInstance,
  path: string,
  page: number,
  accumulated: T[],
): Promise<T[]> => {
  const response: AxiosResponse<T[]> = await client.get(path, {
    params: { page, per_page: PER_PAGE },
  });
  const combined = [...accumulated, ...response.data];

  const totalPages = parseInt((response.headers['x-total-pages'] as string | undefined) ?? '1', 10);
  if (page >= totalPages || response.data.length === 0) {
    return combined;
  }
  return fetchPage(client, path, page + 1, combined);
};

export const fetchMRs = async (
  config: GitLabClientConfig,
  since: string,
  until: string,
): Promise<GitLabMR[]> => {
  const { client, encodedProject } = createClient(config);
  const allMRs = await fetchPage<GitLabMR>(
    client,
    `/projects/${encodedProject}/merge_requests?state=all&updated_after=${since}&updated_before=${until}&order_by=updated_at`,
    1,
    [],
  );

  log.info({ count: allMRs.length, project: config.project, since, until }, 'Fetched GitLab MRs');
  return allMRs;
};

export const fetchGitLabCommits = async (
  config: GitLabClientConfig,
  since: string,
  until: string,
): Promise<GitLabCommit[]> => {
  const { client, encodedProject } = createClient(config);
  const allCommits = await fetchPage<GitLabCommit>(
    client,
    `/projects/${encodedProject}/repository/commits?since=${since}&until=${until}`,
    1,
    [],
  );

  log.info(
    { count: allCommits.length, project: config.project, since, until },
    'Fetched GitLab commits',
  );
  return allCommits;
};
