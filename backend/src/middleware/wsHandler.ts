/**
 * WebSocket 处理器
 *
 * 集成 ChatBlock 架构的 WebSocket 聊天处理
 */

import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import { SessionManager } from '../services/sessionManager.js'
import { WebSocketChatHandler } from '../websocket/chatHandler.js'
import { logger } from '../lib/logger.js'

// 扩展 WSMessage 类型以支持新的聊天格式
interface WSMessage {
  type: 'chat' | 'register' | 'heartbeat' | 'chat.message.send' | 'chat.abort' | 'chat.permission.approve' | 'chat.permission.deny'
  projectId: string
  slideId?: string
  message?: string
  text?: string
  requestId?: string
}

// 全局聊天处理器实例
const chatHandler = new WebSocketChatHandler()

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, req) => {
    // 从 URL 查询参数中获取 projectId 和 slideId
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const projectId = url.searchParams.get('projectId') || 'default'
    const slideId = url.searchParams.get('slideId')

    logger.info(`[WSHandler] New connection - projectId: ${projectId}, slideId: ${slideId}`)

    // 心跳检测
    ;(ws as any).isAlive = true
    ws.on('pong', () => {
      ;(ws as any).isAlive = true
    })

    // 如果提供了 slideId，使用新的 ChatBlock 架构
    if (slideId) {
      chatHandler.handleConnection(ws, projectId, slideId)
      return
    }

    // 否则使用旧的兼容逻辑
    handleLegacyConnection(ws, projectId)
  })

  // 心跳检测定时器
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30000)

  wss.on('close', () => {
    clearInterval(interval)
    // 停止聊天处理器
    chatHandler.stop()
  })

  logger.info('[WSHandler] WebSocket server initialized')

  return wss
}

/**
 * 处理旧版连接（兼容模式）
 */
function handleLegacyConnection(ws: WebSocket, projectId: string) {
  let currentSlideId: string | null = null

  ws.on('message', async (data: Buffer) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString())
      logger.debug('[WSHandler] Legacy message received:', msg)

      // 处理注册消息
      if (msg.type === 'register' && msg.slideId) {
        currentSlideId = msg.slideId
        logger.info(`[WSHandler] Registering client for slide: ${msg.slideId}`)
        SessionManager.registerClient(msg.slideId, ws)

        // 发送确认
        ws.send(
          JSON.stringify({
            type: 'registered',
            slideId: msg.slideId
          })
        )
        return
      }

      // 处理聊天消息（兼容旧格式）
      if (msg.type === 'chat' && msg.slideId) {
        currentSlideId = msg.slideId
        logger.info(`[WSHandler] Processing chat message for slide: ${msg.slideId}`)

        // 发送消息到 CLI
        await SessionManager.sendMessage(
          msg.projectId || projectId,
          msg.slideId,
          msg.message || '',
          ws
        )
      }
    } catch (error) {
      logger.error('[WSHandler] Error processing message', { error })
      ws.send(
        JSON.stringify({
          type: 'error',
          error: (error as Error).message
        })
      )
    }
  })

  ws.on('close', () => {
    if (currentSlideId) {
      SessionManager.unregisterClient(currentSlideId, ws)
    }
    logger.info('[WSHandler] Legacy connection closed')
  })
}

// 导出聊天处理器供测试使用
export { chatHandler }
