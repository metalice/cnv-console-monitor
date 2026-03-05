import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from './logger';

const log = logger.child({ module: 'WebSocket' });

let wss: WebSocketServer;

export function initWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    log.info({ clients: wss.clients.size }, 'Client connected');

    ws.on('close', () => {
      log.info({ clients: wss.clients.size }, 'Client disconnected');
    });
  });

  log.info('WebSocket server initialized');
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
