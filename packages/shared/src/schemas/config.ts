import { z } from 'zod';

export const PublicConfigSchema = z.object({
  emailEnabled: z.boolean().optional(),
  jiraEnabled: z.boolean(),
  jiraProjectKey: z.string().optional(),
  jiraUrl: z.string().optional(),
  polarionUrl: z.string().optional(),
  reportportalProject: z.string(),
  reportportalUrl: z.string(),
  rpItemBaseUrl: z.string(),
  rpLaunchBaseUrl: z.string(),
  slackEnabled: z.boolean().optional(),
});

export type PublicConfig = z.infer<typeof PublicConfigSchema>;

export type SettingValue = {
  value: string;
  source: 'db' | 'env';
};

export type SystemInfo = {
  reportportalUrl: string;
  reportportalProject: string;
  authEnabled: boolean;
  emailEnabled: boolean;
  slackEnabled: boolean;
  jiraEnabled: boolean;
  uptime: number;
  lastPollAt: number | null;
};

export type SettingsResponse = {
  settings: Record<string, SettingValue>;
  system: SystemInfo;
};
