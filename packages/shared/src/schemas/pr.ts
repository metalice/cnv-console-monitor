import { z } from 'zod';

export const PRStateEnum = z.enum(['open', 'closed', 'merged', 'draft']);
export type PRState = z.infer<typeof PRStateEnum>;

export const PRReviewSchema = z.object({
  reviewer: z.string(),
  state: z.string(),
  submittedAt: z.string().nullish(),
});

export type PRReview = z.infer<typeof PRReviewSchema>;

export const PRSummarySchema = z.object({
  author: z.string(),
  closedAt: z.string().nullish(),
  commentCount: z.number().default(0),
  createdAt: z.string(),
  daysOpen: z.number().default(0),
  isStuck: z.boolean().default(false),
  mergedAt: z.string().nullish(),
  number: z.number(),
  reviewCount: z.number().default(0),
  reviews: z.array(PRReviewSchema).default([]),
  source: z.enum(['github', 'gitlab']),
  state: PRStateEnum,
  title: z.string(),
  updatedAt: z.string().nullish(),
  url: z.string().url(),
});

export type PRSummary = z.infer<typeof PRSummarySchema>;
