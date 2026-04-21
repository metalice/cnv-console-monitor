import {
  type AggregateStats,
  type CommitSummary,
  type JiraTicket,
  type PersonReport,
  type PersonReportStats,
  type PRSummary,
  type TaskSummary,
  type TeamMember,
  type TeamReport,
} from '@cnv-monitor/shared';

import { type PersonReportEntity } from '../entities/PersonReportEntity';
import { type ReportEntity } from '../entities/ReportEntity';
import { type TeamMemberEntity } from '../entities/TeamMemberEntity';

export const entityToTeamMember = (entity: TeamMemberEntity): TeamMember => ({
  aiMapped: entity.ai_mapped,
  component: entity.component,
  createdAt: entity.created_at.toISOString(),
  displayName: entity.display_name,
  email: entity.email,
  githubUsername: entity.github_username,
  gitlabUsername: entity.gitlab_username,
  id: entity.id,
  isActive: entity.is_active,
  jiraAccountId: entity.jira_account_id,
  mappingConfidence: entity.mapping_confidence,
  updatedAt: entity.updated_at.toISOString(),
});

const entityToPersonReport = (entity: PersonReportEntity): PersonReport => ({
  aiSummary: entity.ai_summary,
  commits: entity.commits as CommitSummary[],
  excluded: entity.excluded,
  jiraTickets: entity.jira_tickets as JiraTicket[],
  managerNotes: entity.manager_notes,
  member: entityToTeamMember(entity.member),
  memberId: entity.member_id,
  prs: entity.prs as PRSummary[],
  sortOrder: entity.sort_order,
  stats: entity.stats as PersonReportStats,
});

export const entityToReport = (entity: ReportEntity): TeamReport => {
  const warnings = entity.warnings ? entity.warnings.split(',').filter(Boolean) : [];

  return {
    aggregateStats: entity.aggregate_stats as AggregateStats | null,
    component: entity.component || null,
    createdAt: entity.created_at.toISOString(),
    generatedBy: entity.generated_by,
    id: entity.id,
    managerHighlights: entity.manager_highlights,
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: relation may not be loaded
    personReports: (entity.person_reports ?? []).map(entityToPersonReport),
    sentAt: entity.sent_at ? entity.sent_at.toISOString() : null,
    state: entity.state as 'DRAFT' | 'FINALIZED' | 'SENT',
    taskSummary: entity.task_summary as TaskSummary | null,
    updatedAt: entity.updated_at.toISOString(),
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
