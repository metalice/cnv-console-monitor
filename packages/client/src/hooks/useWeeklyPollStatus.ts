import { useCallback, useEffect, useRef, useState } from 'react';

import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import { useQueryClient } from '@tanstack/react-query';

import { fetchWeeklyPollStatus, triggerWeeklyPoll } from '../api/weeklyPoll';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { useToast } from '../context/ToastContext';

const POLL_INTERVAL_MS = 2_000;

const INITIAL_STATE: WeeklyPollStatus = {
  completedAt: null,
  currentStep: 'idle',
  error: null,
  logs: [],
  progress: 0,
  startedAt: null,
  status: 'idle',
};

export const useWeeklyPollStatus = ({ silent = false } = {}) => {
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
      const updated = await fetchWeeklyPollStatus(selectedComponent);
      setStatus(updated);

      if (updated.status === 'completed') {
        stopPolling();
        if (!silent) addToast('success', 'Team report generated successfully');
        void queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
        void queryClient.invalidateQueries({ queryKey: ['weeklyTeam'] });
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
    fetchWeeklyPollStatus(selectedComponent)
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
        await triggerWeeklyPoll({
          component: selectedComponent,
          ...params,
        });
        const updated = await fetchWeeklyPollStatus(selectedComponent);
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
