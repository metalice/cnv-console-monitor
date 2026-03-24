import { z } from 'zod';

import { EnrichedTestItemSchema, TestItemSchema } from './testItem';

export const LaunchStatusEnum = z.enum([
  'PASSED',
  'FAILED',
  'IN_PROGRESS',
  'STOPPED',
  'INTERRUPTED',
]);

export type LaunchStatus = z.infer<typeof LaunchStatusEnum>;

export const LaunchSchema = z.object({
  artifacts_url: z.string().nullish(),
  bundle: z.string().nullish(),
  cluster_name: z.string().nullish(),
  cnv_version: z.string().nullish(),
  component: z.string().nullish(),
  duration: z.number().nullish(),
  end_time: z.number().nullish(),
  failed: z.number(),
  name: z.string(),
  number: z.number(),
  ocp_version: z.string().nullish(),
  passed: z.number(),
  rp_id: z.number(),
  skipped: z.number(),
  start_time: z.number(),
  status: z.string(),
  tier: z.string().nullish(),
  total: z.number(),
  uuid: z.string(),
});

export type Launch = z.infer<typeof LaunchSchema>;

export const HealthStatusEnum = z.enum(['green', 'yellow', 'red']);
export type HealthStatus = z.infer<typeof HealthStatusEnum>;

export const LaunchGroupSchema = z.object({
  cnvVersion: z.string(),
  component: z.string().optional(),
  enrichedFailedItems: z.array(EnrichedTestItemSchema).optional(),
  failedItemCount: z.number().optional(),
  failedItems: z.array(TestItemSchema).optional(),
  failedTests: z.number(),
  health: HealthStatusEnum,
  lastPassedTime: z.number().nullish(),
  latestLaunch: LaunchSchema,
  launchCount: z.number().optional(),
  launches: z.array(LaunchSchema).optional(),
  passedTests: z.number(),
  passRate: z.number(),
  skippedTests: z.number(),
  tier: z.string(),
  totalTests: z.number(),
});

export type LaunchGroup = z.infer<typeof LaunchGroupSchema>;

export const LauncherRowSchema = z.object({
  component: z.string().nullish(),
  description: z.string().nullish(),
  failed: z.number(),
  inProgress: z.number(),
  latestLaunch: LaunchSchema,
  name: z.string(),
  passed: z.number(),
  passRate: z.number(),
  tier: z.string(),
  totalRuns: z.number(),
  version: z.string(),
});

export type LauncherRow = z.infer<typeof LauncherRowSchema>;
