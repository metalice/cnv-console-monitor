import {
  type CommitSummary,
  getWeekBoundaries,
  getWeekId,
  type JiraTicket,
  type PRSummary,
  type TaskSummary,
} from '@cnv-monitor/shared';

import { getAIService } from '../ai/AIService';
import {
  fetchCommits,
  fetchPRCommentCount,
  fetchPRReviews,
  fetchPRs,
  type GitHubClientConfig,
  type GitHubCommit,
  type GitHubPR,
} from '../clients/github-weekly';
import {
  fetchGitLabCommits,
  fetchMRs,
  type GitLabClientConfig,
  type GitLabCommit,
  type GitLabMR,
} from '../clients/gitlab-weekly';
import { searchTeamTickets, type WeeklyJiraIssue } from '../clients/jira';
import { fetchSheetRows, fetchVersionTabs, isSheetsConfigured } from '../clients/sheets';
import {
  getEnabledWeeklyRepos,
  getSetting,
  getWeeklyReposByComponent,
  listActiveTeamMembers,
  savePersonReport,
  upsertWeeklyReport,
} from '../db/store';
import { logger } from '../logger';

import { discoverAndMapMembers } from './identityMapper';
import { logWeeklyPoll, stepWeeklyPoll } from './pollState';
import {
  daysBetween,
  isBot,
  parseBaseUrl,
  parseOwnerRepo,
  parseProjectPath,
  stripMarkdownFences,
} from './utils';

const log = logger.child({ module: 'WeeklyReport:Aggregator' });

const STUCK_DAYS_THRESHOLD = 3;

type RepoConfig = { name: string; provider: string; url: string };

type GitHubFetchResult = {
  configs: GitHubClientConfig[];
  commits: GitHubCommit[];
  prs: GitHubPR[];
};

const fetchGitHubData = async (
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
    logWeeklyPoll('github', msg);
    return result;
  }

  for (const ghRepo of repos) {
    const ownerRepo = parseOwnerRepo(ghRepo.url);
    if (!ownerRepo) {
      const msg = `Cannot parse owner/repo from URL: ${ghRepo.url}`;
      warnings.push(msg);
      logWeeklyPoll('github', msg);
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
      logWeeklyPoll('github', `${ghRepo.name}: ${prs.length} PRs, ${commits.length} commits`);
    } catch (err) {
      const msg = `GitHub data unavailable for ${ghRepo.name}: ${(err as Error).message}`;
      log.warn({ err, repo: ghRepo.name }, 'GitHub fetch failed');
      warnings.push(msg);
      logWeeklyPoll('github', `⚠ ${msg}`);
    }
  }

  return result;
};

type GitLabFetchResult = {
  commits: GitLabCommit[];
  mrs: GitLabMR[];
};

const fetchGitLabData = async (
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
    logWeeklyPoll('gitlab', msg);
    return result;
  }

  for (const glRepo of repos) {
    const baseUrl = parseBaseUrl(glRepo.url);
    const projectPath = parseProjectPath(glRepo.url);
    if (!projectPath) {
      const msg = `Cannot parse project path from URL: ${glRepo.url}`;
      warnings.push(msg);
      logWeeklyPoll('gitlab', msg);
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
      logWeeklyPoll('gitlab', `${glRepo.name}: ${mrs.length} MRs, ${commits.length} commits`);
    } catch (err) {
      const msg = `GitLab data unavailable for ${glRepo.name}: ${(err as Error).message}`;
      log.warn({ err, repo: glRepo.name }, 'GitLab fetch failed');
      warnings.push(msg);
      logWeeklyPoll('gitlab', `⚠ ${msg}`);
    }
  }

  return result;
};

const fetchJiraData = async (
  since: string,
  component: string | undefined,
  warnings: string[],
): Promise<WeeklyJiraIssue[]> => {
  const jiraToken = await getSetting('jira.token');
  if (!jiraToken) {
    const msg = '⚠ Jira token missing — Go to Settings > Integrations > Jira and set jira.token';
    warnings.push(msg);
    logWeeklyPoll('jira', msg);
    return [];
  }

  try {
    const issues = await searchTeamTickets(since, component);
    logWeeklyPoll('jira', `${issues.length} Jira tickets fetched`);
    return issues;
  } catch (err) {
    const msg = `Jira data unavailable: ${(err as Error).message}`;
    log.warn({ err }, 'Jira fetch failed');
    warnings.push(msg);
    logWeeklyPoll('jira', `⚠ ${msg}`);
    return [];
  }
};

