import { z } from 'zod';

export const JobInsightCodeFixSchema = z.object({
  change: z.string(),
  file: z.string(),
  line: z.string(),
});

export type JobInsightCodeFix = z.infer<typeof JobInsightCodeFixSchema>;

export const JobInsightAnalysisSchema = z.object({
  affected_tests: z.array(z.string()),
  artifacts_evidence: z.string().optional(),
  classification: z.string(),
  code_fix: JobInsightCodeFixSchema.nullish(),
  details: z.string(),
});

export type JobInsightAnalysis = z.infer<typeof JobInsightAnalysisSchema>;

export const JobInsightPeerRoundSchema = z.object({
  agrees_with_orchestrator: z.boolean().optional(),
  ai_model: z.string(),
  ai_provider: z.string(),
  classification: z.string(),
  details: z.string(),
  role: z.string(),
  round: z.number(),
});

export type JobInsightPeerRound = z.infer<typeof JobInsightPeerRoundSchema>;

export const JobInsightPeerDebateSchema = z.object({
  ai_configs: z.array(z.object({ ai_model: z.string(), ai_provider: z.string() })),
  consensus_reached: z.boolean(),
  max_rounds: z.number(),
  rounds: z.array(JobInsightPeerRoundSchema),
  rounds_used: z.number(),
});

export type JobInsightPeerDebate = z.infer<typeof JobInsightPeerDebateSchema>;

export const JobInsightFailureSchema = z.object({
  analysis: JobInsightAnalysisSchema,
  error: z.string(),
  error_signature: z.string(),
  peer_debate: JobInsightPeerDebateSchema.nullish(),
  test_name: z.string(),
});

export type JobInsightFailure = z.infer<typeof JobInsightFailureSchema>;

export const JobInsightResultSchema = z.object({
  ai_model: z.string(),
  ai_provider: z.string(),
  build_number: z.number(),
  child_job_analyses: z.array(z.unknown()).optional(),
  failures: z.array(JobInsightFailureSchema),
  jenkins_url: z.string(),
  job_id: z.string(),
  job_name: z.string(),
  status: z.string(),
  summary: z.string(),
});

export type JobInsightResult = z.infer<typeof JobInsightResultSchema>;

export const JobInsightProgressEntrySchema = z.object({
  phase: z.string(),
  timestamp: z.number(),
});

export const JobInsightStatusSchema = z.object({
  capabilities: z.record(z.unknown()).optional(),
  completed_at: z.string().nullish(),
  created_at: z.string(),
  job_id: z.string(),
  result: z
    .union([
      JobInsightResultSchema,
      z.object({
        progress_log: z.array(JobInsightProgressEntrySchema).optional(),
        progress_phase: z.string().optional(),
      }),
    ])
    .nullish(),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
});

export type JobInsightStatus = z.infer<typeof JobInsightStatusSchema>;

export const JobInsightStoredSchema = z.object({
  ai_model: z.string(),
  ai_provider: z.string(),
  build_number: z.number(),
  completed_at: z.string().nullish(),
  created_at: z.string(),
  id: z.number(),
  job_id: z.string(),
  job_name: z.string(),
  launch_rp_id: z.number(),
  result: JobInsightResultSchema.nullish(),
  status: z.string(),
  triggered_by: z.string(),
});

export type JobInsightStored = z.infer<typeof JobInsightStoredSchema>;
