import axios, { type AxiosResponse } from 'axios';

import { getEnabledReportRepos, getSetting } from '../db/store';
import { logger } from '../logger';

import { setAvailableUsers } from './availableUsers';
import { isBot, parseBaseUrl, parseOwnerRepo, parseProjectPath } from './utils';

const log = logger.child({ module: 'TeamReport:FetchUsers' });

const TIMEOUT_MS = 15_000;
const PER_PAGE = 100;

const parseLinkNext = (header: string | undefined): string | null => {
  if (!header) return null;
  for (const part of header.split(',')) {
    if (part.includes('rel="next"')) {
      const start = part.indexOf('<');
      const end = part.indexOf('>');
      if (start !== -1 && end > start) return part.slice(start + 1, end);
    }
  }
  return null;
};

const fetchAllGitHubContributors = async (
  ownerRepo: string,
  token: string,
): Promise<Set<string>> => {
  const users = new Set<string>();
  let url: string | null =
    `https://api.github.com/repos/${ownerRepo}/contributors?per_page=${PER_PAGE}&anon=0`;

  while (url) {
    // eslint-disable-next-line no-await-in-loop -- sequential: paginated API
    const response: AxiosResponse<{ login?: string; type?: string }[]> = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: TIMEOUT_MS,
    });
    for (const contributor of response.data) {
      if (contributor.login && contributor.type !== 'Bot' && !isBot(contributor.login)) {
        users.add(contributor.login);
      }
    }
    url = parseLinkNext(response.headers.link as string | undefined);
  }

  return users;
};

const fetchAllGitLabMembers = async (
  projectPath: string,
  baseUrl: string,
  token: string,
): Promise<Set<string>> => {
  const users = new Set<string>();
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    // eslint-disable-next-line no-await-in-loop -- sequential: paginated API
    const response: AxiosResponse<{ username: string }[]> = await axios.get(
      `${baseUrl}/api/v4/projects/${encodeURIComponent(projectPath)}/members/all`,
      {
        headers: { 'PRIVATE-TOKEN': token },
        params: { page, per_page: PER_PAGE },
        timeout: TIMEOUT_MS,
      },
    );
    for (const member of response.data) {
      if (!isBot(member.username)) {
        users.add(member.username);
      }
    }
    const totalPages = parseInt(
      (response.headers['x-total-pages'] as string | undefined) ?? '1',
      10,
    );
    hasMore = page < totalPages && response.data.length > 0;
    page++;
  }

  return users;
};

export const fetchAvailableUsersFromRepos = async (): Promise<{
  githubUsers: string[];
  gitlabUsers: string[];
}> => {
  const repos = await getEnabledReportRepos();
  const githubSet = new Set<string>();
  const gitlabSet = new Set<string>();

  const ghToken = await getSetting('github.token');
  const glToken = await getSetting('gitlab.token');

  for (const repo of repos) {
    try {
      if (repo.provider === 'github' && ghToken) {
        const ownerRepo = parseOwnerRepo(repo.url);
        if (!ownerRepo) continue;
        // eslint-disable-next-line no-await-in-loop -- sequential: per-repo fetches with error isolation
        const users = await fetchAllGitHubContributors(ownerRepo, ghToken);
        for (const user of users) githubSet.add(user);
        log.info({ count: users.size, repo: repo.name }, 'Fetched all GitHub contributors');
      }

      if (repo.provider === 'gitlab' && glToken) {
        const projectPath = parseProjectPath(repo.url);
        const baseUrl = parseBaseUrl(repo.url);
        if (!projectPath) continue;
        // eslint-disable-next-line no-await-in-loop -- sequential: per-repo fetches with error isolation
        const users = await fetchAllGitLabMembers(projectPath, baseUrl, glToken);
        for (const user of users) gitlabSet.add(user);
        log.info({ count: users.size, repo: repo.name }, 'Fetched all GitLab members');
      }
    } catch (err) {
      log.warn({ err, repo: repo.name }, 'Failed to fetch users from repo');
    }
  }

  const result = {
    githubUsers: [...githubSet].sort((left, right) => left.localeCompare(right)),
    gitlabUsers: [...gitlabSet].sort((left, right) => left.localeCompare(right)),
  };
  setAvailableUsers(result);
  return result;
};
