import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string(),
  id: z.string(),
  name: z.string(),
  role: z.string().default('user'),
});

export type User = z.infer<typeof UserSchema>;

export type ActivityFilterPreset = {
  name: string;
  filters: Record<string, string | undefined>;
  dateRange: string;
};

export type UserPreferences = {
  dashboardComponents?: string[];
  dashboardVersion?: string;
  dashboardView?: string;
  dateRange?: string;
  checklistComponent?: string;
  checklistVersions?: string[];
  theme?: 'light' | 'dark' | 'auto';
  sidebarCollapsed?: boolean;
  tableColumns?: Record<string, string[]>;
  activityPresets?: ActivityFilterPreset[];
  lastActivityViewedAt?: number;
};
