import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

const log = logger.child({ module: 'WebSocket' });

const HEARTBEAT_INTERVAL_MS = 30000;

let wss: WebSocketServer;
let heartbeatTimer: ReturnType<typeof setInterval>;

export const initWebSocket = (server: Server): void => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    log.info({ clients: wss.clients.size }, 'Client connected');

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    ws.on('close', () => {
      log.info({ clients: wss.clients.size }, 'Client disconnected');
    });
  });

  heartbeatTimer = setInterval(() => {
    for (const client of wss.clients) {
      const socket = client as WebSocket & { isAlive: boolean };
      if (!socket.isAlive) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  log.info('WebSocket server initialized with heartbeat');
}

export const broadcast = (event: string, data?: Record<string, unknown>): void => {
  if (!wss) return;

  const message = JSON.stringify(data ? { event, ...data } : { event });
  let sent = 0;

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0 && event !== 'poll-progress') {
    log.debug({ event, clients: sent }, 'Broadcast sent');
  }
}
