import {
  type CommitSummary,
  getReportId,
  getWeekBoundaries,
  getWeekId,
  type JiraTicket,
  type PRSummary,
  type TaskSummary,
} from '@cnv-monitor/shared';

import { getAIService } from '../ai/AIService';
import { fetchSheetRows, fetchVersionTabs, isSheetsConfigured } from '../clients/sheets';
import { type TeamMemberEntity } from '../db/entities/TeamMemberEntity';
import {
  getEnabledReportRepos,
  listActiveTeamMembers,
  savePersonReport,
  upsertReport,
} from '../db/store';
import { getReportReposByComponent } from '../db/store';
import { logger } from '../logger';

import { fetchGitHubData, fetchGitLabData, fetchJiraData } from './fetchers';
import { discoverAndMapMembers } from './identityMapper';
import { collectCommitSummaries, enrichGitHubPRs, mapGitLabMRs, mapJiraTickets } from './mappers';
import { logReportPoll, setCurrentPollComponent, stepReportPoll } from './pollState';
import { stripMarkdownFences } from './utils';

const log = logger.child({ module: 'TeamReport:Aggregator' });

type AggregatorOptions = {
  component?: string;
  date?: Date;
  generatedBy?: string;
  since?: string;
  until?: string;
};

const DONE_STATUSES = new Set(['done', 'closed', 'resolved']);
const AI_CONCURRENCY = 5;

type MemberEntry = {
  hasActivity: boolean;
  member: TeamMemberEntity;
  memberCommits: CommitSummary[];
  memberPRs: PRSummary[];
  memberTickets: JiraTicket[];
  stats: {
    commitCount: number;
    prsMerged: number;
    prsOpened: number;
    prsReviewed: number;
    storyPointsCompleted: number;
    ticketsBlocked: number;
    ticketsDone: number;
    ticketsInProgress: number;
  };
};

const buildMemberData = (
  members: TeamMemberEntity[],
  allPRs: PRSummary[],
  allTickets: JiraTicket[],
  allCommits: CommitSummary[],
): MemberEntry[] =>
  members.map(member => {
    const memberPRs = allPRs.filter(
      pr => pr.author === member.github_username || pr.author === member.gitlab_username,
    );
    const memberTickets = member.jira_account_id
      ? allTickets.filter(tkt => tkt.assigneeAccountId === member.jira_account_id)
      : [];
    const memberCommits = allCommits.filter(
      cmt =>
        cmt.author === member.github_username ||
        cmt.author === member.gitlab_username ||
        cmt.author === member.display_name,
    );
    const stats = {
      commitCount: memberCommits.length,
      prsMerged: memberPRs.filter(pr => pr.state === 'merged').length,
      prsOpened: memberPRs.filter(pr => pr.state === 'open' || pr.state === 'draft').length,
      prsReviewed: 0,
      storyPointsCompleted: memberTickets
        .filter(tkt => DONE_STATUSES.has(tkt.status.toLowerCase()))
        .reduce((sum, tkt) => sum + (tkt.storyPoints ?? 0), 0),
      ticketsBlocked: memberTickets.filter(tkt => tkt.isBlocked).length,
      ticketsDone: memberTickets.filter(tkt => DONE_STATUSES.has(tkt.status.toLowerCase())).length,
      ticketsInProgress: memberTickets.filter(tkt => tkt.status.toLowerCase().includes('progress'))
        .length,
    };
    const hasActivity = memberPRs.length > 0 || memberTickets.length > 0;
    return { hasActivity, member, memberCommits, memberPRs, memberTickets, stats };
  });

type AIServiceInstance = ReturnType<typeof getAIService>;

const generateAISummaries = async (
  ai: AIServiceInstance,
  memberData: MemberEntry[],
): Promise<Map<string, string | null>> => {
  const summaries = new Map<string, string | null>();
  const membersNeedingAI = memberData.filter(entry => entry.hasActivity);

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
        summaries.set(result.value.id, result.value.summary);
      }
    }
  }

  return summaries;
};

type TaskSummaryInput = {
  ai: AIServiceInstance;
  allCommits: CommitSummary[];
  allPRs: PRSummary[];
  allTickets: JiraTicket[];
  component: string | undefined;
  members: TeamMemberEntity[];
};

const generateTaskSummary = async ({
  ai,
  allCommits,
  allPRs,
  allTickets,
  component,
  members,
}: TaskSummaryInput): Promise<{
  managerHighlights: string | null;
  taskSummary: TaskSummary | null;
}> => {
  let taskSummary: TaskSummary | null = null;
  let managerHighlights: string | null = null;

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
      allTickets.filter(tkt => DONE_STATUSES.has(tkt.status.toLowerCase())).length,
    ),
  });
  if (summaryResult.content) {
    managerHighlights = summaryResult.content;
  }

  return { managerHighlights, taskSummary };
};

