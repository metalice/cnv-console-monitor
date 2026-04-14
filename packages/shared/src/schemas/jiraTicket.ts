import { z } from 'zod';

export const JiraTransitionSchema = z.object({
  author: z.string().nullish(),
  date: z.string(),
  from: z.string(),
  to: z.string(),
});

export type JiraTransition = z.infer<typeof JiraTransitionSchema>;

export const JiraTicketSchema = z.object({
  assignee: z.string().nullish(),
  assigneeAccountId: z.string().nullish(),
  commentCount: z.number().default(0),
  createdAt: z.string().nullish(),
  isBlocked: z.boolean().default(false),
  issueType: z.string().nullish(),
  key: z.string(),
  labels: z.array(z.string()).default([]),
  lastCommentDate: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string(),
  storyPoints: z.number().nullish(),
  summary: z.string(),
  transitions: z.array(JiraTransitionSchema).default([]),
  updatedAt: z.string().nullish(),
  url: z.string().url(),
});

export type JiraTicket = z.infer<typeof JiraTicketSchema>;
