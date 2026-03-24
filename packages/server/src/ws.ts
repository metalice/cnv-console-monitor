import { type Server } from 'http';

import { WebSocket, WebSocketServer } from 'ws';

import { logger } from './logger';

const log = logger.child({ module: 'WebSocket' });

const HEARTBEAT_INTERVAL_MS = 30000;

let wss: WebSocketServer | undefined;
let heartbeatTimer: ReturnType<typeof setInterval>;

export const initWebSocket = (server: Server): void => {
  const socketServer = new WebSocketServer({ path: '/ws', server });
  wss = socketServer;

  socketServer.on('connection', ws => {
    (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    log.info({ clients: socketServer.clients.size }, 'Client connected');

    void (async () => {
      try {
        const { getPipelineManager } = await import('./pipeline');
        const state = getPipelineManager().getState();
        if (state.active) {
          ws.send(JSON.stringify({ event: 'pipeline-state', ...state }));
        }
      } catch {
        /* Pipeline not initialized yet */
      }
    })();

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    ws.on('close', () => {
      log.info({ clients: socketServer.clients.size }, 'Client disconnected');
    });
  });

  heartbeatTimer = setInterval(() => {
    for (const client of socketServer.clients) {
      const socket = client as WebSocket & { isAlive: boolean };
      if (!socket.isAlive) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  socketServer.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  log.info('WebSocket server initialized with heartbeat');
};

export const broadcast = (event: string, data?: Record<string, unknown>): void => {
  if (!wss) {
    return;
  }

  const message = JSON.stringify(data ? { event, ...data } : { event });
  let sent = 0;

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0 && event !== 'poll-progress') {
    log.debug({ clients: sent, event }, 'Broadcast sent');
  }
};
