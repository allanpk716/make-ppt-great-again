/**
 * WebSocket 聊天处理器
 *
 * 基于 ChatBlock 架构的 WebSocket 消息处理
 * 集成 MessageOrchestrator 进行流式响应编排
 */

import { WebSocket } from 'ws'
import { MessageOrchestrator } from '../services/messageOrchestrator.js'
import { logger } from '../lib/logger.js'
import type {
  ChatBlock,
  WebSocketMessage,
  SessionState,
  UserMessageRequest,
  ClaudeStreamEvent
} from '../types/chat.js'

/**
 * 聊天会话接口
 */
interface ChatSession {
  sessionId: string
  orchestrator: MessageOrchestrator
  projectId: string
  slideId: string
  clients: Set<WebSocket>
  createdAt: Date
  lastActivity: Date
}

/**
 * WebSocket 聊天处理器类
 */
export class WebSocketChatHandler {
  private sessions = new Map<string, ChatSession>()
  private readonly inactivityTimeout = 30 * 60 * 1000 // 30分钟
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanupTimer()
  }

  /**
   * 处理新的 WebSocket 连接
   */
  handleConnection(ws: WebSocket, projectId: string, slideId: string) {
    const sessionId = `${projectId}-${slideId}`

    // 获取或创建会话
    let session = this.sessions.get(sessionId)

    if (!session) {
      session = this.createSession(projectId, slideId)
      this.sessions.set(sessionId, session)
      logger.info(`[ChatHandler] Created new session: ${sessionId}`)
    }

    // 注册客户端
    session.clients.add(ws)

    // 发送初始状态
    this.sendToClient(ws, {
      type: 'chat.session.state',
      state: {
        sessionId: session.sessionId,
        thinking: false,
        controlledByUser: true,
        activeTools: []
      }
    })

    // 发送现有块
    for (const block of session.orchestrator.getAllBlocks()) {
      this.sendToClient(ws, {
        type: 'chat.block',
        block
      })
    }

    // 更新活动时间
    session.lastActivity = new Date()

    logger.info(`[ChatHandler] Client registered for session: ${sessionId}, clients: ${session.clients.size}`)

    // 设置消息处理器
    ws.on('message', (data: Buffer) => {
      this.handleClientMessage(session, ws, data)
    })

    // 设置关闭处理器
    ws.on('close', () => {
      session.clients.delete(ws)
      logger.info(`[ChatHandler] Client disconnected from session: ${sessionId}, clients: ${session.clients.size}`)

      // 如果没有客户端了，可以考虑清理会话（这里暂时保留）
    })

    // 设置错误处理器
    ws.on('error', (error) => {
      logger.error(`[ChatHandler] WebSocket error for session: ${sessionId}`, { error })
    })
  }

  /**
   * 处理客户端消息
   */
  private async handleClientMessage(session: ChatSession, clientWs: WebSocket, data: Buffer) {
    try {
      const message: UserMessageRequest = JSON.parse(data.toString())
      logger.debug(`[ChatHandler] Received message from client:`, message)

      session.lastActivity = new Date()

      switch (message.type) {
        case 'chat.message.send':
          await this.handleMessageSend(session, message.text)
          break

        case 'chat.permission.approve':
          await this.handlePermissionApprove(session, message.requestId)
          break

        case 'chat.permission.deny':
          await this.handlePermissionDeny(session, message.requestId)
          break

        case 'chat.abort':
          await this.handleAbort(session)
          break

        default:
          logger.warn(`[ChatHandler] Unknown message type: ${(message as { type: string }).type}`)
      }
    } catch (error) {
      logger.error('[ChatHandler] Error handling client message', { error })
      this.sendToClient(clientWs, {
        type: 'chat.error',
        error: (error as Error).message
      })
    }
  }

  /**
   * 处理消息发送
   */
  private async handleMessageSend(session: ChatSession, text: string) {
    // 添加用户消息
    const userBlock = session.orchestrator.addUserMessage(text)
    this.broadcastToSession(session, {
      type: 'chat.block',
      block: userBlock
    })

    // 发送思考状态
    this.broadcastToSession(session, {
      type: 'chat.session.state',
      state: {
        sessionId: session.sessionId,
        thinking: true,
        controlledByUser: true,
        activeTools: []
      }
    })

    // 调用 Claude CLI
    try {
      const cliStream = this.createCLIStream(session)
      const outputStream = this.processCLIStream(cliStream)

      for await (const output of outputStream) {
        if (output.type === 'block') {
          this.broadcastToSession(session, {
            type: 'chat.block',
            block: output.block
          })
        } else if (output.type === 'update') {
          this.broadcastToSession(session, {
            type: 'chat.block.update',
            blockId: output.blockId,
            updates: output.updates
          })
        } else if (output.type === 'state') {
          this.broadcastToSession(session, {
            type: 'chat.session.state',
            state: {
              sessionId: session.sessionId,
              thinking: output.state.thinking,
              controlledByUser: true,
              activeTools: []
            }
          })
        }
      }
    } catch (error) {
      logger.error('[ChatHandler] Error processing message', { error })
      this.broadcastToSession(session, {
        type: 'chat.error',
        error: (error as Error).message
      })
    }

    // 发送完成状态
    this.broadcastToSession(session, {
      type: 'chat.session.state',
      state: {
        sessionId: session.sessionId,
        thinking: false,
        controlledByUser: true,
        activeTools: []
      }
    })
  }

  /**
   * 处理权限审批
   */
  private async handlePermissionApprove(session: ChatSession, requestId: string) {
    // TODO: 实现权限审批逻辑
    logger.info(`[ChatHandler] Permission approved: ${requestId}`)
  }

  /**
   * 处理权限拒绝
   */
  private async handlePermissionDeny(session: ChatSession, requestId: string) {
    // TODO: 实现权限拒绝逻辑
    logger.info(`[ChatHandler] Permission denied: ${requestId}`)
  }

  /**
   * 处理中止
   */
  private async handleAbort(session: ChatSession) {
    // TODO: 实现 Claude CLI 中止
    logger.info('[ChatHandler] Abort requested')
    session.orchestrator.clear()
  }

  /**
   * 创建 Claude CLI 流
   */
  private async *createCLIStream(session: ChatSession): AsyncGenerator<ClaudeStreamEvent> {
    // TODO: 集成实际的 Claude CLI
    // 这里暂时返回模拟数据用于测试
    yield { type: 'message_start' }
    yield { type: 'thinking', content: '让我思考一下...' }
    yield { type: 'text', text: '这是一个测试响应' }
    yield { type: 'message_stop' }
  }

  /**
   * 处理 CLI 流并转换为编排器输出
   */
  private async *processCLIStream(
    stream: AsyncGenerator<ClaudeStreamEvent>
  ): AsyncGenerator<{
    type: 'block' | 'update' | 'state'
    block?: ChatBlock
    blockId?: string
    updates?: Partial<ChatBlock>
    state?: { thinking: boolean }
  }> {
    const orchestrator = new MessageOrchestrator()

    for await (const output of orchestrator.processStream(stream)) {
      if (output.type === 'block') {
        yield { type: 'block', block: output.block }
      } else if (output.type === 'update') {
        yield { type: 'update', blockId: output.blockId, updates: output.updates }
      } else if (output.type === 'state') {
        yield { type: 'state', state: output.state }
      }
    }
  }

  /**
   * 广播消息到会话的所有客户端
   */
  private broadcastToSession(session: ChatSession, message: WebSocketMessage) {
    const data = JSON.stringify(message)
    session.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })
  }

  /**
   * 发送消息到单个客户端
   */
  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  /**
   * 创建新会话
   */
  private createSession(projectId: string, slideId: string): ChatSession {
    return {
      sessionId: `${projectId}-${slideId}`,
      orchestrator: new MessageOrchestrator(),
      projectId,
      slideId,
      clients: new Set(),
      createdAt: new Date(),
      lastActivity: new Date()
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()

      for (const [sessionId, session] of this.sessions) {
        const inactiveTime = now - session.lastActivity.getTime()

        // 清理不活跃且无客户端的会话
        if (inactiveTime > this.inactivityTimeout && session.clients.size === 0) {
          logger.info(`[ChatHandler] Cleaning up inactive session: ${sessionId}`)
          this.sessions.delete(sessionId)
        }
      }
    }, 60000) // 每分钟检查
  }

  /**
   * 停止处理器
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // 关闭所有连接
    for (const session of this.sessions.values()) {
      for (const ws of session.clients) {
        ws.close()
      }
    }

    this.sessions.clear()
  }

  /**
   * 获取会话统计
   */
  getStats() {
    return {
      totalSessions: this.sessions.size,
      totalClients: Array.from(this.sessions.values()).reduce((sum, s) => sum + s.clients.size, 0)
    }
  }
}
