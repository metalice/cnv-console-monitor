import { z } from 'zod';

export const VersionTabSchema = z.object({
  name: z.string(),
  sheetId: z.number().nullish(),
  version: z.string().nullish(),
});

export type VersionTab = z.infer<typeof VersionTabSchema>;

export const SpreadsheetRowSchema = z.object({
  assignee: z.string().nullish(),
  feature: z.string().nullish(),
  jiraKey: z.string().nullish(),
  notes: z.string().nullish(),
  status: z.string().nullish(),
  version: z.string().nullish(),
});

export type SpreadsheetRow = z.infer<typeof SpreadsheetRowSchema>;
