/**
 * AI 思考过程块组件（可折叠）
 */

import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import type { AgentReasoningBlock } from '@/types/chat'

export interface AgentReasoningBlockProps {
  block: AgentReasoningBlock
}

export function AgentReasoningBlock({ block }: AgentReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const isThinking = block.state === 'thinking'

  return (
    <div className="my-2 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-purple-700 dark:text-purple-300"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Brain size={16} className={isThinking ? 'animate-pulse' : ''} />
        <span className="font-medium">
          {isThinking ? '思考中...' : '思考过程'}
        </span>
        {isThinking && (
          <span className="ml-auto">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-purple-500" />
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-purple-200 px-3 py-2 dark:border-purple-800">
          <pre className="whitespace-pre-wrap text-xs text-purple-600 dark:text-purple-400">
            {block.text}
          </pre>
        </div>
      )}
    </div>
  )
}
