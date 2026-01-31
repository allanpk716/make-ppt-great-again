/**
 * CLI 输出块组件
 */

import type { CliOutputBlock } from '@/types/chat'

export interface CliOutputBlockProps {
  block: CliOutputBlock
}

export function CliOutputBlock({ block }: CliOutputBlockProps) {
  const isUser = block.source === 'user'
  const isSystem = block.source === 'system'

  return (
    <div className={`my-1 rounded px-3 py-1 text-xs font-mono ${
      isUser
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
        : isSystem
          ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    }`}>
      <pre className="whitespace-pre-wrap">{block.text}</pre>
    </div>
  )
}
