import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { SessionManager } from '../services/sessionManager.js';
import { logger } from '../lib/logger.js';

interface WSMessage {
  type: 'chat' | 'register' | 'heartbeat';
  projectId: string;
  slideId?: string;
  message?: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentSlideId: string | null = null;
    let _currentProjectId: string | null = null;

    logger.info('New WebSocket connection');

    // 心跳
    (ws as any).isAlive = true;
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        logger.debug('WebSocket message received:', data.toString());
        const msg: WSMessage = JSON.parse(data.toString());
        logger.debug('Parsed message:', msg);

        // 处理注册消息
        if (msg.type === 'register' && msg.slideId && msg.projectId) {
          currentSlideId = msg.slideId;
          currentProjectId = msg.projectId;
          logger.info(`Registering client for slide: ${msg.slideId}`);
          SessionManager.registerClient(msg.slideId, ws);

          // 发送确认
          ws.send(
            JSON.stringify({
              type: 'registered',
              slideId: msg.slideId,
            })
          );
          return;
        }

        if (msg.type === 'chat' && msg.slideId) {
          currentSlideId = msg.slideId;
          currentProjectId = msg.projectId;
          logger.info(`Processing chat message for slide: ${msg.slideId}`);

          // 发送消息到 CLI，并传递 ws 客户端以自动注册
          logger.debug(`Sending message to CLI: "${msg.message}"`);
          await SessionManager.sendMessage(
            msg.projectId,
            msg.slideId,
            msg.message || '',
            ws // 传递 WebSocket 客户端
          );
        }
      } catch (error) {
        logger.error('Error processing WebSocket message', { error });
        ws.send(
          JSON.stringify({
            type: 'error',
            error: (error as Error).message,
          })
        );
      }
    });

    ws.on('close', () => {
      if (currentSlideId) {
        SessionManager.unregisterClient(currentSlideId, ws);
      }
      logger.info('WebSocket connection closed');
    });
  });

  // 心跳检测
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}
