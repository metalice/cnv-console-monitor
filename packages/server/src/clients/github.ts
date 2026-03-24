import { Octokit } from '@octokit/rest';

import { logger } from '../logger';

const log = logger.child({ module: 'GitHub' });

let octokit: Octokit | null = null;

export const configureGitHub = (token: string): void => {
  if (!token) {
    octokit = null;
    return;
  }
  octokit = new Octokit({ auth: token });
  log.info('GitHub client configured');
};

export const isGitHubConfigured = (): boolean => Boolean(octokit);

export type GitHubPR = {
  number: number;
  title: string;
  author: string;
  mergedAt: string;
  url: string;
  repo: string;
  labels: string[];
  jiraKeys: string[];
};

const extractJiraKeys = (text: string): string[] => {
  const matches = text.match(/[A-Z]{1,20}-\d{1,12}/g);
  return matches ? [...new Set(matches)] : [];
};

export const fetchMergedPRs = async (
  owner: string,
  repo: string,
  since: string,
  until: string,
): Promise<GitHubPR[]> => {
  if (!octokit) {
    throw new Error('GitHub not configured');
  }

  const prs: GitHubPR[] = [];
  let page = 1;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const { data } = await octokit.pulls.list({
      direction: 'desc',
      owner,
      page,
      per_page: 100,
      repo,
      sort: 'updated',
      state: 'closed',
    });

    if (data.length === 0) {
      break;
    }

    for (const pr of data) {
      if (!pr.merged_at) {
        continue;
      }
      const mergedAt = new Date(pr.merged_at);
      if (mergedAt < new Date(since)) {
        page = Infinity;
        break;
      }
      if (mergedAt > new Date(until)) {
        continue;
      }

      prs.push({
        author: pr.user?.login ?? 'unknown',
        jiraKeys: extractJiraKeys(`${pr.title} ${pr.body ?? ''}`),
        labels: pr.labels.map(l => (typeof l === 'string' ? l : l.name)),
        mergedAt: pr.merged_at,
        number: pr.number,
        repo: `${owner}/${repo}`,
        title: pr.title,
        url: pr.html_url,
      });
    }

    if (page === Infinity) {
      break;
    }
    page++;
    if (page > 10) {
      break;
    }
  }

  log.info({ count: prs.length, owner, repo, since, until }, 'Fetched GitHub PRs');
  return prs;
};

export type RepoMapping = {
  component: string;
  owner: string;
  repo: string;
};

export const parseRepoMappings = (json: string): RepoMapping[] => {
  try {
    const data: unknown = JSON.parse(json);
    if (Array.isArray(data)) {
      return data as RepoMapping[];
    }
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data as Record<string, unknown>).map(([component, repoStr]) => {
        const [owner, repo] = (repoStr as string).split('/');
        return { component, owner, repo };
      });
    }
    return [];
  } catch {
    return [];
  }
};
