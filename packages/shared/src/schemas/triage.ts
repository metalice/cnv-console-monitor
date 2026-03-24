import { z } from 'zod';

export const TriageRequestSchema = z.object({
  comment: z.string().optional(),
  defectType: z.string().min(1),
  performedBy: z.string().optional(),
});

export type TriageRequest = z.infer<typeof TriageRequestSchema>;

export const CommentRequestSchema = z.object({
  comment: z.string().min(1),
  performedBy: z.string().optional(),
});

export type CommentRequest = z.infer<typeof CommentRequestSchema>;

export const BulkTriageRequestSchema = z.object({
  comment: z.string().optional(),
  defectType: z.string().min(1),
  itemIds: z.array(z.number()).min(1),
  performedBy: z.string().optional(),
});

export type BulkTriageRequest = z.infer<typeof BulkTriageRequestSchema>;

export const JiraCreateRequestSchema = z.object({
  performedBy: z.string().optional(),
  testItemId: z.number(),
});

export type JiraCreateRequest = z.infer<typeof JiraCreateRequestSchema>;

export const JiraLinkRequestSchema = z.object({
  jiraKey: z.string().min(1),
  performedBy: z.string().optional(),
  testItemId: z.number(),
});

export type JiraLinkRequest = z.infer<typeof JiraLinkRequestSchema>;

export const TestNoteSchema = z.object({
  jiraKey: z.string().optional(),
  note: z.string().min(1),
  testName: z.string(),
});

export type TestNote = z.infer<typeof TestNoteSchema>;

export const AcknowledgeRequestSchema = z.object({
  component: z.string().optional(),
  notes: z.string().optional(),
  reviewer: z.string().min(1),
  testNotes: z.array(TestNoteSchema).optional(),
});

export type AcknowledgeRequest = z.infer<typeof AcknowledgeRequestSchema>;
