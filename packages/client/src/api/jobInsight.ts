import { type JobInsightResult } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

type AnalyzeResponse = {
  jobId: string;
  status: string;
  resultUrl: string;
};

export type JobInsightLaunchData = {
  exists: boolean;
  hasArtifactsUrl?: boolean;
  jobId?: string;
  status?: string;
  result?: JobInsightResult | null;
  triggeredBy?: string;
  createdAt?: string;
  completedAt?: string | null;
};

export type JobInsightProgressEntry = {
  phase: string;
  timestamp: number;
};

export type JobInsightPollData = {
  job_id: string;
  jenkins_url?: string;
  status: string;
  result?: {
    progress_phase?: string;
    progress_log?: JobInsightProgressEntry[];
  } & Partial<JobInsightResult>;
  created_at?: string;
  completed_at?: string | null;
  analysis_started_at?: string;
};

export const triggerJobInsightAnalysis = (launchRpId: number): Promise<AnalyzeResponse> =>
  apiPost('/job-insight/analyze', { launchRpId });

export const triggerJobInsightRegenerate = (launchRpId: number): Promise<AnalyzeResponse> =>
  apiPost('/job-insight/regenerate', { launchRpId });

export const fetchJobInsightResults = (jobId: string): Promise<JobInsightPollData> =>
  apiFetch(`/job-insight/results/${jobId}`);

export const fetchJobInsightForLaunch = (launchRpId: number): Promise<JobInsightLaunchData> =>
  apiFetch(`/job-insight/launch/${launchRpId}`);
