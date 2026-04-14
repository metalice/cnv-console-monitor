import { z } from 'zod';

export const CommitSummarySchema = z.object({
  author: z.string(),
  date: z.string(),
  message: z.string(),
  sha: z.string(),
  source: z.enum(['github', 'gitlab']),
  url: z.string().url().nullish(),
});

export type CommitSummary = z.infer<typeof CommitSummarySchema>;
