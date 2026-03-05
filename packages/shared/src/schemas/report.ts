import { z } from 'zod';
import { LaunchSchema, LaunchGroupSchema, HealthStatusEnum } from './launch';
import { TestItemSchema } from './testItem';

export const DailyReportSchema = z.object({
  date: z.string(),
  groups: z.array(LaunchGroupSchema),
  overallHealth: HealthStatusEnum,
  totalLaunches: z.number(),
  passedLaunches: z.number(),
  failedLaunches: z.number(),
  inProgressLaunches: z.number(),
  untriagedCount: z.number(),
  newFailures: z.array(TestItemSchema),
  recurringFailures: z.array(TestItemSchema),
});

export type DailyReport = z.infer<typeof DailyReportSchema>;

export const LaunchSummarySchema = z.object({
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  inProgress: z.number(),
});

export type LaunchSummary = z.infer<typeof LaunchSummarySchema>;

export const LaunchesResponseSchema = z.object({
  launches: z.array(LaunchSchema),
  groups: z.array(LaunchGroupSchema),
  summary: LaunchSummarySchema,
});

export type LaunchesResponse = z.infer<typeof LaunchesResponseSchema>;
