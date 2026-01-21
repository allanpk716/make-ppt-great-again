import { WebSocketServer } from 'ws';
import { SessionManager } from '../services/sessionManager.js';
import { logger } from '../lib/logger.js';
export function setupWebSocket(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        let currentSlideId = null;
        let currentProjectId = null;
        logger.info('New WebSocket connection');
        // 心跳
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });
        ws.on('message', async (data) => {
            try {
                logger.debug('WebSocket message received:', data.toString());
                const msg = JSON.parse(data.toString());
                logger.debug('Parsed message:', msg);
                // 处理注册消息
                if (msg.type === 'register' && msg.slideId && msg.projectId) {
                    currentSlideId = msg.slideId;
                    currentProjectId = msg.projectId;
                    logger.info(`Registering client for slide: ${msg.slideId}`);
                    SessionManager.registerClient(msg.slideId, ws);
                    // 发送确认
                    ws.send(JSON.stringify({
                        type: 'registered',
                        slideId: msg.slideId
                    }));
                    return;
                }
                if (msg.type === 'chat' && msg.slideId) {
                    currentSlideId = msg.slideId;
                    currentProjectId = msg.projectId;
                    logger.info(`Processing chat message for slide: ${msg.slideId}`);
                    // 发送消息到 CLI，并传递 ws 客户端以自动注册
                    logger.debug(`Sending message to CLI: "${msg.message}"`);
                    await SessionManager.sendMessage(msg.projectId, msg.slideId, msg.message || '', ws // 传递 WebSocket 客户端
                    );
                }
            }
            catch (error) {
                logger.error('Error processing WebSocket message', { error });
                ws.send(JSON.stringify({
                    type: 'error',
                    error: error.message
                }));
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
        wss.clients.forEach((ws) => {
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
