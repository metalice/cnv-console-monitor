import { z } from 'zod';

export const TriageRequestSchema = z.object({
  defectType: z.string().min(1),
  comment: z.string().optional(),
  performedBy: z.string().optional(),
});

export type TriageRequest = z.infer<typeof TriageRequestSchema>;

export const CommentRequestSchema = z.object({
  comment: z.string().min(1),
  performedBy: z.string().optional(),
});

export type CommentRequest = z.infer<typeof CommentRequestSchema>;

export const BulkTriageRequestSchema = z.object({
  itemIds: z.array(z.number()).min(1),
  defectType: z.string().min(1),
  comment: z.string().optional(),
  performedBy: z.string().optional(),
});

export type BulkTriageRequest = z.infer<typeof BulkTriageRequestSchema>;

export const JiraCreateRequestSchema = z.object({
  testItemId: z.number(),
  performedBy: z.string().optional(),
});

export type JiraCreateRequest = z.infer<typeof JiraCreateRequestSchema>;

export const JiraLinkRequestSchema = z.object({
  testItemId: z.number(),
  jiraKey: z.string().min(1),
  performedBy: z.string().optional(),
});

export type JiraLinkRequest = z.infer<typeof JiraLinkRequestSchema>;

export const AcknowledgeRequestSchema = z.object({
  reviewer: z.string().min(1),
  notes: z.string().optional(),
});

export type AcknowledgeRequest = z.infer<typeof AcknowledgeRequestSchema>;