const computeAggregateStats = (
  allPRs: PRSummary[],
  allTickets: JiraTicket[],
  allCommits: CommitSummary[],
) => {
  const uniqueAuthors = new Set<string>();
  for (const pr of allPRs) {
    if (pr.state === 'merged' || pr.state === 'open' || pr.state === 'draft') {
      uniqueAuthors.add(pr.author);
    }
  }
  for (const cmt of allCommits) {
    uniqueAuthors.add(cmt.author);
  }

  return {
    commitCount: allCommits.length,
    contributorCount: uniqueAuthors.size,
    prsMerged: allPRs.filter(pr => pr.state === 'merged').length,
    storyPoints: allTickets
      .filter(tkt => DONE_STATUSES.has(tkt.status.toLowerCase()))
      .reduce((sum, tkt) => sum + (tkt.storyPoints ?? 0), 0),
    ticketsDone: allTickets.filter(tkt => DONE_STATUSES.has(tkt.status.toLowerCase())).length,
  };
};

export const generateReport = async (options: AggregatorOptions = {}): Promise<void> => {
  const { component, date = new Date(), generatedBy } = options;
  let since: string;
  let until: string;
  let weekId: string;

  if (options.since && options.until) {
    since = new Date(options.since).toISOString();
    until = new Date(options.until).toISOString();
    weekId = getReportId(options.since, options.until);
  } else {
    const { end, start } = getWeekBoundaries(date);
    since = start.toISOString();
    until = end.toISOString();
    weekId = getWeekId(date);
  }
  const warnings: string[] = [];

  setCurrentPollComponent(component);
  log.info({ component, since, until, weekId }, 'Starting team report generation');

  const ai = getAIService();

  const repos = component
    ? await getReportReposByComponent(component)
    : await getEnabledReportRepos();

  if (repos.length === 0) {
    const msg = 'No report repositories configured. Add repos in Settings > Team Report.';
    warnings.push(msg);
    logReportPoll('github', msg);
  }

  stepReportPoll('github', 'Fetching GitHub PRs and commits');
  const githubRepos = repos.filter(repo => repo.provider === 'github');
  const githubData = await fetchGitHubData(githubRepos, since, until, warnings);

  stepReportPoll('gitlab', 'Fetching GitLab MRs and commits');
  const gitlabRepos = repos.filter(repo => repo.provider === 'gitlab');
  const gitlabData = await fetchGitLabData(gitlabRepos, since, until, warnings);

  stepReportPoll('jira', 'Fetching Jira tickets');
  const jiraIssues = await fetchJiraData(since.split('T')[0], component, warnings);

  stepReportPoll('sheets', 'Fetching spreadsheet data');
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

  stepReportPoll('ai-mapping', 'AI mapping team identities');
  await discoverAndMapMembers({
    ai,
    component,
    githubPRs: githubData.prs,
    gitlabMRs: gitlabData.mrs,
    jiraIssues,
  });
  const members = await listActiveTeamMembers(component);

  stepReportPoll('ai-summary', 'Building reports and AI summaries');
  const githubPRSummaries = await enrichGitHubPRs(githubData.prs, githubData.configs, since, until);
  const gitlabPRSummaries = mapGitLabMRs(gitlabData.mrs, since, until);
  const allPRs: PRSummary[] = [...githubPRSummaries, ...gitlabPRSummaries];
  const allTickets = mapJiraTickets(jiraIssues);
  const allCommits = collectCommitSummaries(githubData.commits, gitlabData.commits);

  let taskSummary: TaskSummary | null = null;
  let managerHighlights: string | null = null;
  try {
    const aiResult = await generateTaskSummary({
      ai,
      allCommits,
      allPRs,
      allTickets,
      component,
      members,
    });
    taskSummary = aiResult.taskSummary;
    managerHighlights = aiResult.managerHighlights;
  } catch (err) {
    log.warn({ err }, 'AI summary generation failed');
    warnings.push('AI summary generation failed');
  }

  const memberData = buildMemberData(members, allPRs, allTickets, allCommits);
  const aiSummaries = await generateAISummaries(ai, memberData);
  const aggregateStats = computeAggregateStats(allPRs, allTickets, allCommits);

  stepReportPoll('saving', 'Saving team report');
  const report = await upsertReport({
    aggregateStats,
    component: component ?? '',
    generatedBy,
    managerHighlights,
    taskSummary,
    warnings,
    weekEnd: until.split('T')[0],
    weekId,
    weekStart: since.split('T')[0],
  });

  await Promise.all(
    memberData.map(({ member, memberCommits, memberPRs, memberTickets, stats }) =>
      savePersonReport({
        aiSummary: aiSummaries.get(member.id) ?? null,
        commits: memberCommits,
        jiraTickets: memberTickets,
        memberId: member.id,
        prs: memberPRs,
        reportId: report.id,
        stats,
        weekId: report.week_id,
      }),
    ),
  );

  log.info({ component, memberCount: members.length, weekId }, 'Team report generation complete');
};