type AggregatorOptions = {
  component?: string;
  date?: Date;
};

const findRepoSlugForPR = (configs: GitHubClientConfig[], _pr: GitHubPR): string =>
  configs[0]?.repo ?? 'unknown/unknown';

const enrichGitHubPRs = async (
  githubPRs: GitHubPR[],
  githubConfigs: GitHubClientConfig[],
): Promise<PRSummary[]> => {
  const now = new Date();
  const prs: PRSummary[] = [];
  const primaryConfig = githubConfigs[0];

  for (const pr of githubPRs) {
    if (!pr.user || isBot(pr.user.login)) continue;

    let reviews: { reviewer: string; state: string; submittedAt: string | null }[] = [];
    let commentCount = 0;
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered PR enrichment
      const [rawReviews, rawComments] = await Promise.all([
        fetchPRReviews(primaryConfig, pr.number),
        fetchPRCommentCount(primaryConfig, pr.number),
      ]);
      reviews = rawReviews.map(rev => ({
        reviewer: rev.user?.login ?? 'unknown',
        state: rev.state,
        submittedAt: rev.submitted_at,
      }));
      commentCount = rawComments;
    } catch {
      log.debug({ pr: pr.number }, 'Failed to enrich PR');
    }

    const prState = pr.merged_at ? 'merged' : pr.draft ? 'draft' : (pr.state as 'open' | 'closed');
    const daysOpen = daysBetween(pr.created_at, now);
    const isStuck =
      prState !== 'merged' &&
      prState !== 'closed' &&
      daysOpen >= STUCK_DAYS_THRESHOLD &&
      reviews.length === 0;
    const repoSlug = findRepoSlugForPR(githubConfigs, pr);

    prs.push({
      author: pr.user.login,
      closedAt: pr.closed_at,
      commentCount,
      createdAt: pr.created_at,
      daysOpen,
      isStuck,
      mergedAt: pr.merged_at,
      number: pr.number,
      reviewCount: reviews.length,
      reviews,
      source: 'github',
      state: prState,
      title: pr.title,
      updatedAt: pr.updated_at,
      url: `https://github.com/${repoSlug}/pull/${pr.number}`,
    });
  }

  return prs;
};

const mapGitLabMRs = (gitlabMRs: GitLabMR[]): PRSummary[] =>
  gitlabMRs
    .filter(mergeRequest => !isBot(mergeRequest.author.username))
    .map(mergeRequest => {
      const mrState = mergeRequest.merged_at
        ? 'merged'
        : mergeRequest.state === 'opened'
          ? mergeRequest.work_in_progress
            ? 'draft'
            : 'open'
          : 'closed';
      return {
        author: mergeRequest.author.username,
        closedAt: null,
        commentCount: 0,
        createdAt: mergeRequest.created_at,
        daysOpen: daysBetween(mergeRequest.created_at, new Date()),
        isStuck: false,
        mergedAt: mergeRequest.merged_at,
        number: mergeRequest.iid,
        reviewCount: 0,
        reviews: [],
        source: 'gitlab' as const,
        state: mrState,
        title: mergeRequest.title,
        updatedAt: mergeRequest.updated_at,
        url: mergeRequest.web_url,
      };
    });

const mapJiraTickets = (jiraIssues: WeeklyJiraIssue[]): JiraTicket[] =>
  jiraIssues.map(issue => {
    const status = issue.fields.status.name;
    const isBlocked =
      status.toLowerCase().includes('block') ||
      issue.fields.labels.some(lbl => lbl.toLowerCase().includes('blocked'));
    const transitions = (issue.changelog?.histories ?? []).flatMap(history =>
      history.items
        .filter(item => item.field === 'status')
        .map(item => ({
          author: history.author.displayName,
          date: history.created,
          from: item.fromString ?? '',
          to: item.toString ?? '',
        })),
    );

    return {
      assignee: issue.fields.assignee?.displayName ?? null,
      assigneeAccountId: issue.fields.assignee?.accountId ?? null,
      commentCount: issue.fields.comment?.total ?? 0,
      createdAt: null,
      isBlocked,
      issueType: issue.fields.issuetype?.name ?? null,
      key: issue.key,
      labels: issue.fields.labels,
      lastCommentDate: issue.fields.comment?.comments.length
        ? issue.fields.comment.comments[issue.fields.comment.comments.length - 1].created
        : null,
      priority: issue.fields.priority?.name ?? null,
      status,
      storyPoints: issue.fields.story_points ?? null,
      summary: issue.fields.summary,
      transitions,
      updatedAt: issue.fields.updated,
      url: `https://redhat.atlassian.net/browse/${issue.key}`,
    };
  });

