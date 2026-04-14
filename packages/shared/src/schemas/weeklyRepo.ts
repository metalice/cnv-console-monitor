import { z } from 'zod';

export const WeeklyRepoProviderEnum = z.enum(['github', 'gitlab']);
export type WeeklyRepoProvider = z.infer<typeof WeeklyRepoProviderEnum>;

export const WeeklyRepoSchema = z.object({
  component: z.string(),
  createdAt: z.string().nullish(),
  enabled: z.boolean().default(true),
  id: z.string(),
  name: z.string(),
  provider: WeeklyRepoProviderEnum,
  updatedAt: z.string().nullish(),
  url: z.string(),
});

export type WeeklyRepo = z.infer<typeof WeeklyRepoSchema>;

export const CreateWeeklyRepoSchema = z.object({
  component: z.string().min(1),
  enabled: z.boolean().optional(),
  name: z.string().min(1),
  url: z.string().min(1),
});

export type CreateWeeklyRepo = z.infer<typeof CreateWeeklyRepoSchema>;

export const UpdateWeeklyRepoSchema = CreateWeeklyRepoSchema.partial();
export type UpdateWeeklyRepo = z.infer<typeof UpdateWeeklyRepoSchema>;

export const detectProvider = (url: string): WeeklyRepoProvider =>
  url.includes('github.com') ? 'github' : 'gitlab';
