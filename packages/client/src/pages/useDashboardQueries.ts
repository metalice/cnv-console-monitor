import { type PublicConfig } from '@cnv-monitor/shared';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchPollStatus } from '../api/poll';
import { fetchReleases } from '../api/releases';
import { useDate } from '../context/DateContext';

import { computePriorRange } from './dashboardHelpers';

const TEN_MINUTES_MS = 10 * 60 * 1000;
const THIRTY_SECONDS_MS = 30_000;

export const useDashboardQueries = () => {
  const { displayLabel, lookbackMode, since, until } = useDate();

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });

  const {
    data: report,
    error: reportError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery({
    queryFn: () => fetchReportForRange(since, until),
    queryKey: ['report', lookbackMode, since, until],
  });

  const { data: releases } = useQuery({
    queryFn: fetchReleases,
    queryKey: ['releases'],
    staleTime: TEN_MINUTES_MS,
  });

  const { priorSince, priorUntil } = computePriorRange(since, until);
  const { data: priorReport } = useQuery({
    enabled: Boolean(report),
    queryFn: () => fetchReportForRange(priorSince, priorUntil),
    queryKey: ['report-prior', priorSince, priorUntil],
    staleTime: TEN_MINUTES_MS,
  });

  const { data: pollStatus } = useQuery({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    staleTime: THIRTY_SECONDS_MS,
  });

  return {
    config,
    displayLabel,
    isFetching,
    isLoading,
    pollStatus,
    priorReport,
    refetch,
    releases,
    report,
    reportError,
  };
};