const collectCommitSummaries = (
  githubCommits: GitHubCommit[],
  gitlabCommits: GitLabCommit[],
): CommitSummary[] => {
  const commits: CommitSummary[] = [];

  for (const commit of githubCommits) {
    if (!commit.author || isBot(commit.author.login)) continue;
    commits.push({
      author: commit.author.login,
      date: commit.commit.author?.date ?? '',
      message: commit.commit.message.split('\n')[0],
      sha: commit.sha.slice(0, 7),
      source: 'github',
      url: commit.html_url,
    });
  }
  for (const commit of gitlabCommits) {
    if (isBot(commit.author_name)) continue;
    commits.push({
      author: commit.author_name,
      date: commit.committed_date,
      message: commit.title,
      sha: commit.id.slice(0, 7),
      source: 'gitlab',
      url: commit.web_url,
    });
  }

  return commits;
};

export const generateWeeklyReport = async (options: AggregatorOptions = {}): Promise<void> => {
  const { component, date = new Date() } = options;
  const { end, start } = getWeekBoundaries(date);
  const weekId = getWeekId(date);
  const since = start.toISOString();
  const until = end.toISOString();
  const warnings: string[] = [];

  log.info({ component, since, until, weekId }, 'Starting weekly report generation');

  const ai = getAIService();

  // --- Discover repos from the weekly repo config ---
  const repos = component
    ? await getWeeklyReposByComponent(component)
    : await getEnabledWeeklyRepos();

  if (repos.length === 0) {
    const msg = 'No weekly report repositories configured. Add repos in Settings > Weekly Report.';
    warnings.push(msg);
    logWeeklyPoll('github', msg);
  }

  // --- Fetch from all sources ---
  stepWeeklyPoll('github', 'Fetching GitHub PRs and commits');
  const githubRepos = repos.filter(repo => repo.provider === 'github');
  const githubData = await fetchGitHubData(githubRepos, since, until, warnings);

  stepWeeklyPoll('gitlab', 'Fetching GitLab MRs and commits');
  const gitlabRepos = repos.filter(repo => repo.provider === 'gitlab');
  const gitlabData = await fetchGitLabData(gitlabRepos, since, until, warnings);

  stepWeeklyPoll('jira', 'Fetching Jira tickets');
  const jiraIssues = await fetchJiraData(start.toISOString().split('T')[0], component, warnings);

  // --- Fetch Sheets data (optional) ---
  stepWeeklyPoll('sheets', 'Fetching spreadsheet data');
  if (await isSheetsConfigured()) {
    try {
      const tabs = await fetchVersionTabs();
      if (tabs.length > 0) {
        const latestTab = tabs[tabs.length - 1];
        await fetchSheetRows(latestTab.name);
      }
    } catch (err) {
      log.warn({ err }, 'Sheets fetch failed');
      warnings.push(`Sheets data unavailable: ${(err as Error).message}`);
    }
  }

  // --- AI Identity Mapping (required) ---
  stepWeeklyPoll('ai-mapping', 'AI mapping team identities');
  await discoverAndMapMembers({
    ai,
    component,
    githubPRs: githubData.prs,
    gitlabMRs: gitlabData.mrs,
    jiraIssues,
  });
  const members = await listActiveTeamMembers(component);

  // --- Enrich PRs and build per-person data ---
  stepWeeklyPoll('ai-summary', 'Building reports and AI summaries');
  const githubPRSummaries = await enrichGitHubPRs(githubData.prs, githubData.configs);
  const gitlabPRSummaries = mapGitLabMRs(gitlabData.mrs);
  const allPRs: PRSummary[] = [...githubPRSummaries, ...gitlabPRSummaries];
  const allTickets = mapJiraTickets(jiraIssues);
  const allCommits = collectCommitSummaries(githubData.commits, gitlabData.commits);

  // --- AI Task Summary ---
  let taskSummary: TaskSummary | null = null;
  let managerHighlights: string | null = null;
  try {
    const taskResult = await ai.runPrompt('task-summary', {
      commits: JSON.stringify(allCommits.slice(0, 50)),
      component: component ?? 'all',
      prs: JSON.stringify(allPRs),
      tickets: JSON.stringify(allTickets),
    });
    if (taskResult.content) {
      try {
        taskSummary = JSON.parse(stripMarkdownFences(taskResult.content)) as TaskSummary;
      } catch {
        log.warn('AI task summary returned non-JSON, using as highlights');
        managerHighlights = taskResult.content;
      }
    }

    const summaryResult = await ai.runPrompt('weekly-summary', {
      commitCount: String(allCommits.length),
      component: component ?? 'all',
      contributorCount: String(members.length),
      prsMerged: String(allPRs.filter(pr => pr.state === 'merged').length),
      taskSummary: taskSummary ? JSON.stringify(taskSummary) : 'Not available',
      ticketsDone: String(
        allTickets.filter(tkt => ['done', 'closed', 'resolved'].includes(tkt.status.toLowerCase()))
          .length,
      ),
    });
    if (summaryResult.content) {
      managerHighlights = summaryResult.content;
    }
  } catch (err) {
    log.warn({ err }, 'AI summary generation failed');
    warnings.push('AI summary generation failed');
  }

  // --- Build per-person data and AI summaries in parallel ---
  const doneStatuses = new Set(['done', 'closed', 'resolved']);
  const AI_CONCURRENCY = 5;

  const memberData = members.map(member => {
    const memberPRs = allPRs.filter(
      pr => pr.author === member.github_username || pr.author === member.gitlab_username,
    );
    const memberTickets = member.jira_account_id
      ? allTickets.filter(tkt => tkt.assigneeAccountId === member.jira_account_id)
      : [];
    const memberCommits = allCommits.filter(
      cmt => cmt.author === member.github_username || cmt.author === member.gitlab_username,
    );
    const stats = {
      commitCount: memberCommits.length,
      prsMerged: memberPRs.filter(pr => pr.state === 'merged').length,
      prsOpened: memberPRs.filter(pr => pr.state === 'open' || pr.state === 'draft').length,
      prsReviewed: 0,
      storyPointsCompleted: memberTickets
        .filter(tkt => doneStatuses.has(tkt.status.toLowerCase()))
        .reduce((sum, tkt) => sum + (tkt.storyPoints ?? 0), 0),
      ticketsBlocked: memberTickets.filter(tkt => tkt.isBlocked).length,
      ticketsDone: memberTickets.filter(tkt => doneStatuses.has(tkt.status.toLowerCase())).length,
      ticketsInProgress: memberTickets.filter(tkt => tkt.status.toLowerCase().includes('progress'))
        .length,
    };
    const hasActivity = memberPRs.length > 0 || memberTickets.length > 0;
    return { hasActivity, member, memberCommits, memberPRs, memberTickets, stats };
  });

  const membersNeedingAI = memberData.filter(entry => entry.hasActivity);
  const aiSummaries = new Map<string, string | null>();

  for (let i = 0; i < membersNeedingAI.length; i += AI_CONCURRENCY) {
    const batch = membersNeedingAI.slice(i, i + AI_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop -- sequential: batched AI concurrency control
    const results = await Promise.allSettled(
      batch.map(async ({ member, memberCommits, memberPRs, memberTickets }) => {
        const result = await ai.runPrompt('person-highlights', {
          commits: JSON.stringify(memberCommits.slice(0, 20)),
          displayName: member.display_name,
          prs: JSON.stringify(memberPRs),
          tickets: JSON.stringify(memberTickets),
        });
        return { id: member.id, summary: result.content || null };
      }),
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        aiSummaries.set(result.value.id, result.value.summary);
      }
    }
  }

  // --- Save report ---
  stepWeeklyPoll('saving', 'Saving weekly report');
  const report = await upsertWeeklyReport({
    component: component ?? '',
    managerHighlights,
    taskSummary,
    warnings,
    weekEnd: end.toISOString().split('T')[0],
    weekId,
    weekStart: start.toISOString().split('T')[0],
  });

  await Promise.all(
    memberData.map(({ member, memberCommits, memberPRs, memberTickets, stats }) =>
      savePersonReport({
        aiSummary: aiSummaries.get(member.id) ?? null,
        commits: memberCommits,
        jiraTickets: memberTickets,
        memberId: member.id,
        prs: memberPRs,
        stats,
        weekId: report.week_id,
      }),
    ),
  );

  log.info({ component, memberCount: members.length, weekId }, 'Weekly report generation complete');
};
