import { z } from 'zod';

export const TrendPointSchema = z.object({
  date: z.string(),
  total: z.number(),
  passed: z.number(),
  rate: z.number(),
});

export type TrendPoint = z.infer<typeof TrendPointSchema>;
