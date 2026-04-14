import { type GitHubPR } from '../clients/github-weekly';
import { type GitLabMR } from '../clients/gitlab-weekly';
import { type WeeklyJiraIssue } from '../clients/jira';
import {
  createTeamMember,
  findTeamMemberByJira,
  listActiveTeamMembers,
  updateTeamMember,
} from '../db/store';
import { logger } from '../logger';

import { setAvailableUsers } from './availableUsers';
import { logWeeklyPoll } from './pollState';
import { isBot, stripMarkdownFences } from './utils';

const log = logger.child({ module: 'WeeklyReport:IdentityMapper' });

type AIServiceType = {
  runPrompt: (
    template: string,
    variables: Record<string, string>,
  ) => Promise<{ content: string | null } | null>;
};

type DiscoverAndMapOptions = {
  ai: AIServiceType;
  component?: string;
  githubPRs: GitHubPR[];
  gitlabMRs: GitLabMR[];
  jiraIssues: WeeklyJiraIssue[];
};

export const discoverAndMapMembers = async (options: DiscoverAndMapOptions): Promise<void> => {
  const { ai, component, githubPRs, gitlabMRs, jiraIssues } = options;

  const githubUsers = [
    ...new Set(
      githubPRs
        .map(pr => pr.user?.login)
        .filter((user): user is string => Boolean(user))
        .filter(user => !isBot(user)),
    ),
  ];

  const jiraUsersMap = new Map<string, string>();
  for (const issue of jiraIssues) {
    const assignee = issue.fields.assignee;
    if (assignee && !isBot(assignee.displayName)) {
      jiraUsersMap.set(assignee.accountId, assignee.displayName);
    }
  }
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

  let createdCount = 0;
  for (const jiraUser of jiraUsers) {
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    const existing = await findTeamMemberByJira(jiraUser.accountId);
    if (!existing) {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
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
    // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
    await updateTeamMember(mapping.existingMemberId, updates);
    mappedCount++;
  }

  logWeeklyPoll('ai-mapping', `Mapped ${mappedCount}/${refreshedMembers.length} members`);
  log.info({ mappedCount, total: refreshedMembers.length }, 'AI identity mapping complete');
};
