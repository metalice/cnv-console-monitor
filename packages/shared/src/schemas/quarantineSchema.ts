import { z } from 'zod';

export const QuarantineStatusEnum = z.enum(['proposed', 'active', 'overdue', 'expired', 'resolved']);
export type QuarantineStatus = z.infer<typeof QuarantineStatusEnum>;

export const QuarantineSchema = z.object({
  id: z.string().uuid(),
  testName: z.string(),
  testFilePath: z.string().nullish(),
  repoId: z.string().uuid().nullish(),
  component: z.string().nullish(),
  status: QuarantineStatusEnum,
  reason: z.string(),
  quarantinedBy: z.string(),
  quarantinedAt: z.string(),
  resolvedAt: z.string().nullish(),
  resolvedBy: z.string().nullish(),
  slaDays: z.number(),
  slaDeadline: z.string(),
  jiraKey: z.string().nullish(),
  rpDefectUpdated: z.boolean(),
  skipPrUrl: z.string().nullish(),
  skipPrStatus: z.enum(['pending', 'merged', 'closed']).nullish(),
  revertPrUrl: z.string().nullish(),
  aiSuggested: z.boolean(),
  aiFixDetectedAt: z.string().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type QuarantineRecord = z.infer<typeof QuarantineSchema>;

export const CreateQuarantineSchema = z.object({
  testName: z.string().min(1),
  testFilePath: z.string().optional(),
  repoId: z.string().uuid().optional(),
  component: z.string().optional(),
  reason: z.string().min(1),
  slaDays: z.number().min(1).max(90).optional(),
  createJira: z.boolean().optional(),
  updateRpDefect: z.boolean().optional(),
  createSkipPr: z.boolean().optional(),
});

export type CreateQuarantine = z.infer<typeof CreateQuarantineSchema>;

export const ResolveQuarantineSchema = z.object({
  fixDescription: z.string().min(1),
  fixCommitUrl: z.string().optional(),
  verificationRunUrl: z.string().optional(),
  lessonsLearned: z.string().optional(),
});

export type ResolveQuarantine = z.infer<typeof ResolveQuarantineSchema>;

export const QuarantineStatsSchema = z.object({
  active: z.number(),
  proposed: z.number(),
  overdue: z.number(),
  expired: z.number(),
  resolvedLast30d: z.number(),
  avgDurationDays: z.number(),
});

export type QuarantineStats = z.infer<typeof QuarantineStatsSchema>;
