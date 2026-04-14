import { useCallback, useEffect, useRef, useState } from 'react';

import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import { useQueryClient } from '@tanstack/react-query';

import { fetchWeeklyPollStatus, triggerWeeklyPoll } from '../api/weeklyPoll';
import { useComponentFilter } from '../context/ComponentFilterContext';

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

export const useWeeklyPollStatus = () => {
  const [status, setStatus] = useState(INITIAL_STATE);
  const [isStarting, setIsStarting] = useState(false);
  const queryClient = useQueryClient();
  const { selectedComponent } = useComponentFilter();
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
      const updated = await fetchWeeklyPollStatus();
      setStatus(updated);

      if (updated.status === 'completed' || updated.status === 'failed') {
        stopPolling();
        await queryClient.invalidateQueries({ queryKey: ['weeklyReports'] });
        await queryClient.invalidateQueries({ queryKey: ['weeklyTeam'] });
        return;
      }
    } catch {
      // continue polling on transient errors
    }

    timerRef.current = setTimeout(() => {
      pollOnce().catch(() => undefined);
    }, POLL_INTERVAL_MS);
  }, [queryClient, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    activeRef.current = true;
    timerRef.current = setTimeout(() => {
      pollOnce().catch(() => undefined);
    }, POLL_INTERVAL_MS);
  }, [pollOnce, stopPolling]);

  useEffect(() => {
    fetchWeeklyPollStatus()
      .then(initial => {
        setStatus(initial);
        if (initial.status === 'running') {
          startPolling();
        }
        return undefined;
      })
      .catch(() => undefined);

    return stopPolling;
  }, [startPolling, stopPolling]);

  const trigger = useCallback(async () => {
    setIsStarting(true);
    try {
      await triggerWeeklyPoll(selectedComponent);
      const updated = await fetchWeeklyPollStatus();
      setStatus(updated);
      startPolling();
    } finally {
      setIsStarting(false);
    }
  }, [selectedComponent, startPolling]);

  return { isStarting, status, trigger };
};
