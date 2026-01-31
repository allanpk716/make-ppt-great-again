/**
 * AI 文本响应块组件
 */

import { ReactMarkdown } from '@assistant-ui/react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTextBlock } from '@/types/chat'

export interface AgentTextBlockProps {
  block: AgentTextBlock
}

export function AgentTextBlock({ block }: AgentTextBlockProps) {
  const isCode = block.format === 'code'

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-slate-900 dark:bg-slate-800 dark:text-slate-100">
        {isCode ? (
          <pre className="overflow-x-auto">
            <code>{block.text}</code>
          </pre>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义组件样式
              p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
              code: ({ inline, className, children }) => {
                if (inline) {
                  return (
                    <code className="rounded bg-slate-200 px-1 py-0.5 text-sm dark:bg-slate-700">
                      {children}
                    </code>
                  )
                }
                return (
                  <code className={className}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {block.text}
          </ReactMarkdown>
        )}

        {/* 时间戳 */}
        <div className="mt-1 text-xs text-slate-400">
          {new Date(block.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
