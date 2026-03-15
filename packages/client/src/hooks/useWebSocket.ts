import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const RECONNECT_INTERVAL_MS = 3000;
const SHOW_DISCONNECTED_AFTER_MS = 5000;

export type WebSocketStatus = 'connected' | 'disconnected' | 'connecting';

export function useWebSocket(): WebSocketStatus {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const disconnectedSince = useRef<number | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('connecting');

  useEffect(() => {
    function connect(): void {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        disconnectedSince.current = null;
        setStatus('connected');
      };

      ws.onmessage = (event) => {
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
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!disconnectedSince.current) {
          disconnectedSince.current = Date.now();
        }
        setTimeout(() => {
          if (disconnectedSince.current && Date.now() - disconnectedSince.current >= SHOW_DISCONNECTED_AFTER_MS) {
            setStatus('disconnected');
          }
        }, SHOW_DISCONNECTED_AFTER_MS);
        reconnectTimer.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [queryClient]);

  return status;
}
