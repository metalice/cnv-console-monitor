import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

const log = logger.child({ module: 'WebSocket' });

const HEARTBEAT_INTERVAL_MS = 30000;

let wss: WebSocketServer;
let heartbeatTimer: ReturnType<typeof setInterval>;

export function initWebSocket(server: Server): void {
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
      const ws = client as WebSocket & { isAlive: boolean };
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  log.info('WebSocket server initialized with heartbeat');
}

export function broadcast(event: string): void {
  if (!wss) return;

  const message = JSON.stringify({ event });
  let sent = 0;

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    log.debug({ event, clients: sent }, 'Broadcast sent');
  }
}
