import { z } from 'zod';

export const TestItemSchema = z.object({
  ai_confidence: z.number().nullish(),
  ai_prediction: z.string().nullish(),
  defect_comment: z.string().nullish(),
  defect_type: z.string().nullish(),
  end_time: z.number().nullish(),
  error_message: z.string().nullish(),
  jira_key: z.string().nullish(),
  jira_status: z.string().nullish(),
  launch_rp_id: z.number(),
  name: z.string(),
  polarion_id: z.string().nullish(),
  rp_id: z.number(),
  start_time: z.number().nullish(),
  status: z.string(),
  unique_id: z.string().nullish(),
});

export type TestItem = z.infer<typeof TestItemSchema>;

export const EnrichedTestItemSchema = TestItemSchema.extend({
  consecutiveFailures: z.number(),
  lastPassDate: z.string().nullable(),
  lastPassTime: z.number().nullable(),
  recentStatuses: z.array(z.string()),
  totalRuns: z.number(),
});

export type EnrichedTestItem = z.infer<typeof EnrichedTestItemSchema>;

export const LogEntrySchema = z.object({
  binaryContent: z.object({ contentType: z.string(), id: z.string() }).nullish(),
  id: z.number(),
  level: z.string(),
  message: z.string(),
  time: z.number(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;
