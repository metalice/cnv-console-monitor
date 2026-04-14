import { z } from 'zod';

export const TeamMemberSchema = z.object({
  aiMapped: z.boolean().default(false),
  component: z.string().nullish(),
  createdAt: z.string().nullish(),
  displayName: z.string(),
  email: z.string().email().nullish(),
  githubUsername: z.string().nullish(),
  gitlabUsername: z.string().nullish(),
  id: z.string(),
  isActive: z.boolean().default(true),
  jiraAccountId: z.string().nullish(),
  mappingConfidence: z.number().min(0).max(1).nullish(),
  updatedAt: z.string().nullish(),
});

export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamMemberCreateSchema = TeamMemberSchema.omit({
  createdAt: true,
  id: true,
  updatedAt: true,
});

export type TeamMemberCreate = z.infer<typeof TeamMemberCreateSchema>;

export const TeamMemberUpdateSchema = TeamMemberCreateSchema.partial();

export type TeamMemberUpdate = z.infer<typeof TeamMemberUpdateSchema>;
