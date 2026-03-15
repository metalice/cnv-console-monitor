import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string().default('user'),
});

export type User = z.infer<typeof UserSchema>;

export type UserPreferences = {
  dashboardComponents?: string[];
  dashboardVersion?: string;
  dateRange?: string;
  checklistComponent?: string;
  checklistVersions?: string[];
  theme?: 'light' | 'dark' | 'auto';
  sidebarCollapsed?: boolean;
  tableColumns?: Record<string, string[]>;
};
