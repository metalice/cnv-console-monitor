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
