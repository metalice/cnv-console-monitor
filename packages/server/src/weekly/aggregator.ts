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
  createTeamMember,
  findTeamMemberByJira,
  getEnabledWeeklyRepos,
  getSetting,
  getWeeklyReposByComponent,
  listActiveTeamMembers,
  savePersonReport,
  updateTeamMember,
  upsertWeeklyReport,
} from '../db/store';
import { logger } from '../logger';

import { setAvailableUsers } from './availableUsers';
import { logWeeklyPoll, stepWeeklyPoll } from './pollState';

const log = logger.child({ module: 'WeeklyReport:Aggregator' });

const STUCK_DAYS_THRESHOLD = 3;
const BOT_PATTERNS = ['[bot]', 'dependabot', 'openshift-cherrypick-robot', 'renovate', 'codecov'];

const isBot = (username: string): boolean =>
  BOT_PATTERNS.some(pat => username.toLowerCase().includes(pat));

const daysBetween = (from: string, to: Date): number =>
  Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000);

const parseOwnerRepo = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const parts = pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  } catch {
    return null;
  }
};

const parseProjectPath = (url: string): string | null => {
  try {
    const { pathname } = new URL(url);
    const path = pathname.replace(/^\//, '').replace(/\.git$/, '');
    return path || null;
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

const stripMarkdownFences = (text: string): string => {
  const trimmed = text.trim();
  const lines = trimmed.split('\n');
  if (
    lines.length >= 2 &&
    lines[0].startsWith('```') &&
    lines[lines.length - 1].startsWith('```')
  ) {
    return lines.slice(1, -1).join('\n').trim();
  }
  return trimmed;
};

type AggregatorOptions = {
  component?: string;
  date?: Date;
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
  if (!ai) {
    throw new Error(
      'AI service is not configured. Enable AI in Settings > AI Configuration to use weekly reports.',
    );
  }

  // --- Discover repos from the weekly repo config ---
  const repos = component
    ? await getWeeklyReposByComponent(component)
    : await getEnabledWeeklyRepos();

  const githubRepos = repos.filter(repo => repo.provider === 'github');
  const gitlabRepos = repos.filter(repo => repo.provider === 'gitlab');

  if (repos.length === 0) {
    const msg = 'No weekly report repositories configured. Add repos in Settings > Weekly Report.';
    warnings.push(msg);
    logWeeklyPoll('github', msg);
  }

  // --- Fetch from all GitHub repos ---
  stepWeeklyPoll('github', 'Fetching GitHub PRs and commits');
  let githubPRs: GitHubPR[] = [];
  let githubCommits: GitHubCommit[] = [];
  const githubConfigs: GitHubClientConfig[] = [];

  if (githubRepos.length > 0) {
    const ghToken = await getSetting('github.token');
    if (!ghToken) {
      const msg = `⚠ GitHub token missing — ${githubRepos.length} GitHub repo(s) configured but no token set. Go to Settings > Integrations > Git and set github.token`;
      warnings.push(msg);
      logWeeklyPoll('github', msg);
    } else {
      for (const ghRepo of githubRepos) {
        const ownerRepo = parseOwnerRepo(ghRepo.url);
        if (!ownerRepo) {
          const msg = `Cannot parse owner/repo from URL: ${ghRepo.url}`;
          warnings.push(msg);
          logWeeklyPoll('github', msg);
          continue;
        }
        const config: GitHubClientConfig = { repo: ownerRepo, token: ghToken };
        githubConfigs.push(config);
        try {
          const [prs, commits] = await Promise.all([
            fetchPRs(config, since, until),
            fetchCommits(config, since, until),
          ]);
          githubPRs = [...githubPRs, ...prs];
          githubCommits = [...githubCommits, ...commits];
          logWeeklyPoll('github', `${ghRepo.name}: ${prs.length} PRs, ${commits.length} commits`);
        } catch (err) {
          const msg = `GitHub data unavailable for ${ghRepo.name}: ${(err as Error).message}`;
          log.warn({ err, repo: ghRepo.name }, 'GitHub fetch failed');
          warnings.push(msg);
          logWeeklyPoll('github', `⚠ ${msg}`);
        }
      }
    }
  }

  // --- Fetch from all GitLab repos ---
  stepWeeklyPoll('gitlab', 'Fetching GitLab MRs and commits');
  let gitlabMRs: GitLabMR[] = [];
  let gitlabCommits: GitLabCommit[] = [];

  if (gitlabRepos.length > 0) {
    const glToken = await getSetting('gitlab.token');
    if (!glToken) {
      const msg = `⚠ GitLab token missing — ${gitlabRepos.length} GitLab repo(s) configured but no token set. Go to Settings > Integrations > Git and set gitlab.token`;
      warnings.push(msg);
      logWeeklyPoll('gitlab', msg);
    } else {
      for (const glRepo of gitlabRepos) {
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
          const [mrs, commits] = await Promise.all([
            fetchMRs(config, since, until),
            fetchGitLabCommits(config, since, until),
          ]);
          gitlabMRs = [...gitlabMRs, ...mrs];
          gitlabCommits = [...gitlabCommits, ...commits];
          logWeeklyPoll('gitlab', `${glRepo.name}: ${mrs.length} MRs, ${commits.length} commits`);
        } catch (err) {
          const msg = `GitLab data unavailable for ${glRepo.name}: ${(err as Error).message}`;
          log.warn({ err, repo: glRepo.name }, 'GitLab fetch failed');
          warnings.push(msg);
          logWeeklyPoll('gitlab', `⚠ ${msg}`);
        }
      }
    }
  }

  // --- Fetch Jira tickets (uses existing Jira config) ---
  stepWeeklyPoll('jira', 'Fetching Jira tickets');
  let jiraIssues: WeeklyJiraIssue[] = [];
  const jiraToken = await getSetting('jira.token');
  if (!jiraToken) {
    const msg = '⚠ Jira token missing — Go to Settings > Integrations > Jira and set jira.token';
    warnings.push(msg);
    logWeeklyPoll('jira', msg);
  } else {
    try {
      jiraIssues = await searchTeamTickets(start.toISOString().split('T')[0], component);
      logWeeklyPoll('jira', `${jiraIssues.length} Jira tickets fetched`);
    } catch (err) {
      const msg = `Jira data unavailable: ${(err as Error).message}`;
      log.warn({ err }, 'Jira fetch failed');
      warnings.push(msg);
      logWeeklyPoll('jira', `⚠ ${msg}`);
    }
  }

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
  const existingMembers = await listActiveTeamMembers(component);
  await discoverAndMapMembers(ai, githubPRs, jiraIssues, gitlabMRs, existingMembers, component);
  const members = await listActiveTeamMembers(component);

  // --- Enrich PRs and build per-person data ---
  stepWeeklyPoll('ai-summary', 'Building reports and AI summaries');
  const now = new Date();
  const allPRs: PRSummary[] = [];
  const allTickets: JiraTicket[] = [];
  const allCommits: CommitSummary[] = [];

  for (const pr of githubPRs) {
    if (!pr.user || isBot(pr.user.login)) continue;

    let reviews: { reviewer: string; state: string; submittedAt: string | null }[] = [];
    let commentCount = 0;
    const prConfig = githubConfigs[0];
    if (prConfig) {
      try {
        const [rawReviews, rawComments] = await Promise.all([
          fetchPRReviews(prConfig, pr.number),
          fetchPRCommentCount(prConfig, pr.number),
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
    }

    const prState = pr.merged_at ? 'merged' : pr.draft ? 'draft' : (pr.state as 'open' | 'closed');
    const daysOpen = daysBetween(pr.created_at, now);
    const isStuck =
      prState !== 'merged' &&
      prState !== 'closed' &&
      daysOpen >= STUCK_DAYS_THRESHOLD &&
      reviews.length === 0;
    const repoSlug = findRepoSlugForPR(githubConfigs, pr);

    allPRs.push({
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

  for (const mergeRequest of gitlabMRs) {
    if (isBot(mergeRequest.author.username)) continue;
    const mrState = mergeRequest.merged_at
      ? 'merged'
      : mergeRequest.state === 'opened'
        ? mergeRequest.work_in_progress
          ? 'draft'
          : 'open'
        : 'closed';
    allPRs.push({
      author: mergeRequest.author.username,
      closedAt: null,
      commentCount: 0,
      createdAt: mergeRequest.created_at,
      daysOpen: daysBetween(mergeRequest.created_at, now),
      isStuck: false,
      mergedAt: mergeRequest.merged_at,
      number: mergeRequest.iid,
      reviewCount: 0,
      reviews: [],
      source: 'gitlab',
      state: mrState,
      title: mergeRequest.title,
      updatedAt: mergeRequest.updated_at,
      url: mergeRequest.web_url,
    });
  }

  for (const issue of jiraIssues) {
    const status = issue.fields.status.name;
    const isBlocked =
      status.toLowerCase().includes('block') ||
      (issue.fields.labels ?? []).some(lbl => lbl.toLowerCase().includes('blocked'));
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

    allTickets.push({
      assignee: issue.fields.assignee?.displayName ?? null,
      assigneeAccountId: issue.fields.assignee?.accountId ?? null,
      commentCount: issue.fields.comment?.total ?? 0,
      createdAt: null,
      isBlocked,
      issueType: issue.fields.issuetype?.name ?? null,
      key: issue.key,
      labels: issue.fields.labels ?? [],
      lastCommentDate: issue.fields.comment?.comments?.length
        ? issue.fields.comment.comments[issue.fields.comment.comments.length - 1].created
        : null,
      priority: issue.fields.priority?.name ?? null,
      status,
      storyPoints: issue.fields.story_points ?? null,
      summary: issue.fields.summary,
      transitions,
      updatedAt: issue.fields.updated,
      url: `https://redhat.atlassian.net/browse/${issue.key}`,
    });
  }

  for (const commit of githubCommits) {
    if (!commit.author || isBot(commit.author.login)) continue;
    allCommits.push({
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
    allCommits.push({
      author: commit.author_name,
      date: commit.committed_date,
      message: commit.title,
      sha: commit.id.slice(0, 7),
      source: 'gitlab',
      url: commit.web_url,
    });
  }

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
    if (taskResult?.content) {
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
    if (summaryResult?.content) {
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
    const results = await Promise.allSettled(
      batch.map(async ({ member, memberCommits, memberPRs, memberTickets }) => {
        const result = await ai.runPrompt('person-highlights', {
          commits: JSON.stringify(memberCommits.slice(0, 20)),
          displayName: member.display_name,
          prs: JSON.stringify(memberPRs),
          tickets: JSON.stringify(memberTickets),
        });
        return { id: member.id, summary: result?.content ?? null };
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

const findRepoSlugForPR = (configs: GitHubClientConfig[], _pr: GitHubPR): string =>
  configs[0]?.repo ?? 'unknown/unknown';

type AIServiceType = NonNullable<ReturnType<typeof getAIService>>;

const discoverAndMapMembers = async (
  ai: AIServiceType,
  githubPRs: GitHubPR[],
  jiraIssues: WeeklyJiraIssue[],
  gitlabMRs: GitLabMR[],
  existingMembers: Awaited<ReturnType<typeof listActiveTeamMembers>>,
  component?: string,
): Promise<void> => {
  const githubUsers = [
    ...new Set(
      githubPRs
        .map(pr => pr.user?.login)
        .filter((user): user is string => Boolean(user))
        .filter(user => !isBot(user)),
    ),
  ];

  const jiraUsersMap = new Map(
    jiraIssues
      .filter(issue => issue.fields.assignee && !isBot(issue.fields.assignee.displayName))
      .map(issue => [issue.fields.assignee!.accountId, issue.fields.assignee!.displayName]),
  );
  const jiraUsers = [...jiraUsersMap.entries()].map(([accountId, displayName]) => ({
    accountId,
    displayName,
  }));

  const gitlabUsers = [
    ...new Set(gitlabMRs.map(glMR => glMR.author.username).filter(user => !isBot(user))),
  ];

  setAvailableUsers({ githubUsers, gitlabUsers });

  logWeeklyPoll(
    'ai-mapping',
    `Found ${githubUsers.length} GitHub, ${jiraUsers.length} Jira, ${gitlabUsers.length} GitLab users`,
  );

  // --- Step 1: Create team members from Jira assignees only ---
  let createdCount = 0;
  for (const jiraUser of jiraUsers) {
    const existing = await findTeamMemberByJira(jiraUser.accountId);
    if (!existing) {
      await createTeamMember({
        component,
        displayName: jiraUser.displayName,
        jiraAccountId: jiraUser.accountId,
      });
      createdCount++;
    }
  }
  if (createdCount > 0) {
    logWeeklyPoll('ai-mapping', `Created ${createdCount} new team members from Jira`);
  }

  if (githubUsers.length === 0 && gitlabUsers.length === 0) {
    logWeeklyPoll(
      'ai-mapping',
      'No GitHub/GitLab users to map — configure tokens in Settings > Integrations',
    );
    return;
  }

  // --- Step 2: AI maps Jira members → GitHub/GitLab usernames ---
  const refreshedMembers = await listActiveTeamMembers(component);

  const result = await ai.runPrompt('identity-mapping', {
    existingMembers: JSON.stringify(
      refreshedMembers.map(member => ({
        displayName: member.display_name,
        githubUsername: member.github_username,
        gitlabUsername: member.gitlab_username,
        id: member.id,
        jiraAccountId: member.jira_account_id,
      })),
    ),
    githubUsers: JSON.stringify(githubUsers),
    gitlabUsers: JSON.stringify(gitlabUsers),
    jiraUsers: JSON.stringify(jiraUsers),
  });

  if (!result?.content) {
    logWeeklyPoll('ai-mapping', '⚠ AI identity mapping returned empty response');
    return;
  }

  const mappings = JSON.parse(stripMarkdownFences(result.content)) as {
    confidence: number;
    displayName: string;
    existingMemberId?: string;
    githubUsername?: string;
    gitlabUsername?: string;
    jiraAccountId?: string;
  }[];

  logWeeklyPoll('ai-mapping', `AI returned ${mappings.length} identity mappings`);

  let mappedCount = 0;
  for (const mapping of mappings) {
    const ghLabel = mapping.githubUsername ?? '—';
    const glLabel = mapping.gitlabUsername ?? '—';
    const confidence = Math.round(mapping.confidence * 100);

    if (!mapping.existingMemberId) {
      logWeeklyPoll('ai-mapping', `  skip: ${mapping.displayName} (no matching team member)`);
      continue;
    }

    const hasMapping = mapping.githubUsername ?? mapping.gitlabUsername;
    if (!hasMapping) {
      logWeeklyPoll('ai-mapping', `  no match: ${mapping.displayName} (${confidence}%)`);
      continue;
    }

    logWeeklyPoll(
      'ai-mapping',
      `  mapped: ${mapping.displayName} → GitHub: ${ghLabel}, GitLab: ${glLabel} (${confidence}%)`,
    );

    const updates: Record<string, unknown> = {
      aiMapped: true,
      mappingConfidence: mapping.confidence,
    };
    if (mapping.githubUsername) updates.githubUsername = mapping.githubUsername;
    if (mapping.gitlabUsername) updates.gitlabUsername = mapping.gitlabUsername;
    if (mapping.displayName) updates.displayName = mapping.displayName;
    await updateTeamMember(mapping.existingMemberId, updates);
    mappedCount++;
  }

  logWeeklyPoll('ai-mapping', `Mapped ${mappedCount}/${refreshedMembers.length} members`);
  log.info({ mappedCount, total: refreshedMembers.length }, 'AI identity mapping complete');
};
