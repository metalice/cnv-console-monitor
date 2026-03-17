import { apiFetch, apiPost } from './client';

type PollResponse = { success: boolean; launches: number };

export const triggerPollNow = (lookbackDays?: number): Promise<PollResponse> =>
  apiPost(`/poll/now${lookbackDays ? `?lookbackDays=${lookbackDays}` : ''}`, {});

type BackfillResponse = { success: boolean; launches: number; lookbackDays: number };

export const triggerBackfill = (): Promise<BackfillResponse> =>
  apiPost('/poll/backfill', {});

export type EnrichmentStats = { total: number; success: number; mapped: number; failed: number; pending: number; noUrl: number; notFound: number; authRequired: number };

export type PollStatus = {
  active: boolean;
  phase: string;
  current: number;
  total: number;
  message: string;
  startedAt: number | null;
  lastPollAt: number | null;
  pollIntervalMinutes?: number;
  enrichment?: EnrichmentStats;
};

export const fetchPollStatus = (): Promise<PollStatus> =>
  apiFetch<PollStatus>('/poll/status');

export const cancelPoll = (): Promise<{ success: boolean }> =>
  apiPost('/poll/cancel', {});

export const retryFailedEnrichments = (): Promise<{ success: boolean; succeeded: number; failed: number }> =>
  apiPost('/poll/retry-failed', {});

export const triggerJenkinsEnrichment = (): Promise<{ success: boolean }> =>
  apiPost('/poll/enrich', {});
