import { useCallback, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import type { PollStatusLegacy } from '../api/poll';

const RECONNECT_INTERVAL_MS = 3000;
const SHOW_DISCONNECTED_AFTER_MS = 5000;

export type WebSocketStatus = 'connected' | 'disconnected' | 'connecting';

type ProgressInfo = {
  phase: string;
  current: number;
  total: number;
  message: string;
  startedAt?: number | null;
};

type ProgressListener = (progress: ProgressInfo) => void;
const pollListeners = new Set<ProgressListener>();
const jenkinsListeners = new Set<ProgressListener>();

type SyncProgressInfo = {
  active: boolean;
  phase: string;
  repoName: string;
  current: number;
  total: number;
  message: string;
  log: string[];
};

type WsDataUpdated = { event: 'data-updated' };
type WsPollProgress = {
  event: 'poll-progress';
  current: number;
  message: string;
  phase: string;
  startedAt?: number | null;
  total: number;
};
type WsSyncProgress = {
  event: 'sync-progress';
  current?: number;
  message?: string;
  phase: string;
  repoName?: string;
  total?: number;
};
type WsJenkinsProgress = {
  event: 'jenkins-progress';
  current: number;
  message: string;
  phase: string;
  total: number;
};
type WsPipelineState = {
  [key: string]: unknown;
  event: 'pipeline-state';
};
type WsMessage =
  | WsDataUpdated
  | WsJenkinsProgress
  | WsPipelineState
  | WsPollProgress
  | WsSyncProgress;

type SyncListener = (info: SyncProgressInfo) => void;
const syncListeners = new Set<SyncListener>();
let syncState: SyncProgressInfo = {
  active: false,
  current: 0,
  log: [],
  message: '',
  phase: '',
  repoName: '',
  total: 0,
};

export const usePollProgress = (): PollStatusLegacy | null => {
  const [progress, setProgress] = useState<PollStatusLegacy | null>(null);

  useEffect(() => {
    const handler: ProgressListener = info =>
      setProgress({
        active: info.phase !== 'complete' && info.phase !== 'cancelled',
        ...info,
        lastPollAt: null,
        startedAt: info.startedAt ?? null,
      });
    pollListeners.add(handler);
    return () => {
      pollListeners.delete(handler);
    };
  }, []);

  return progress;
};

export const useJenkinsProgress = (): ProgressInfo | null => {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  useEffect(() => {
    jenkinsListeners.add(setProgress);
    return () => {
      jenkinsListeners.delete(setProgress);
    };
  }, []);

  return progress;
};

export const useSyncProgress = (): SyncProgressInfo => {
  const [progress, setProgress] = useState(syncState);

  useEffect(() => {
    const handler: SyncListener = info => setProgress({ ...info });
    syncListeners.add(handler);
    return () => {
      syncListeners.delete(handler);
    };
  }, []);

  return progress;
};

export const useWebSocket = (): WebSocketStatus => {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const disconnectedSince = useRef<number | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as WsMessage;
        if (data.event === 'data-updated') {
          void queryClient.invalidateQueries({
            predicate: query => {
              const key = query.queryKey[0] as string;
              return key !== 'config' && key !== 'systemHealth' && key !== 'rpProjects';
            },
          });
        }
        if (data.event === 'poll-progress') {
          const info: ProgressInfo = {
            current: data.current,
            message: data.message,
            phase: data.phase,
            startedAt: data.startedAt,
            total: data.total,
          };
          for (const listener of pollListeners) {
            listener(info);
          }
        }
        if (data.event === 'sync-progress') {
          const isActive = data.phase !== 'complete' && data.phase !== 'error';
          const logEntry = data.message ?? '';
          const lastLog = syncState.log[syncState.log.length - 1];
          const newLog =
            logEntry && logEntry !== lastLog
              ? [...syncState.log.slice(-49), logEntry]
              : syncState.log;

          syncState = {
            active: isActive,
            current: data.current ?? 0,
            log: newLog,
            message: logEntry,
            phase: data.phase,
            repoName: data.repoName ?? syncState.repoName,
            total: data.total ?? 0,
          };
          for (const listener of syncListeners) {
            listener(syncState);
          }
        }
        if (data.event === 'jenkins-progress') {
          const info: ProgressInfo = {
            current: data.current,
            message: data.message,
            phase: data.phase,
            total: data.total,
          };
          for (const listener of jenkinsListeners) {
            listener(info);
          }
        }
        if (data.event === 'pipeline-state') {
          queryClient.setQueryData(['pollStatus'], (old: unknown) => {
            if (old && typeof old === 'object') {
              return { ...(old as Record<string, unknown>), pipeline: data };
            }
            return { pipeline: data };
          });
        }
      } catch {
        // Ignore malformed messages
      }
    },
    [queryClient],
  );

  useEffect(() => {
    const connect = (): void => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        disconnectedSince.current = null;
        setStatus('connected');
      };
      socket.onmessage = handleMessage;
      socket.onclose = () => {
        wsRef.current = null;
        if (!disconnectedSince.current) {
          disconnectedSince.current = Date.now();
        }
        setTimeout(() => {
          if (
            disconnectedSince.current &&
            Date.now() - disconnectedSince.current >= SHOW_DISCONNECTED_AFTER_MS
          ) {
            setStatus('disconnected');
          }
        }, SHOW_DISCONNECTED_AFTER_MS);
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
      };
      socket.onerror = () => {
        socket.close();
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [queryClient, handleMessage]);

  return status;
};
