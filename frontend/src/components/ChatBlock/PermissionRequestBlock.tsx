/**
 * 权限请求块组件（可交互）
 */

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Shield } from 'lucide-react'
import type { PermissionRequestBlock } from '@/types/chat'

export interface PermissionRequestBlockProps {
  block: PermissionRequestBlock
}

export function PermissionRequestBlock({ block }: PermissionRequestBlockProps) {
  const [state, setState] = useState(block.state)

  useEffect(() => {
    setState(block.state)
  }, [block.state])

  const handleApprove = () => {
    setState('approved')
    block._onApprove?.()
  }

  const handleDeny = () => {
    setState('denied')
    block._onDeny?.()
  }

  // 已拒绝状态
  if (state === 'denied') {
    return (
      <div className="my-2 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <XCircle size={16} />
          <span>权限请求已拒绝</span>
        </div>
      </div>
    )
  }

  // 已批准状态
  if (state === 'approved') {
    return (
      <div className="my-2 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 size={16} />
          <span>权限请求已批准</span>
        </div>
      </div>
    )
  }

  // 待处理状态
  return (
    <div className="my-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1">
          <h4 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
            AI 需要您的许可
          </h4>
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
            工具: <code className="rounded bg-amber-200 px-1.5 py-0.5 dark:bg-amber-800">{block.tool}</code>
          </p>

          {/* 参数详情 */}
          {block.arguments && Object.keys(block.arguments).length > 0 && (
            <details className="mb-4">
              <summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-400">
                查看参数
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-amber-100 p-2 text-xs dark:bg-amber-900">
                {JSON.stringify(block.arguments, null, 2)}
              </pre>
            </details>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              批准
            </button>
            <button
              onClick={handleDeny}
              className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              拒绝
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
