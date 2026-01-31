/**
 * ChatBlock 路由组件
 *
 * 根据 block.kind 渲染对应的消息块组件
 */

import type { ChatBlock } from '@/types/chat'
import { UserTextBlock } from './UserTextBlock'
import { AgentTextBlock } from './AgentTextBlock'
import { AgentReasoningBlock } from './AgentReasoningBlock'
import { AgentEventBlock } from './AgentEventBlock'
import { ToolCallBlock } from './ToolCallBlock'
import { CliOutputBlock } from './CliOutputBlock'
import { PermissionRequestBlock } from './PermissionRequestBlock'

export interface ChatBlockProps {
  block: ChatBlock
}

/**
 * ChatBlock 路由组件
 */
export function ChatBlock({ block }: ChatBlockProps) {
  switch (block.kind) {
    case 'user-text':
      return <UserTextBlock block={block} />

    case 'agent-text':
      return <AgentTextBlock block={block} />

    case 'agent-reasoning':
      return <AgentReasoningBlock block={block} />

    case 'agent-event':
      return <AgentEventBlock block={block} />

    case 'tool-call':
      return <ToolCallBlock block={block} />

    case 'cli-output':
      return <CliOutputBlock block={block} />

    case 'permission-request':
      return <PermissionRequestBlock block={block} />

    default:
      // 未知块类型
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-gray-500">
          未知消息类型: {(block as { kind: string }).kind}
        </div>
      )
  }
}
