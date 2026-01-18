import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { SessionManager } from '../services/sessionManager.js';

interface WSMessage {
  type: 'chat' | 'heartbeat';
  projectId: string;
  slideId?: string;
  message?: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentSlideId: string | null = null;

    console.log('New WebSocket connection');

    // 心跳
    (ws as any).isAlive = true;
    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());

        if (msg.type === 'chat' && msg.slideId) {
          currentSlideId = msg.slideId;

          // 注册客户端到会话
          SessionManager.registerClient(msg.slideId, ws);

          // 发送消息到 CLI
          await SessionManager.sendMessage(
            msg.projectId,
            msg.slideId,
            msg.message || ''
          );
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          error: (error as Error).message
        }));
      }
    });

    ws.on('close', () => {
      if (currentSlideId) {
        SessionManager.unregisterClient(currentSlideId, ws);
      }
      console.log('WebSocket connection closed');
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
