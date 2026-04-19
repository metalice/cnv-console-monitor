import {
  fetchCommits,
  fetchPRs,
  type GitHubClientConfig,
  type GitHubCommit,
  type GitHubPR,
} from '../clients/github-report';
import {
  fetchGitLabCommits,
  fetchMRs,
  type GitLabClientConfig,
  type GitLabCommit,
  type GitLabMR,
} from '../clients/gitlab-report';
import { type ReportJiraIssue, searchTeamTickets } from '../clients/jira';
import { getSetting } from '../db/store';
import { logger } from '../logger';

import { logReportPoll } from './pollState';
import { parseBaseUrl, parseOwnerRepo, parseProjectPath } from './utils';

const log = logger.child({ module: 'TeamReport:Fetchers' });

type RepoConfig = { name: string; provider: string; url: string };

type GitHubFetchResult = {
  configs: GitHubClientConfig[];
  commits: GitHubCommit[];
  prs: GitHubPR[];
};

export const fetchGitHubData = async (
  repos: RepoConfig[],
  since: string,
  until: string,
  warnings: string[],
): Promise<GitHubFetchResult> => {
  const result: GitHubFetchResult = { commits: [], configs: [], prs: [] };
  if (repos.length === 0) return result;

  const ghToken = await getSetting('github.token');
  if (!ghToken) {
    const msg = `⚠ GitHub token missing — ${repos.length} GitHub repo(s) configured but no token set. Go to Settings > Integrations > Git and set github.token`;
    warnings.push(msg);
    logReportPoll('github', msg);
    return result;
  }

  for (const ghRepo of repos) {
    const ownerRepo = parseOwnerRepo(ghRepo.url);
    if (!ownerRepo) {
      const msg = `Cannot parse owner/repo from URL: ${ghRepo.url}`;
      warnings.push(msg);
      logReportPoll('github', msg);
      continue;
    }
    const config: GitHubClientConfig = { repo: ownerRepo, token: ghToken };
    result.configs.push(config);
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: per-repo fetches with error isolation
      const [prs, commits] = await Promise.all([
        fetchPRs(config, since, until),
        fetchCommits(config, since, until),
      ]);
      result.prs = [...result.prs, ...prs];
      result.commits = [...result.commits, ...commits];
      logReportPoll('github', `${ghRepo.name}: ${prs.length} PRs, ${commits.length} commits`);
    } catch (err) {
      const msg = `GitHub data unavailable for ${ghRepo.name}: ${(err as Error).message}`;
      log.warn({ err, repo: ghRepo.name }, 'GitHub fetch failed');
      warnings.push(msg);
      logReportPoll('github', `⚠ ${msg}`);
    }
  }

  return result;
};

type GitLabFetchResult = {
  commits: GitLabCommit[];
  mrs: GitLabMR[];
};

export const fetchGitLabData = async (
  repos: RepoConfig[],
  since: string,
  until: string,
  warnings: string[],
): Promise<GitLabFetchResult> => {
  const result: GitLabFetchResult = { commits: [], mrs: [] };
  if (repos.length === 0) return result;

  const glToken = await getSetting('gitlab.token');
  if (!glToken) {
    const msg = `⚠ GitLab token missing — ${repos.length} GitLab repo(s) configured but no token set. Go to Settings > Integrations > Git and set gitlab.token`;
    warnings.push(msg);
    logReportPoll('gitlab', msg);
    return result;
  }

  for (const glRepo of repos) {
    const baseUrl = parseBaseUrl(glRepo.url);
    const projectPath = parseProjectPath(glRepo.url);
    if (!projectPath) {
      const msg = `Cannot parse project path from URL: ${glRepo.url}`;
      warnings.push(msg);
      logReportPoll('gitlab', msg);
      continue;
    }
    const config: GitLabClientConfig = { project: projectPath, token: glToken, url: baseUrl };
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: per-repo fetches with error isolation
      const [mrs, commits] = await Promise.all([
        fetchMRs(config, since, until),
        fetchGitLabCommits(config, since, until),
      ]);
      result.mrs = [...result.mrs, ...mrs];
      result.commits = [...result.commits, ...commits];
      logReportPoll('gitlab', `${glRepo.name}: ${mrs.length} MRs, ${commits.length} commits`);
    } catch (err) {
      const msg = `GitLab data unavailable for ${glRepo.name}: ${(err as Error).message}`;
      log.warn({ err, repo: glRepo.name }, 'GitLab fetch failed');
      warnings.push(msg);
      logReportPoll('gitlab', `⚠ ${msg}`);
    }
  }

  return result;
};

export const fetchJiraData = async (
  since: string,
  component: string | undefined,
  warnings: string[],
): Promise<ReportJiraIssue[]> => {
  const jiraToken = await getSetting('jira.token');
  if (!jiraToken) {
    const msg = '⚠ Jira token missing — Go to Settings > Integrations > Jira and set jira.token';
    warnings.push(msg);
    logReportPoll('jira', msg);
    return [];
  }

  try {
    const issues = await searchTeamTickets(since, component);
    logReportPoll('jira', `${issues.length} Jira tickets fetched`);
    return issues;
  } catch (err) {
    const msg = `Jira data unavailable: ${(err as Error).message}`;
    log.warn({ err }, 'Jira fetch failed');
    warnings.push(msg);
    logReportPoll('jira', `⚠ ${msg}`);
    return [];
  }
};
