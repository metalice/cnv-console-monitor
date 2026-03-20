import { Octokit } from '@octokit/rest';
import { logger } from '../logger';

const log = logger.child({ module: 'GitHub' });

let octokit: Octokit | null = null;

export const configureGitHub = (token: string): void => {
  if (!token) { octokit = null; return; }
  octokit = new Octokit({ auth: token });
  log.info('GitHub client configured');
};

export const isGitHubConfigured = (): boolean => !!octokit;

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
  const matches = text.match(/[A-Z]+-\d+/g);
  return matches ? [...new Set(matches)] : [];
};

export const fetchMergedPRs = async (
  owner: string,
  repo: string,
  since: string,
  until: string,
): Promise<GitHubPR[]> => {
  if (!octokit) throw new Error('GitHub not configured');

  const prs: GitHubPR[] = [];
  let page = 1;

  while (true) {
    const { data } = await octokit.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const pr of data) {
      if (!pr.merged_at) continue;
      const mergedAt = new Date(pr.merged_at);
      if (mergedAt < new Date(since)) { page = Infinity; break; }
      if (mergedAt > new Date(until)) continue;

      prs.push({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? 'unknown',
        mergedAt: pr.merged_at,
        url: pr.html_url,
        repo: `${owner}/${repo}`,
        labels: pr.labels.map(l => (typeof l === 'string' ? l : l.name ?? '')),
        jiraKeys: extractJiraKeys(`${pr.title} ${pr.body ?? ''}`),
      });
    }

    if (page === Infinity) break;
    page++;
    if (page > 10) break;
  }

  log.info({ owner, repo, since, until, count: prs.length }, 'Fetched GitHub PRs');
  return prs;
};

export type RepoMapping = {
  component: string;
  owner: string;
  repo: string;
};

export const parseRepoMappings = (json: string): RepoMapping[] => {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      return Object.entries(data).map(([component, repoStr]) => {
        const [owner, repo] = (repoStr as string).split('/');
        return { component, owner, repo };
      });
    }
    return [];
  } catch { return []; }
};
