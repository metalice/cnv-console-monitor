import { z } from 'zod';

import { HealthStatusEnum, LauncherRowSchema, LaunchGroupSchema, LaunchSchema } from './launch';
import { TestItemSchema } from './testItem';

export const DailyReportSchema = z.object({
  components: z.array(z.string()).optional(),
  date: z.string(),
  failedLaunches: z.number(),
  groups: z.array(LaunchGroupSchema),
  inProgressLaunches: z.number(),
  launchers: z.array(LauncherRowSchema).optional(),
  newFailures: z.union([z.array(TestItemSchema), z.number()]),
  overallHealth: HealthStatusEnum,
  passedLaunches: z.number(),
  recurringFailures: z.union([z.array(TestItemSchema), z.number()]),
  totalLaunches: z.number(),
  untriagedCount: z.number(),
});

export type DailyReport = z.infer<typeof DailyReportSchema>;

export const LaunchSummarySchema = z.object({
  failed: z.number(),
  inProgress: z.number(),
  passed: z.number(),
  total: z.number(),
});

export type LaunchSummary = z.infer<typeof LaunchSummarySchema>;

export const LaunchesResponseSchema = z.object({
  groups: z.array(LaunchGroupSchema),
  launches: z.array(LaunchSchema),
  summary: LaunchSummarySchema,
});

export type LaunchesResponse = z.infer<typeof LaunchesResponseSchema>;
