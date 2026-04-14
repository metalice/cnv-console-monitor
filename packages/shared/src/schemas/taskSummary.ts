import { z } from 'zod';

export const InitiativeStatusEnum = z.enum(['done', 'in-progress', 'blocked', 'at-risk']);
export type InitiativeStatus = z.infer<typeof InitiativeStatusEnum>;

export const InitiativeSchema = z.object({
  contributors: z.array(z.string()).default([]),
  name: z.string(),
  relatedPRs: z.array(z.number()).default([]),
  relatedTickets: z.array(z.string()).default([]),
  status: InitiativeStatusEnum,
  summary: z.string(),
});

export type Initiative = z.infer<typeof InitiativeSchema>;

export const BlockerSchema = z.object({
  description: z.string(),
  severity: z.enum(['high', 'medium', 'low']).default('medium'),
  suggestedAction: z.string().nullish(),
  tickets: z.array(z.string()).default([]),
});

export type Blocker = z.infer<typeof BlockerSchema>;

export const TaskSummarySchema = z.object({
  blockers: z.array(BlockerSchema).default([]),
  initiatives: z.array(InitiativeSchema).default([]),
  weekHighlights: z.string().nullish(),
});

export type TaskSummary = z.infer<typeof TaskSummarySchema>;
