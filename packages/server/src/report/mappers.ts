import { type CommitSummary, type JiraTicket, type PRSummary } from '@cnv-monitor/shared';

import {
  fetchPRCommentCount,
  fetchPRReviews,
  type GitHubClientConfig,
  type GitHubCommit,
  type GitHubPR,
} from '../clients/github-report';
import { type GitLabCommit, type GitLabMR } from '../clients/gitlab-report';
import { type ReportJiraIssue } from '../clients/jira';
import { logger } from '../logger';

import { daysBetween, isBot } from './utils';

const log = logger.child({ module: 'TeamReport:Mappers' });

const STUCK_DAYS_THRESHOLD = 3;

const findRepoSlugForPR = (configs: GitHubClientConfig[], _pr: GitHubPR): string =>
  configs[0]?.repo ?? 'unknown/unknown';

export const enrichGitHubPRs = async (
  githubPRs: GitHubPR[],
  githubConfigs: GitHubClientConfig[],
  since: string,
  until: string,
): Promise<PRSummary[]> => {
  const now = new Date();
  const sinceDate = new Date(since);
  const untilDate = new Date(until);
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

    const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
    const mergedInRange = mergedAt !== null && mergedAt >= sinceDate && mergedAt <= untilDate;
    const prState = mergedInRange ? 'merged' : pr.draft ? 'draft' : (pr.state as 'open' | 'closed');
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

export const mapGitLabMRs = (gitlabMRs: GitLabMR[], since: string, until: string): PRSummary[] => {
  const sinceDate = new Date(since);
  const untilDate = new Date(until);

  return gitlabMRs
    .filter(mergeRequest => !isBot(mergeRequest.author.username))
    .map(mergeRequest => {
      const mergedInRange =
        mergeRequest.merged_at !== null &&
        new Date(mergeRequest.merged_at) >= sinceDate &&
        new Date(mergeRequest.merged_at) <= untilDate;
      const mrState = mergedInRange
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
};

export const mapJiraTickets = (jiraIssues: ReportJiraIssue[]): JiraTicket[] =>
  jiraIssues.map(issue => {
    const status = issue.fields.status.name;
    const isBlocked = (issue.fields.priority?.name ?? '').toLowerCase() === 'blocker';
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

export const collectCommitSummaries = (
  githubCommits: GitHubCommit[],
  gitlabCommits: GitLabCommit[],
): CommitSummary[] => {
  const commits: CommitSummary[] = [];

  for (const commit of githubCommits) {
    const author = commit.author?.login ?? commit.commit.author?.name ?? '';
    if (!author || isBot(author)) continue;
    commits.push({
      author,
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
