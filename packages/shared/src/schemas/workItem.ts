import { z } from 'zod';

export const WorkItemStatusEnum = z.enum(['IN_PROGRESS', 'IN_REVIEW', 'DONE', 'STUCK', 'BLOCKED']);
export type WorkItemStatus = z.infer<typeof WorkItemStatusEnum>;

export const WorkItemSourceEnum = z.enum(['GITHUB', 'GITLAB', 'JIRA', 'SPREADSHEET']);
export type WorkItemSource = z.infer<typeof WorkItemSourceEnum>;

export const WorkItemSchema = z.object({
  assignee: z.string().nullish(),
  id: z.string(),
  source: WorkItemSourceEnum,
  status: WorkItemStatusEnum,
  title: z.string(),
  updatedAt: z.string().nullish(),
  url: z.string().url(),
});

export type WorkItem = z.infer<typeof WorkItemSchema>;
