import { z } from 'zod';

export const FlakyTestSchema = z.object({
  name: z.string(),
  unique_id: z.string(),
  flip_count: z.number(),
  total_runs: z.number(),
});

export type FlakyTest = z.infer<typeof FlakyTestSchema>;
