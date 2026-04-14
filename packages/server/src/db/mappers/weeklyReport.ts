import {
  type CommitSummary,
  type JiraTicket,
  type PersonReport,
  type PersonReportStats,
  type PRSummary,
  type TaskSummary,
  type TeamMember,
  type WeeklyReport,
} from '@cnv-monitor/shared';

import { type PersonReportEntity } from '../entities/PersonReportEntity';
import { type TeamMemberEntity } from '../entities/TeamMemberEntity';
import { type WeeklyReportEntity } from '../entities/WeeklyReportEntity';

export const entityToTeamMember = (entity: TeamMemberEntity): TeamMember => ({
  aiMapped: entity.ai_mapped,
  component: entity.component,
  createdAt: entity.created_at?.toISOString() ?? null,
  displayName: entity.display_name,
  email: entity.email,
  githubUsername: entity.github_username,
  gitlabUsername: entity.gitlab_username,
  id: entity.id,
  isActive: entity.is_active,
  jiraAccountId: entity.jira_account_id,
  mappingConfidence: entity.mapping_confidence,
  updatedAt: entity.updated_at?.toISOString() ?? null,
});

const entityToPersonReport = (entity: PersonReportEntity): PersonReport => ({
  aiSummary: entity.ai_summary,
  commits: entity.commits as CommitSummary[],
  excluded: entity.excluded,
  jiraTickets: entity.jira_tickets as JiraTicket[],
  managerNotes: entity.manager_notes,
  member: entity.member ? entityToTeamMember(entity.member) : ({} as TeamMember),
  memberId: entity.member_id,
  prs: entity.prs as PRSummary[],
  sortOrder: entity.sort_order,
  stats: entity.stats as PersonReportStats,
});

export const entityToWeeklyReport = (entity: WeeklyReportEntity): WeeklyReport => {
  const warnings = entity.warnings ? entity.warnings.split(',').filter(Boolean) : [];

  return {
    component: entity.component || null,
    createdAt: entity.created_at?.toISOString() ?? null,
    managerHighlights: entity.manager_highlights,
    personReports: (entity.person_reports ?? []).map(entityToPersonReport),
    sentAt: entity.sent_at?.toISOString() ?? null,
    state: entity.state as 'DRAFT' | 'FINALIZED' | 'REVIEW' | 'SENT',
    taskSummary: entity.task_summary as TaskSummary | null,
    updatedAt: entity.updated_at?.toISOString() ?? null,
    warnings,
    weekEnd:
      entity.week_end instanceof Date
        ? entity.week_end.toISOString().split('T')[0]
        : String(entity.week_end),
    weekId: entity.week_id,
    weekStart:
      entity.week_start instanceof Date
        ? entity.week_start.toISOString().split('T')[0]
        : String(entity.week_start),
  };
};
