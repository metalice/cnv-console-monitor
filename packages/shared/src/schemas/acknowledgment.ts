import { z } from 'zod';

export const AcknowledgmentSchema = z.object({
  date: z.string(),
  reviewer: z.string(),
  notes: z.string().nullish(),
  acknowledged_at: z.string().nullish(),
});

export type Acknowledgment = z.infer<typeof AcknowledgmentSchema>;

export const AcknowledgmentStatusSchema = z.object({
  date: z.string(),
  acknowledged: z.boolean(),
  acknowledgments: z.array(AcknowledgmentSchema),
});

export type AcknowledgmentStatus = z.infer<typeof AcknowledgmentStatusSchema>;

export const ApproverStatSchema = z.object({
  reviewer: z.string(),
  totalReviews: z.number(),
  lastReviewDate: z.string(),
  reviewedDates: z.array(z.string()),
});

export type ApproverStat = z.infer<typeof ApproverStatSchema>;

export const AckHistoryEntrySchema = z.object({
  date: z.string(),
  acknowledged: z.boolean(),
  reviewers: z.array(z.string()),
  firstAckAt: z.string().nullish(),
});

export type AckHistoryEntry = z.infer<typeof AckHistoryEntrySchema>;

export const DeleteAckRequestSchema = z.object({
  reviewer: z.string().min(1),
});

export type DeleteAckRequest = z.infer<typeof DeleteAckRequestSchema>;
