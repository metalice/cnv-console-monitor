import { z } from 'zod';

export const FlakyTestSchema = z.object({
  flip_count: z.number(),
  name: z.string(),
  total_runs: z.number(),
  unique_id: z.string(),
});

export type FlakyTest = z.infer<typeof FlakyTestSchema>;
