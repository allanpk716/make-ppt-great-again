/**
 * 工具调用块组件
 */

import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import type { ToolCallBlock } from '@/types/chat'

export interface ToolCallBlockProps {
  block: ToolCallBlock
}

export function ToolCallBlock({ block }: ToolCallBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const { tool } = block

  const stateIcon = {
    pending: <Loader2 size={16} className="animate-spin text-yellow-500" />,
    running: <Loader2 size={16} className="animate-spin text-blue-500" />,
    success: <CheckCircle2 size={16} className="text-green-500" />,
    error: <XCircle size={16} className="text-red-500" />
  }[tool.state]

  return (
    <div className="my-2 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Wrench size={16} className="text-slate-500" />
        <span className="font-m text-sm font-medium">{tool.displayName}</span>
        <span className="ml-auto">{stateIcon}</span>
      </button>

      {isExpanded && (
        <div className="space-y-2 p-3">
          {/* 输入 */}
          {tool.input && Object.keys(tool.input).length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-500">输入</label>
              <JsonViewer data={tool.input} />
            </div>
          )}

          {/* 输出 */}
          {tool.result !== undefined && (
            <div>
              <label className="text-xs font-medium text-slate-500">输出</label>
              <JsonViewer data={tool.result} />
            </div>
          )}

          {/* 错误 */}
          {block.error && (
            <div className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {block.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * JSON 查看器组件
 */
function JsonViewer({ data }: { data: unknown }) {
  const jsonString = JSON.stringify(data, null, 2)

  return (
    <pre className="max-h-40 overflow-auto rounded bg-slate-100 p-2 text-xs dark:bg-slate-800">
      <code>{jsonString}</code>
    </pre>
  )
}
