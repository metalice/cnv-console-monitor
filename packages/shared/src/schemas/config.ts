import { z } from 'zod';

export const PublicConfigSchema = z.object({
  reportportalUrl: z.string(),
  reportportalProject: z.string(),
  launchFilter: z.string(),
  jiraEnabled: z.boolean(),
  jiraUrl: z.string().optional(),
  jiraProjectKey: z.string().optional(),
});

export type PublicConfig = z.infer<typeof PublicConfigSchema>;
