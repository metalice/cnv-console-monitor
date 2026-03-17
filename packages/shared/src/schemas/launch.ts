import { z } from 'zod';
import { TestItemSchema, EnrichedTestItemSchema } from './testItem';

export const LaunchStatusEnum = z.enum([
  'PASSED',
  'FAILED',
  'IN_PROGRESS',
  'STOPPED',
  'INTERRUPTED',
]);

export type LaunchStatus = z.infer<typeof LaunchStatusEnum>;

export const LaunchSchema = z.object({
  rp_id: z.number(),
  uuid: z.string(),
  name: z.string(),
  number: z.number(),
  status: z.string(),
  cnv_version: z.string().nullish(),
  bundle: z.string().nullish(),
  ocp_version: z.string().nullish(),
  tier: z.string().nullish(),
  cluster_name: z.string().nullish(),
  total: z.number(),
  passed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  start_time: z.number(),
  end_time: z.number().nullish(),
  duration: z.number().nullish(),
  artifacts_url: z.string().nullish(),
  component: z.string().nullish(),
});

export type Launch = z.infer<typeof LaunchSchema>;

export const HealthStatusEnum = z.enum(['green', 'yellow', 'red']);
export type HealthStatus = z.infer<typeof HealthStatusEnum>;

export const LaunchGroupSchema = z.object({
  cnvVersion: z.string(),
  tier: z.string(),
  launches: z.array(LaunchSchema).optional(),
  latestLaunch: LaunchSchema,
  health: HealthStatusEnum,
  totalTests: z.number(),
  passedTests: z.number(),
  failedTests: z.number(),
  skippedTests: z.number(),
  passRate: z.number(),
  failedItems: z.array(TestItemSchema).optional(),
  enrichedFailedItems: z.array(EnrichedTestItemSchema).optional(),
  component: z.string().optional(),
  lastPassedTime: z.number().nullish(),
  launchCount: z.number().optional(),
  failedItemCount: z.number().optional(),
});

export type LaunchGroup = z.infer<typeof LaunchGroupSchema>;

export const LauncherRowSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  component: z.string().nullish(),
  version: z.string(),
  tier: z.string(),
  totalRuns: z.number(),
  passed: z.number(),
  failed: z.number(),
  inProgress: z.number(),
  passRate: z.number(),
  latestLaunch: LaunchSchema,
});

export type LauncherRow = z.infer<typeof LauncherRowSchema>;
