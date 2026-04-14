import axios, { type AxiosResponse } from 'axios';

import { getEnabledWeeklyRepos, getSetting } from '../db/store';
import { logger } from '../logger';

import { setAvailableUsers } from './availableUsers';

const log = logger.child({ module: 'WeeklyReport:FetchUsers' });

const TIMEOUT_MS = 15_000;
const PER_PAGE = 100;

const BOT_PATTERNS = ['[bot]', 'dependabot', 'openshift-cherrypick-robot', 'renovate', 'codecov'];

const isBot = (username: string): boolean =>
  BOT_PATTERNS.some(pat => username.toLowerCase().includes(pat));

const parseOwnerRepo = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const parts = pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  } catch {
    return null;
  }
};

const parseProjectPath = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    return pathname.replace(/^\//, '').replace(/\.git$/, '') || null;
  } catch {
    return null;
  }
};

const parseBaseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
};

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
  const repos = await getEnabledWeeklyRepos();
  const githubSet = new Set<string>();
  const gitlabSet = new Set<string>();

  const ghToken = await getSetting('github.token');
  const glToken = await getSetting('gitlab.token');

  for (const repo of repos) {
    try {
      if (repo.provider === 'github' && ghToken) {
        const ownerRepo = parseOwnerRepo(repo.url);
        if (!ownerRepo) continue;
        const users = await fetchAllGitHubContributors(ownerRepo, ghToken);
        for (const user of users) githubSet.add(user);
        log.info({ count: users.size, repo: repo.name }, 'Fetched all GitHub contributors');
      }

      if (repo.provider === 'gitlab' && glToken) {
        const projectPath = parseProjectPath(repo.url);
        const baseUrl = parseBaseUrl(repo.url);
        if (!projectPath) continue;
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
