import { z } from 'zod';

import { CommitSummarySchema } from './commitSummary';
import { JiraTicketSchema } from './jiraTicket';
import { PRSummarySchema } from './pr';
import { TaskSummarySchema } from './taskSummary';
import { TeamMemberSchema } from './teamMember';

export const ReportStateEnum = z.enum(['DRAFT', 'FINALIZED', 'SENT']);
export type ReportState = z.infer<typeof ReportStateEnum>;

export const PersonReportStatsSchema = z.object({
  commitCount: z.number().default(0),
  prsMerged: z.number().default(0),
  prsOpened: z.number().default(0),
  prsReviewed: z.number().default(0),
  storyPointsCompleted: z.number().default(0),
  ticketsBlocked: z.number().default(0),
  ticketsDone: z.number().default(0),
  ticketsInProgress: z.number().default(0),
});

export type PersonReportStats = z.infer<typeof PersonReportStatsSchema>;

export const PersonReportSchema = z.object({
  aiSummary: z.string().nullish(),
  commits: z.array(CommitSummarySchema).default([]),
  excluded: z.boolean().default(false),
  jiraTickets: z.array(JiraTicketSchema).default([]),
  managerNotes: z.string().nullish(),
  member: TeamMemberSchema,
  memberId: z.string(),
  prs: z.array(PRSummarySchema).default([]),
  sortOrder: z.number().default(0),
  stats: PersonReportStatsSchema,
});

export type PersonReport = z.infer<typeof PersonReportSchema>;

export const AggregateStatsSchema = z.object({
  commitCount: z.number().default(0),
  contributorCount: z.number().default(0),
  prsMerged: z.number().default(0),
  storyPoints: z.number().default(0),
  ticketsDone: z.number().default(0),
});

export type AggregateStats = z.infer<typeof AggregateStatsSchema>;

export const TeamReportSchema = z.object({
  aggregateStats: AggregateStatsSchema.nullish(),
  component: z.string().nullish(),
  createdAt: z.string().nullish(),
  id: z.string(),
  managerHighlights: z.string().nullish(),
  personReports: z.array(PersonReportSchema).default([]),
  sentAt: z.string().nullish(),
  state: ReportStateEnum,
  taskSummary: TaskSummarySchema.nullish(),
  updatedAt: z.string().nullish(),
  warnings: z.array(z.string()).default([]),
  weekEnd: z.string(),
  weekId: z.string(),
  weekStart: z.string(),
});

export type TeamReport = z.infer<typeof TeamReportSchema>;

export const UpdateReportRequestSchema = z.object({
  managerHighlights: z.string().nullish(),
  personUpdates: z
    .array(
      z.object({
        excluded: z.boolean().optional(),
        managerNotes: z.string().nullish(),
        memberId: z.string(),
        sortOrder: z.number().optional(),
      }),
    )
    .optional(),
  taskSummary: TaskSummarySchema.optional(),
});

export type UpdateReportRequest = z.infer<typeof UpdateReportRequestSchema>;
