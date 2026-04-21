import { type JobInsightResult } from '@cnv-monitor/shared';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchJobInsightForLaunch,
  fetchJobInsightResults,
  type JobInsightLaunchData,
  type JobInsightPollData,
  type JobInsightProgressEntry,
  triggerJobInsightAnalysis,
  triggerJobInsightRegenerate,
} from '../api/jobInsight';

const FIVE_SECONDS_MS = 5_000;

const extractProgressData = (pollData: JobInsightPollData | undefined) => {
  if (!pollData?.result) {
    return { progressLog: undefined, progressPhase: undefined };
  }
  return {
    progressLog: pollData.result.progress_log,
    progressPhase: pollData.result.progress_phase,
  };
};

const extractResult = (pollData: JobInsightPollData | undefined): JobInsightResult | null => {
  if (pollData?.status !== 'completed' || !pollData.result) {
    return null;
  }
  if (pollData.result.failures && pollData.result.job_id) {
    return pollData.result as unknown as JobInsightResult;
  }
  return null;
};

export const useJobInsight = (launchRpId: number) => {
  const queryClient = useQueryClient();

  const launchQuery = useQuery<JobInsightLaunchData>({
    queryFn: () => fetchJobInsightForLaunch(launchRpId),
    queryKey: ['job-insight', 'launch', launchRpId],
    staleTime: 30_000,
  });

  const jobId = launchQuery.data?.jobId;
  const isRunning = launchQuery.data?.status === 'queued' || launchQuery.data?.status === 'running';

  const pollQuery = useQuery<JobInsightPollData>({
    enabled: Boolean(jobId) && isRunning,
    queryFn: () => fetchJobInsightResults(jobId ?? ''),
    queryKey: ['job-insight', 'poll', jobId],
    refetchInterval: query => {
      const pollStatus = query.state.data?.status;
      if (pollStatus === 'completed' || pollStatus === 'failed') {
        return false;
      }
      return FIVE_SECONDS_MS;
    },
  });

  if (pollQuery.data?.status === 'completed' || pollQuery.data?.status === 'failed') {
    void queryClient.invalidateQueries({ queryKey: ['job-insight', 'launch', launchRpId] });
  }

  const analyzeMutation = useMutation({
    mutationFn: () => triggerJobInsightAnalysis(launchRpId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-insight', 'launch', launchRpId] });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => triggerJobInsightRegenerate(launchRpId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['job-insight', 'launch', launchRpId] });
    },
  });

  const status = pollQuery.data?.status ?? launchQuery.data?.status;
  const pollResult = extractResult(pollQuery.data);
  const result = pollResult ?? launchQuery.data?.result ?? null;
  const exists = launchQuery.data?.exists ?? false;
  const hasArtifactsUrl = launchQuery.data?.hasArtifactsUrl ?? false;

  const { progressLog, progressPhase } = extractProgressData(pollQuery.data);

  return {
    analysisStartedAt: pollQuery.data?.analysis_started_at,
    analyze: analyzeMutation,
    exists,
    hasArtifactsUrl,
    isLoading: launchQuery.isLoading,
    isPolling: isRunning && pollQuery.isFetching,
    progressLog,
    progressPhase,
    regenerate: regenerateMutation,
    result,
    status,
    triggeredBy: launchQuery.data?.triggeredBy,
  };
};

export type { JobInsightProgressEntry };
