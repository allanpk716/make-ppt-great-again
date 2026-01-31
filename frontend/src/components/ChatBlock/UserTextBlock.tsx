/**
 * 用户文本消息块组件
 */

import type { UserTextBlock } from '@/types/chat'

export interface UserTextBlockProps {
  block: UserTextBlock
}

export function UserTextBlock({ block }: UserTextBlockProps) {
  const statusIndicator = {
    pending: (
      <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
    ),
    sent: null,
    error: (
      <span className="ml-2 text-red-500">
        <svg className="inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    )
  }[block.status || 'sent']

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-white">
        <div className="flex items-center justify-end gap-2">
          <p className="whitespace-pre-wrap break-words">{block.text}</p>
          {statusIndicator}
        </div>

        {/* 附件显示 */}
        {block.attachments && block.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {block.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 rounded bg-blue-700/50 px-2 py-1 text-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>{attachment.filename}</span>
              </div>
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <div className="mt-1 text-xs text-blue-200">
          {new Date(block.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  )
}
