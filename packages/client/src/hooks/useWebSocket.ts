import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { PollStatus } from '../api/poll';

const RECONNECT_INTERVAL_MS = 3000;
const SHOW_DISCONNECTED_AFTER_MS = 5000;

export type WebSocketStatus = 'connected' | 'disconnected' | 'connecting';

export type ProgressInfo = { phase: string; current: number; total: number; message: string; startedAt?: number | null };

type ProgressListener = (progress: ProgressInfo) => void;
const pollListeners = new Set<ProgressListener>();
const jenkinsListeners = new Set<ProgressListener>();

export const usePollProgress = (): PollStatus | null => {
  const [progress, setProgress] = useState<PollStatus | null>(null);

  useEffect(() => {
    const handler: ProgressListener = (info) =>
      setProgress({ active: info.phase !== 'complete' && info.phase !== 'cancelled', ...info, startedAt: info.startedAt ?? null, lastPollAt: null });
    pollListeners.add(handler);
    return () => { pollListeners.delete(handler); };
  }, []);

  return progress;
};

export const useJenkinsProgress = (): ProgressInfo | null => {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  useEffect(() => {
    jenkinsListeners.add(setProgress);
    return () => { jenkinsListeners.delete(setProgress); };
  }, []);

  return progress;
};

export const useWebSocket = (): WebSocketStatus => {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const disconnectedSince = useRef<number | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === 'data-updated') {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey[0] as string;
            return key !== 'config' && key !== 'systemHealth' && key !== 'rpProjects';
          },
        });
      }
      if (data.event === 'poll-progress') {
        const info: ProgressInfo = { phase: data.phase, current: data.current, total: data.total, message: data.message, startedAt: data.startedAt };
        for (const listener of pollListeners) listener(info);
      }
      if (data.event === 'jenkins-progress') {
        const info: ProgressInfo = { phase: data.phase, current: data.current, total: data.total, message: data.message };
        for (const listener of jenkinsListeners) listener(info);
      }
    } catch {
      // ignore malformed messages
    }
  }, [queryClient]);

  useEffect(() => {
    const connect = (): void => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => { disconnectedSince.current = null; setStatus('connected'); };
      socket.onmessage = handleMessage;
      socket.onclose = () => {
        wsRef.current = null;
        if (!disconnectedSince.current) disconnectedSince.current = Date.now();
        setTimeout(() => {
          if (disconnectedSince.current && Date.now() - disconnectedSince.current >= SHOW_DISCONNECTED_AFTER_MS) setStatus('disconnected');
        }, SHOW_DISCONNECTED_AFTER_MS);
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
      };
      socket.onerror = () => { socket.close(); };
    };

    connect();
    return () => { clearTimeout(reconnectTimer.current); wsRef.current?.close(); };
  }, [queryClient, handleMessage]);

  return status;
};
