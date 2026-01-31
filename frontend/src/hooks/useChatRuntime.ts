/**
 * useChatRuntime Hook
 *
 * assistant-ui 运行时适配器
 * 使用 useExternalStoreRuntime 将 ChatBlock 状态接入 assistant-ui
 */

import { useCallback, useMemo } from 'react'
import type {
  AppendMessage,
  AttachmentAdapter,
  ThreadMessageLike,
  ThreadMessage
} from '@assistant-ui/react'
import { useExternalMessageConverter, useExternalStoreRuntime } from '@assistant-ui/react'
import type { ChatBlock } from '@/types/chat'
import { isUserTextBlock, isToolCallBlock, isPermissionRequestBlock } from '@/types/chat'

interface UseChatRuntimeOptions {
  /** 所有消息块 */
  blocks: ChatBlock[]

  /** 是否正在运行（思考中） */
  isRunning: boolean

  /** 发送消息回调 */
  onSendMessage: (text: string) => void

  /** 中止生成回调 */
  onAbort: () => Promise<void>

  /** 附件适配器（可选） */
  attachmentAdapter?: AttachmentAdapter

  /** 是否允许在不活跃时发送 */
  allowSendWhenInactive?: boolean

  /** 是否禁用 */
  isDisabled?: boolean
}

/**
 * ChatRuntime Hook
 *
 * 将 ChatBlock 状态适配到 assistant-ui 的运行时接口
 */
export function useChatRuntime(options: UseChatRuntimeOptions) {
  const {
    blocks,
    isRunning,
    onSendMessage,
    onAbort,
    attachmentAdapter,
    allowSendWhenInactive = true,
    isDisabled = false
  } = options

  /**
   * 将 ChatBlock 转换为 assistant-ui ThreadMessageLike 格式
   */
  const messageConverter = useCallback((block: ChatBlock): ThreadMessageLike | null => {
    switch (block.kind) {
      case 'user-text':
        return {
          role: 'user',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{ type: 'text', text: block.text }],
          metadata: {
            custom: {
              kind: 'user',
              status: block.status,
              localId: block.localId,
              attachments: block.attachments
            }
          }
        }

      case 'agent-text':
        return {
          role: 'assistant',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{ type: 'text', text: block.text }],
          metadata: {
            custom: {
              kind: 'assistant',
              format: block.format
            }
          }
        }

      case 'agent-reasoning':
        return {
          role: 'assistant',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{ type: 'reasoning', text: block.text }],
          metadata: {
            custom: {
              kind: 'assistant',
              reasoningState: block.state
            }
          }
        }

      case 'agent-event':
        return {
          role: 'system',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{ type: 'text', text: block.event.label }],
          metadata: {
            custom: {
              kind: 'event',
              event: block.event
            }
          }
        }

      case 'tool-call':
        return {
          role: 'assistant',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{
            type: 'tool-call',
            toolCallId: block.id,
            toolName: block.tool.name,
            args: JSON.stringify(block.tool.input),
            result: block.tool.result ? JSON.stringify(block.tool.result) : undefined,
            isError: block.tool.state === 'error'
          }],
          metadata: {
            custom: {
              kind: 'tool',
              tool: block.tool
            }
          }
        }

      case 'cli-output':
        return {
          role: block.source === 'user' ? 'user' : 'assistant',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{ type: 'text', text: block.text }],
          metadata: {
            custom: {
              kind: 'cli-output',
              source: block.source
            }
          }
        }

      case 'permission-request':
        return {
          role: 'system',
          id: block.id,
          createdAt: new Date(block.createdAt),
          content: [{
            type: 'text',
            text: `权限请求: ${block.tool}`
          }],
          metadata: {
            custom: {
              kind: 'permission-request',
              requestId: block.requestId,
              tool: block.tool,
              arguments: block.arguments,
              state: block.state,
              onApprove: block._onApprove,
              onDeny: block._onDeny
            }
          }
        }

      default:
        return null
    }
  }, [])

  /**
   * 使用缓存的转换器
   */
  const convertedMessages = useExternalMessageConverter<ChatBlock>({
    callback: messageConverter,
    messages: blocks,
    isRunning
  })

  /**
   * 处理新消息
   */
  const handleNew = useCallback(async (message: AppendMessage) => {
    const { text, attachments } = extractMessageContent(message)

    if (text || (attachments && attachments.length > 0)) {
      // TODO: 处理附件上传
      onSendMessage(text)
    }
  }, [onSendMessage])

  /**
   * 处理中止
   */
  const handleCancel = useCallback(async () => {
    await onAbort()
  }, [onAbort])

  /**
   * 构建运行时适配器
   */
  const adapter = useMemo(() => ({
    isDisabled,
    isRunning,
    messages: convertedMessages,
    onNew: handleNew,
    onCancel: handleCancel,
    adapters: attachmentAdapter ? { attachments: attachmentAdapter } : undefined,
    unstable_capabilities: {
      copy: true,
      previous_messages: true,
      restart: true
    },
    allowSendWhenInactive
  }), [
    isDisabled,
    isRunning,
    convertedMessages,
    handleNew,
    handleCancel,
    attachmentAdapter,
    allowSendWhenInactive
  ])

  return useExternalStoreRuntime(adapter)
}

/**
 * 从 AppendMessage 中提取文本和附件
 */
function extractMessageContent(message: AppendMessage): {
  text: string
  attachments: Array<{ name: string; contentType: string; content: string }>
} {
  const attachments: Array<{ name: string; contentType: string; content: string }> = []
  const textParts: string[] = []

  // 提取附件
  if (message.attachments) {
    for (const attachment of message.attachments) {
      if (attachment.content) {
        for (const part of attachment.content) {
          if (part.type === 'text' && typeof part.text === 'string') {
            // 检查是否为附件元数据
            try {
              const parsed = JSON.parse(part.text)
              if (parsed.__attachmentMetadata) {
                attachments.push({
                  name: parsed.__attachmentMetadata.filename || 'unknown',
                  contentType: parsed.__attachmentMetadata.mimeType || 'application/octet-stream',
                  content: part.text
                })
                continue
              }
            } catch {
              // 不是 JSON，当作普通文本
            }
            textParts.push(part.text)
          }
        }
      }
    }
  }

  // 提取文本内容
  if (message.content) {
    for (const part of message.content) {
      if (part.type === 'text' && typeof part.text === 'string') {
        textParts.push(part.text)
      }
    }
  }

  return {
    text: textParts.join('\n').trim(),
    attachments
  }
}
