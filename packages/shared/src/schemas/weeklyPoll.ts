import { z } from 'zod';

export const WeeklyPollStepEnum = z.enum([
  'idle',
  'github',
  'gitlab',
  'jira',
  'sheets',
  'ai-mapping',
  'ai-summary',
  'saving',
]);
export type WeeklyPollStep = z.infer<typeof WeeklyPollStepEnum>;

export const WeeklyPollStatusEnum = z.enum(['idle', 'running', 'completed', 'failed']);
export type WeeklyPollStatusValue = z.infer<typeof WeeklyPollStatusEnum>;

export const WeeklyPollLogSchema = z.object({
  message: z.string(),
  step: WeeklyPollStepEnum,
  timestamp: z.string(),
});
export type WeeklyPollLog = z.infer<typeof WeeklyPollLogSchema>;

export const WeeklyPollStatusSchema = z.object({
  completedAt: z.string().nullish(),
  currentStep: WeeklyPollStepEnum,
  error: z.string().nullish(),
  logs: z.array(WeeklyPollLogSchema).default([]),
  progress: z.number().min(0).max(100).default(0),
  startedAt: z.string().nullish(),
  status: WeeklyPollStatusEnum,
});
export type WeeklyPollStatus = z.infer<typeof WeeklyPollStatusSchema>;
