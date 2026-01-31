/**
 * useWebSocketChat Hook
 *
 * 负责：
 * 1. 建立 WebSocket 连接
 * 2. 处理 chat.block 和 chat.block.update 消息
 * 3. 管理 blocks 状态
 * 4. 提供 sendMessage, approvePermission, denyPermission, abortGeneration 方法
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatBlock, WebSocketMessage, SessionState, UserMessageRequest } from '@/types/chat'

interface UseWebSocketChatOptions {
  /**
   * WebSocket 服务器地址
   * @default 'ws://localhost:3001/ws'
   */
  url?: string

  /**
   * 项目 ID
   */
  projectId: string

  /**
   * 幻灯片 ID
   */
  slideId: string

  /**
   * 连接状态变化回调
   */
  onConnectionChange?: (connected: boolean) => void

  /**
   * 错误回调
   */
  onError?: (error: string) => void
}

interface UseWebSocketChatReturn {
  /** 所有消息块 */
  blocks: ChatBlock[]

  /** 是否已连接 */
  isConnected: boolean

  /** 是否正在思考 */
  isThinking: boolean

  /** 会话状态 */
  sessionState: SessionState | null

  /** 发送消息 */
  sendMessage: (text: string) => void

  /** 审批权限请求 */
  approvePermission: (requestId: string) => void

  /** 拒绝权限请求 */
  denyPermission: (requestId: string) => void

  /** 中止生成 */
  abortGeneration: () => void

  /** 重新连接 */
  reconnect: () => void
}

/**
 * WebSocket 聊天 Hook
 */
export function useWebSocketChat(options: UseWebSocketChatOptions): UseWebSocketChatReturn {
  const {
    url = 'ws://localhost:3001/ws',
    projectId,
    slideId,
    onConnectionChange,
    onError
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [blocks, setBlocks] = useState<ChatBlock[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)

  /**
   * 发送消息到服务器
   */
  const sendMessage = useCallback((text: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      onError?.('WebSocket 未连接')
      return
    }

    const message: UserMessageRequest = {
      type: 'chat.message.send',
      text
    }

    // 先添加用户消息到本地状态
    setBlocks((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'user-text',
        createdAt: Date.now(),
        text,
        status: 'sent'
      }
    ])

    ws.send(JSON.stringify(message))
  }, [onError])

  /**
   * 审批权限请求
   */
  const approvePermission = useCallback((requestId: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      onError?.('WebSocket 未连接')
      return
    }

    const message: UserMessageRequest = {
      type: 'chat.permission.approve',
      requestId
    }

    ws.send(JSON.stringify(message))

    // 更新本地状态
    setBlocks((prev) =>
      prev.map((block) =>
        block.kind === 'permission-request' && block.requestId === requestId
          ? { ...block, state: 'approved' }
          : block
      )
    )
  }, [onError])

  /**
   * 拒绝权限请求
   */
  const denyPermission = useCallback((requestId: string) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      onError?.('WebSocket 未连接')
      return
    }

    const message: UserMessageRequest = {
      type: 'chat.permission.deny',
      requestId
    }

    ws.send(JSON.stringify(message))

    // 更新本地状态
    setBlocks((prev) =>
      prev.map((block) =>
        block.kind === 'permission-request' && block.requestId === requestId
          ? { ...block, state: 'denied' }
          : block
      )
    )
  }, [onError])

  /**
   * 中止生成
   */
  const abortGeneration = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      onError?.('WebSocket 未连接')
      return
    }

    const message: UserMessageRequest = {
      type: 'chat.abort'
    }

    ws.send(JSON.stringify(message))
  }, [onError])

  /**
   * 重新连接
   */
  const reconnect = useCallback(() => {
    disconnect()
    connect()
  }, [])

  /**
   * 连接 WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(`${url}?projectId=${projectId}&slideId=${slideId}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[useWebSocketChat] Connected')
      setIsConnected(true)
      onConnectionChange?.(true)

      // 清除重连定时器
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }

    ws.onclose = (event) => {
      console.log('[useWebSocketChat] Disconnected', event.code, event.reason)
      setIsConnected(false)
      onConnectionChange?.(false)

      // 如果不是正常关闭，尝试重连
      if (event.code !== 1000) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useWebSocketChat] Reconnecting...')
          connect()
        }, 3000)
      }
    }

    ws.onerror = (event) => {
      console.error('[useWebSocketChat] Error', event)
      onError?.('WebSocket 连接错误')
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (error) {
        console.error('[useWebSocketChat] Failed to parse message', error)
      }
    }
  }, [url, projectId, slideId, onConnectionChange, onError])

  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmount')
      wsRef.current = null
    }

    setIsConnected(false)
  }, [])

  /**
   * 处理接收的消息
   */
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'chat.block':
        setBlocks((prev) => [...prev, message.block])
        break

      case 'chat.block.update':
        setBlocks((prev) =>
          prev.map((block) =>
            block.id === message.blockId
              ? { ...block, ...message.updates, updatedAt: Date.now() }
              : block
          )
        )
        break

      case 'chat.session.state':
        setSessionState(message.state)
        setIsThinking(message.state.thinking)
        break

      case 'chat.error':
        onError?.(message.error)
        break
    }
  }, [onError])

  /**
   * 组件挂载时连接
   */
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    blocks,
    isConnected,
    isThinking,
    sessionState,
    sendMessage,
    approvePermission,
    denyPermission,
    abortGeneration,
    reconnect
  }
}
