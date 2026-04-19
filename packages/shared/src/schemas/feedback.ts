import { z } from 'zod';

export const FeedbackCategorySchema = z.enum(['bug', 'feature', 'improvement', 'general']);
export type FeedbackCategory = z.infer<typeof FeedbackCategorySchema>;

export const FeedbackStatusSchema = z.enum(['new', 'acknowledged', 'resolved', 'closed']);
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>;

export const FeedbackPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type FeedbackPriority = z.infer<typeof FeedbackPrioritySchema>;

export const FEEDBACK_DESCRIPTION_MAX = 2000;
export const FEEDBACK_DESCRIPTION_MIN = 10;
export const FEEDBACK_TAG_MAX_LENGTH = 50;
export const FEEDBACK_TAGS_MAX_COUNT = 10;
export const FEEDBACK_SCREENSHOT_MAX_BYTES = 2_000_000;
export const FEEDBACK_RESPONSE_MAX = 1000;
export const FEEDBACK_ADMIN_NOTE_MAX = 1000;

export const CreateFeedbackRequestSchema = z.object({
  category: FeedbackCategorySchema,
  componentFilter: z.string().max(500).nullish(),
  consoleErrors: z.string().max(10_000).nullish(),
  description: z.string().trim().min(FEEDBACK_DESCRIPTION_MIN).max(FEEDBACK_DESCRIPTION_MAX),
  pageUrl: z.string().max(500),
  screenshot: z.string().max(FEEDBACK_SCREENSHOT_MAX_BYTES).nullish(),
});

export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>;

export const UpdateFeedbackRequestSchema = z.object({
  adminNote: z.string().trim().max(FEEDBACK_ADMIN_NOTE_MAX).nullish(),
  priority: FeedbackPrioritySchema.nullish(),
  satisfaction: z.boolean().nullish(),
  status: FeedbackStatusSchema.optional(),
  tags: z
    .array(z.string().trim().max(FEEDBACK_TAG_MAX_LENGTH))
    .max(FEEDBACK_TAGS_MAX_COUNT)
    .nullish(),
});

export type UpdateFeedbackRequest = z.infer<typeof UpdateFeedbackRequestSchema>;

export const CreateFeedbackResponseSchema = z.object({
  message: z.string().trim().min(1).max(FEEDBACK_RESPONSE_MAX),
});

export type CreateFeedbackResponse = z.infer<typeof CreateFeedbackResponseSchema>;

export const FeedbackResponseSchema = z.object({
  authorEmail: z.string(),
  authorName: z.string(),
  createdAt: z.string(),
  id: z.number(),
  message: z.string(),
});

export type FeedbackResponseEntry = z.infer<typeof FeedbackResponseSchema>;

export const FeedbackVoteSchema = z.object({
  createdAt: z.string(),
  userEmail: z.string(),
});

export type FeedbackVote = z.infer<typeof FeedbackVoteSchema>;

export const FeedbackSchema = z.object({
  adminNote: z.string().nullish(),
  category: FeedbackCategorySchema,
  componentFilter: z.string().nullish(),
  consoleErrors: z.string().nullish(),
  createdAt: z.string(),
  description: z.string(),
  id: z.number(),
  pageUrl: z.string(),
  priority: FeedbackPrioritySchema.nullish(),
  responseCount: z.number().default(0),
  responses: z.array(FeedbackResponseSchema).default([]),
  satisfaction: z.boolean().nullish(),
  screenshot: z.string().nullish(),
  status: FeedbackStatusSchema,
  submittedBy: z.string(),
  tags: z.array(z.string()).default([]),
  updatedAt: z.string(),
  userAgent: z.string().nullish(),
  userHasVoted: z.boolean().default(false),
  voteCount: z.number().default(0),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export const FeedbackListResponseSchema = z.object({
  items: z.array(FeedbackSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>;

export const FeedbackStatsSchema = z.object({
  acknowledged: z.number(),
  closed: z.number(),
  new: z.number(),
  resolved: z.number(),
  total: z.number(),
});

export type FeedbackStats = z.infer<typeof FeedbackStatsSchema>;
