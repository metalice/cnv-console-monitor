import { useCallback, useEffect, useRef, useState } from 'react';

import { type ReportPollStatus } from '@cnv-monitor/shared';

import { useQueryClient } from '@tanstack/react-query';

import { fetchReportPollStatus, triggerReportPoll } from '../api/reportPoll';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { useToast } from '../context/ToastContext';

const POLL_INTERVAL_MS = 2_000;

const INITIAL_STATE: ReportPollStatus = {
  completedAt: null,
  currentStep: 'idle',
  error: null,
  logs: [],
  progress: 0,
  startedAt: null,
  status: 'idle',
};

export const useReportPollStatus = ({ silent = false } = {}) => {
  const [status, setStatus] = useState(INITIAL_STATE);
  const [isStarting, setIsStarting] = useState(false);
  const queryClient = useQueryClient();
  const { selectedComponent } = useComponentFilter();
  const { addToast } = useToast();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const stopPolling = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    if (!activeRef.current) return;

    try {
      const updated = await fetchReportPollStatus(selectedComponent);
      setStatus(updated);

      if (updated.status === 'completed') {
        stopPolling();
        if (!silent) addToast('success', 'Team report generated successfully');
        await queryClient.refetchQueries({ queryKey: ['reports'] });
        await queryClient.invalidateQueries({ queryKey: ['reportTeam'] });
        setStatus(INITIAL_STATE);
        return;
      }
      if (updated.status === 'failed') {
        stopPolling();
        if (!silent) addToast('danger', 'Report generation failed', updated.error ?? undefined);
        setStatus(INITIAL_STATE);
        return;
      }
    } catch {
      // continue polling on transient errors
    }

    timerRef.current = setTimeout(() => {
      pollOnce().catch(() => undefined);
    }, POLL_INTERVAL_MS);
  }, [addToast, queryClient, selectedComponent, silent, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    activeRef.current = true;
    timerRef.current = setTimeout(() => {
      pollOnce().catch(() => undefined);
    }, POLL_INTERVAL_MS);
  }, [pollOnce, stopPolling]);

  useEffect(() => {
    fetchReportPollStatus(selectedComponent)
      .then(initial => {
        setStatus(initial);
        if (initial.status === 'running') {
          startPolling();
        }
        return undefined;
      })
      .catch(() => undefined);

    return stopPolling;
  }, [selectedComponent, startPolling, stopPolling]);

  const trigger = useCallback(
    async (params?: { components?: string[]; since?: string; until?: string }) => {
      setIsStarting(true);
      try {
        await triggerReportPoll({
          component: selectedComponent,
          ...params,
        });
        const updated = await fetchReportPollStatus(selectedComponent);
        setStatus(updated);
        startPolling();
      } finally {
        setIsStarting(false);
      }
    },
    [selectedComponent, startPolling],
  );

  return { isStarting, status, trigger };
};
