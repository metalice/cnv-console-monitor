import { z } from 'zod';

export const QuarantineStatusEnum = z.enum([
  'proposed',
  'active',
  'overdue',
  'expired',
  'resolved',
]);
export type QuarantineStatus = z.infer<typeof QuarantineStatusEnum>;

export const QuarantineSchema = z.object({
  aiFixDetectedAt: z.string().nullish(),
  aiSuggested: z.boolean(),
  component: z.string().nullish(),
  createdAt: z.string().optional(),
  id: z.string().uuid(),
  jiraKey: z.string().nullish(),
  quarantinedAt: z.string(),
  quarantinedBy: z.string(),
  reason: z.string(),
  repoId: z.string().uuid().nullish(),
  resolvedAt: z.string().nullish(),
  resolvedBy: z.string().nullish(),
  revertPrUrl: z.string().nullish(),
  rpDefectUpdated: z.boolean(),
  skipPrStatus: z.enum(['pending', 'merged', 'closed']).nullish(),
  skipPrUrl: z.string().nullish(),
  slaDays: z.number(),
  slaDeadline: z.string(),
  status: QuarantineStatusEnum,
  testFilePath: z.string().nullish(),
  testName: z.string(),
  updatedAt: z.string().optional(),
});

export type QuarantineRecord = z.infer<typeof QuarantineSchema>;

export const CreateQuarantineSchema = z.object({
  component: z.string().optional(),
  createJira: z.boolean().optional(),
  createSkipPr: z.boolean().optional(),
  reason: z.string().min(1),
  repoId: z.string().uuid().optional(),
  slaDays: z.number().min(1).max(90).optional(),
  testFilePath: z.string().optional(),
  testName: z.string().min(1),
  updateRpDefect: z.boolean().optional(),
});

export type CreateQuarantine = z.infer<typeof CreateQuarantineSchema>;

export const ResolveQuarantineSchema = z.object({
  fixCommitUrl: z.string().optional(),
  fixDescription: z.string().min(1),
  lessonsLearned: z.string().optional(),
  verificationRunUrl: z.string().optional(),
});

export type ResolveQuarantine = z.infer<typeof ResolveQuarantineSchema>;

export const QuarantineStatsSchema = z.object({
  active: z.number(),
  avgDurationDays: z.number(),
  expired: z.number(),
  overdue: z.number(),
  proposed: z.number(),
  resolvedLast30d: z.number(),
});

export type QuarantineStats = z.infer<typeof QuarantineStatsSchema>;
