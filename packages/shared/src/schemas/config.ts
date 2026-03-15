import { z } from 'zod';

export const PublicConfigSchema = z.object({
  reportportalUrl: z.string(),
  reportportalProject: z.string(),
  jiraEnabled: z.boolean(),
  jiraUrl: z.string().optional(),
  jiraProjectKey: z.string().optional(),
  polarionUrl: z.string().optional(),
  rpLaunchBaseUrl: z.string(),
  rpItemBaseUrl: z.string(),
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
