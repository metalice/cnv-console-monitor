import { z } from 'zod';

export const ReportRepoProviderEnum = z.enum(['github', 'gitlab']);
export type ReportRepoProvider = z.infer<typeof ReportRepoProviderEnum>;

export const ReportRepoSchema = z.object({
  component: z.string(),
  createdAt: z.string().nullish(),
  enabled: z.boolean().default(true),
  id: z.string(),
  name: z.string(),
  provider: ReportRepoProviderEnum,
  updatedAt: z.string().nullish(),
  url: z.string(),
});

export type ReportRepo = z.infer<typeof ReportRepoSchema>;

export const CreateReportRepoSchema = z.object({
  component: z.string().min(1),
  enabled: z.boolean().optional(),
  name: z.string().min(1),
  url: z.string().min(1),
});

export type CreateReportRepo = z.infer<typeof CreateReportRepoSchema>;

export const UpdateReportRepoSchema = CreateReportRepoSchema.partial();
export type UpdateReportRepo = z.infer<typeof UpdateReportRepoSchema>;

export const detectProvider = (url: string): ReportRepoProvider =>
  url.includes('github.com') ? 'github' : 'gitlab';
