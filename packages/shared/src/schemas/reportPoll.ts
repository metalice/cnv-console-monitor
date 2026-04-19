import { z } from 'zod';

export const ReportPollStepEnum = z.enum([
  'idle',
  'github',
  'gitlab',
  'jira',
  'sheets',
  'ai-mapping',
  'ai-summary',
  'saving',
]);
export type ReportPollStep = z.infer<typeof ReportPollStepEnum>;

export const ReportPollStatusEnum = z.enum(['idle', 'running', 'completed', 'failed']);
export type ReportPollStatusValue = z.infer<typeof ReportPollStatusEnum>;

export const ReportPollLogSchema = z.object({
  message: z.string(),
  step: ReportPollStepEnum,
  timestamp: z.string(),
});
export type ReportPollLog = z.infer<typeof ReportPollLogSchema>;

export const ReportPollStatusSchema = z.object({
  completedAt: z.string().nullish(),
  currentStep: ReportPollStepEnum,
  error: z.string().nullish(),
  logs: z.array(ReportPollLogSchema).default([]),
  progress: z.number().min(0).max(100).default(0),
  startedAt: z.string().nullish(),
  status: ReportPollStatusEnum,
});
export type ReportPollStatus = z.infer<typeof ReportPollStatusSchema>;
