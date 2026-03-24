import { z } from 'zod';

export const AcknowledgmentSchema = z.object({
  acknowledged_at: z.string().nullish(),
  date: z.string(),
  notes: z.string().nullish(),
  reviewer: z.string(),
});

export type Acknowledgment = z.infer<typeof AcknowledgmentSchema>;

export const AcknowledgmentStatusSchema = z.object({
  acknowledged: z.boolean(),
  acknowledgments: z.array(AcknowledgmentSchema),
  date: z.string(),
});

export type AcknowledgmentStatus = z.infer<typeof AcknowledgmentStatusSchema>;

export const ApproverStatSchema = z.object({
  lastReviewDate: z.string(),
  reviewedDates: z.array(z.string()),
  reviewer: z.string(),
  totalReviews: z.number(),
});

export type ApproverStat = z.infer<typeof ApproverStatSchema>;

export const AckHistoryEntrySchema = z.object({
  acknowledged: z.boolean(),
  date: z.string(),
  firstAckAt: z.string().nullish(),
  reviewers: z.array(z.string()),
});

export type AckHistoryEntry = z.infer<typeof AckHistoryEntrySchema>;

export const DeleteAckRequestSchema = z.object({
  reviewer: z.string().min(1),
});

export type DeleteAckRequest = z.infer<typeof DeleteAckRequestSchema>;
