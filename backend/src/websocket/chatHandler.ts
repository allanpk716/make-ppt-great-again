/**
 * WebSocket 聊天处理器
 *
 * 基于 ChatBlock 架构的 WebSocket 消息处理
 * 集成 SessionManager 进行 Claude CLI 调用
 * 支持权限审批交互
 */

import { WebSocket } from 'ws'
import { MessageOrchestrator } from '../services/messageOrchestrator.js'
import { SessionManager } from '../services/sessionManager.js'
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
  // 权限请求管理
  pendingPermissions: Map<string, { tool: string; arguments: Record<string, unknown> }>
  permissionCallbacks: Map<string, (approved: boolean) => void>
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
          await this.handleMessageSend(session, message.text || '')
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

    try {
      // 使用 SessionManager 发送消息并处理流式响应
      await this.processCLIMessage(session, text)

      // 发送结束状态
      this.broadcastToSession(session, {
        type: 'chat.session.state',
        state: {
          sessionId: session.sessionId,
          thinking: false,
          controlledByUser: true,
          activeTools: []
        }
      })
    } catch (error) {
      logger.error('[ChatHandler] Error processing message', { error })
      this.broadcastToSession(session, {
        type: 'chat.error',
        error: (error as Error).message
      })
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
  }

  /**
   * 处理 CLI 消息并流式转发
   */
  private async processCLIMessage(session: ChatSession, text: string): Promise<void> {
    const cliSession = await SessionManager.getOrCreateSession(session.projectId, session.slideId)

    // 创建权限请求拦截器
    let permissionResolve: ((approved: boolean, result?: unknown) => void) | null = null

    // 创建 stdout 数据处理器
    const stdoutHandler = (chunk: Buffer) => {
      const lines = chunk.toString().split('\n')
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const event = JSON.parse(line) as ClaudeStreamEvent

          // 检测权限请求
          if (event.type === 'error' && event.message && event.message.includes('permission')) {
            // 创建权限请求块
            this.createPermissionRequest(session, event.message)
            return
          }

          this.processStreamEventSync(session, event)
        } catch {
          // 非 JSON 行，作为文本事件处理
          if (line.trim()) {
            this.processStreamEventSync(session, {
              type: 'text',
              text: line + '\n'
            })
          }
        }
      }
    }

    // 临时添加 stdout 监听器
    cliSession.process.stdout?.on('data', stdoutHandler)

    // 发送消息到 CLI
    await SessionManager.sendMessage(session.projectId, session.slideId, text)

    // 等待进程完成
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cliSession.process.stdout?.off('data', stdoutHandler)
        resolve()
      }, 60000) // 60秒超时

      cliSession.process.once('exit', () => {
        clearTimeout(timeout)
        cliSession.process.stdout?.off('data', stdoutHandler)
        resolve()
      })

      cliSession.process.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  /**
   * 创建权限请求
   */
  private createPermissionRequest(session: ChatSession, message: string): void {
    const requestId = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // 解析权限请求消息
    // 格式类似: "Tool use: edit_file requires permission. Tool input: ..."
    const toolMatch = message.match(/Tool use:\s+(\w+)/)
    const toolName = toolMatch ? toolMatch[1] : 'unknown'

    // 保存权限请求
    session.pendingPermissions.set(requestId, {
      tool: toolName,
      arguments: { message }
    })

    // 创建权限请求块
    const permissionBlock: ChatBlock = {
      id: `perm-${requestId}`,
      kind: 'permission-request',
      createdAt: Date.now(),
      requestId,
      tool: toolName,
      arguments: { message },
      state: 'pending',
      // 注入回调函数
      _onApprove: () => this.handlePermissionApprove(session, requestId),
      _onDeny: () => this.handlePermissionDeny(session, requestId)
    }

    // 发送权限请求到客户端
    this.broadcastToSession(session, {
      type: 'chat.block',
      block: permissionBlock
    })

    logger.info(`[ChatHandler] Permission request created: ${requestId}, tool: ${toolName}`)
  }

  /**
   * 处理权限审批
   */
  private async handlePermissionApprove(session: ChatSession, requestId: string): Promise<void> {
    logger.info(`[ChatHandler] Permission approved: ${requestId}`)

    // 更新权限请求状态
    session.pendingPermissions.delete(requestId)

    // 广播状态更新
    this.broadcastToSession(session, {
      type: 'chat.block.update',
      blockId: `perm-${requestId}`,
      updates: { state: 'approved' }
    })

    // 发送批准响应到 CLI
    const cliSession = await SessionManager.getOrCreateSession(session.projectId, session.slideId)
    if (cliSession.process.stdin) {
      const response = JSON.stringify({
        type: 'permission_response',
        approved: true,
        requestId
      })
      cliSession.process.stdin.write(response + '\n')
    }

    // 通知回调
    const callback = session.permissionCallbacks.get(requestId)
    if (callback) {
      callback(true)
      session.permissionCallbacks.delete(requestId)
    }
  }

  /**
   * 处理权限拒绝
   */
  private async handlePermissionDeny(session: ChatSession, requestId: string): Promise<void> {
    logger.info(`[ChatHandler] Permission denied: ${requestId}`)

    // 更新权限请求状态
    session.pendingPermissions.delete(requestId)

    // 广播状态更新
    this.broadcastToSession(session, {
      type: 'chat.block.update',
      blockId: `perm-${requestId}`,
      updates: { state: 'denied' }
    })

    // 发送拒绝响应到 CLI
    const cliSession = await SessionManager.getOrCreateSession(session.projectId, session.slideId)
    if (cliSession.process.stdin) {
      const response = JSON.stringify({
        type: 'permission_response',
        approved: false,
        requestId
      })
      cliSession.process.stdin.write(response + '\n')
    }

    // 通知回调
    const callback = session.permissionCallbacks.get(requestId)
    if (callback) {
      callback(false)
      session.permissionCallbacks.delete(requestId)
    }
  }

  /**
   * 处理中止
   */
  private async handleAbort(session: ChatSession): Promise<void> {
    logger.info('[ChatHandler] Abort requested')

    // 清理状态
    session.orchestrator.clear()

    // 终止 CLI 进程
    const cliSession = await SessionManager.getOrCreateSession(session.projectId, session.slideId)
    if (cliSession.process.exitCode === null) {
      cliSession.process.kill('SIGTERM')
    }

    // 发送中止状态
    this.broadcastToSession(session, {
      type: 'chat.session.state',
      state: {
        sessionId: session.sessionId,
        thinking: false,
        controlledByUser: true,
        activeTools: []
      }
    })

    // 清理待处理的权限请求
    for (const [requestId, callback] of session.permissionCallbacks) {
      callback(false)
    }
    session.permissionCallbacks.clear()
    session.pendingPermissions.clear()
  }

  /**
   * 同步处理流事件
   */
  private processStreamEventSync(session: ChatSession, event: ClaudeStreamEvent): void {
    try {
      const orchestrator = session.orchestrator as any
      const handleResult = orchestrator.handleEvent(event)

      // 处理 Generator 结果
      const gen = handleResult as Generator<unknown>
      let result = gen.next()

      while (!result.done) {
        const output = result.value as { type: string; block?: ChatBlock; blockId?: string; updates?: Partial<ChatBlock>; state?: { thinking: boolean } }

        if (output.type === 'block') {
          this.broadcastToSession(session, {
            type: 'chat.block',
            block: output.block!
          })
        } else if (output.type === 'update') {
          this.broadcastToSession(session, {
            type: 'chat.block.update',
            blockId: output.blockId!,
            updates: output.updates!
          })
        } else if (output.type === 'state') {
          this.broadcastToSession(session, {
            type: 'chat.session.state',
            state: {
              sessionId: session.sessionId,
              thinking: output.state!.thinking,
              controlledByUser: true,
              activeTools: []
            }
          })
        }

        result = gen.next()
      }
    } catch (error) {
      logger.error('[ChatHandler] Error processing stream event', { error })
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
      lastActivity: new Date(),
      pendingPermissions: new Map(),
      permissionCallbacks: new Map()
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
