/**
 * AI 事件块组件
 */

import type { AgentEventBlock } from '@/types/chat'

export interface AgentEventBlockProps {
  block: AgentEventBlock
}

export function AgentEventBlock({ block }: AgentEventBlockProps) {
  const { event } = block

  return (
    <div className="my-1 flex items-center gap-2 text-sm text-slate-500">
      <span>{event.icon || 'ℹ️'}</span>
      <span>{event.label}</span>
    </div>
  )
}
