import { z } from 'zod';

export const TestItemSchema = z.object({
  rp_id: z.number(),
  launch_rp_id: z.number(),
  name: z.string(),
  status: z.string(),
  polarion_id: z.string().nullish(),
  defect_type: z.string().nullish(),
  defect_comment: z.string().nullish(),
  ai_prediction: z.string().nullish(),
  ai_confidence: z.number().nullish(),
  error_message: z.string().nullish(),
  jira_key: z.string().nullish(),
  jira_status: z.string().nullish(),
  unique_id: z.string().nullish(),
  start_time: z.number().nullish(),
  end_time: z.number().nullish(),
});

export type TestItem = z.infer<typeof TestItemSchema>;

export const EnrichedTestItemSchema = TestItemSchema.extend({
  consecutiveFailures: z.number(),
  totalRuns: z.number(),
  lastPassDate: z.string().nullable(),
  lastPassTime: z.number().nullable(),
  recentStatuses: z.array(z.string()),
});

export type EnrichedTestItem = z.infer<typeof EnrichedTestItemSchema>;

export const LogEntrySchema = z.object({
  id: z.number(),
  message: z.string(),
  level: z.string(),
  time: z.number(),
  binaryContent: z
    .object({ id: z.string(), contentType: z.string() })
    .nullish(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;
