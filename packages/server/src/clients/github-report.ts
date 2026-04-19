import axios, { type AxiosResponse } from 'axios';

import { logger } from '../logger';

const log = logger.child({ module: 'TeamReport:GitHub' });

const TIMEOUT_MS = 30_000;
const PER_PAGE = 100;
const LOW_RATE_LIMIT_THRESHOLD = 100;

export type GitHubPR = {
  closed_at: string | null;
  created_at: string;
  draft: boolean;
  merged_at: string | null;
  number: number;
  state: string;
  title: string;
  updated_at: string;
  url: string;
  user: { login: string } | null;
};

type GitHubReview = {
  state: string;
  submitted_at: string | null;
  user: { login: string } | null;
};

export type GitHubCommit = {
  author: { login: string } | null;
  commit: {
    author: { date: string; name: string } | null;
    message: string;
  };
  html_url: string;
  sha: string;
};

export type GitHubClientConfig = {
  repo: string;
  token: string;
};

const createApi = (config: GitHubClientConfig) =>
  axios.create({
    baseURL: `https://api.github.com/repos/${config.repo}`,
    headers: { Authorization: `Bearer ${config.token}` },
    timeout: TIMEOUT_MS,
  });

const extractUrl = (linkPart: string): string | null => {
  const start = linkPart.indexOf('<');
  const end = linkPart.indexOf('>');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return linkPart.slice(start + 1, end);
};

const parseLinkNext = (header: string | undefined): string | null => {
  if (!header) return null;
  for (const part of header.split(',')) {
    if (part.includes('rel="next"')) {
      return extractUrl(part);
    }
  }
  return null;
};

const parseLinkLastPage = (header: string | undefined): number | null => {
  if (!header) return null;
  for (const part of header.split(',')) {
    if (part.includes('rel="last"')) {
      const url = extractUrl(part);
      if (!url) return null;
      const pageParam = new URL(url).searchParams.get('page');
      return pageParam ? parseInt(pageParam, 10) : null;
    }
  }
  return null;
};

const logRateLimit = (response: AxiosResponse): void => {
  const remaining = response.headers['x-ratelimit-remaining'] as string | undefined;
  const limit = response.headers['x-ratelimit-limit'] as string | undefined;
  if (remaining && parseInt(remaining, 10) < LOW_RATE_LIMIT_THRESHOLD) {
    log.warn({ limit, remaining }, 'GitHub API rate limit running low');
  }
};

const fetchPageRecursive = async <T>(
  client: ReturnType<typeof axios.create>,
  pageUrl: string,
  accumulated: T[],
): Promise<T[]> => {
  const response: AxiosResponse<T[]> = await client.get(pageUrl);
  logRateLimit(response);
  const combined = [...accumulated, ...response.data];
  const nextUrl = parseLinkNext(response.headers.link as string | undefined);
  if (nextUrl) {
    return fetchPageRecursive(client, nextUrl, combined);
  }
  return combined;
};

export const fetchPRs = async (
  config: GitHubClientConfig,
  since: string,
  until: string,
): Promise<GitHubPR[]> => {
  const client = createApi(config);
  const allPRs = await fetchPageRecursive<GitHubPR>(
    client,
    `/pulls?state=all&sort=updated&direction=desc&per_page=${PER_PAGE}&since=${since}`,
    [],
  );

  const sinceDate = new Date(since);
  const untilDate = new Date(until);
  const filtered = allPRs.filter(pr => {
    const updatedAt = new Date(pr.updated_at);
    if (updatedAt < sinceDate) return false;

    const createdAt = new Date(pr.created_at);
    const createdThisWeek = createdAt >= sinceDate && createdAt <= untilDate;
    const mergedThisWeek =
      pr.merged_at !== null &&
      new Date(pr.merged_at) >= sinceDate &&
      new Date(pr.merged_at) <= untilDate;
    const isStillOpen = pr.state === 'open';

    return createdThisWeek || mergedThisWeek || isStillOpen;
  });

  log.info({ count: filtered.length, repo: config.repo, since, until }, 'Fetched GitHub PRs');
  return filtered;
};

export const fetchPRReviews = async (
  config: GitHubClientConfig,
  prNumber: number,
): Promise<GitHubReview[]> => {
  const client = createApi(config);
  const response: AxiosResponse<GitHubReview[]> = await client.get(
    `/pulls/${prNumber}/reviews?per_page=${PER_PAGE}`,
  );
  logRateLimit(response);
  return response.data;
};

export const fetchPRCommentCount = async (
  config: GitHubClientConfig,
  prNumber: number,
): Promise<number> => {
  const client = createApi(config);
  const response: AxiosResponse<unknown[]> = await client.get(
    `/pulls/${prNumber}/comments?per_page=1`,
  );
  logRateLimit(response);
  const lastPage = parseLinkLastPage(response.headers.link as string | undefined);
  return lastPage ?? response.data.length;
};

export const fetchCommits = async (
  config: GitHubClientConfig,
  since: string,
  until: string,
): Promise<GitHubCommit[]> => {
  const client = createApi(config);
  const allCommits = await fetchPageRecursive<GitHubCommit>(
    client,
    `/commits?since=${since}&until=${until}&per_page=${PER_PAGE}`,
    [],
  );

  log.info({ count: allCommits.length, repo: config.repo, since, until }, 'Fetched GitHub commits');
  return allCommits;
};
