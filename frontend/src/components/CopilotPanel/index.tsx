/**
 * CopilotPanel 组件（重构版）
 *
 * 基于 ChatBlock 架构的 AI 聊天面板
 * 使用 assistant-ui 组件库
 */

import { useState } from 'react'
import { MessageSquare, Send, Square, Mic, Paperclip } from 'lucide-react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { usePPTStore } from '@/stores/pptStore'
import { useWebSocketChat } from '@/hooks/useWebSocketChat'
import { useChatRuntime } from '@/hooks/useChatRuntime'
import { ChatBlock } from '@/components/ChatBlock'

export interface CopilotPanelProps {
  style?: React.CSSProperties
}

export function CopilotPanel({ style }: CopilotPanelProps) {
  const { currentSlideId, getCurrentAIContext } = usePPTStore()
  // 从 slideId 提取项目ID，或使用默认值
  const projectId = 'default'
  const context = getCurrentAIContext()

  // WebSocket 聊天状态
  const {
    blocks,
    isConnected,
    isThinking,
    sendMessage,
    abortGeneration
  } = useWebSocketChat({
    projectId,
    slideId: currentSlideId || '',
    onConnectionChange: (connected) => {
      console.log('[CopilotPanel] Connection changed:', connected)
    },
    onError: (error) => {
      console.error('[CopilotPanel] Error:', error)
    }
  })

  // assistant-ui 运行时
  const runtime = useChatRuntime({
    blocks,
    isRunning: isThinking,
    onSendMessage: sendMessage,
    onAbort: async () => abortGeneration()
  })

  // 未选择幻灯片时的空状态
  if (!currentSlideId) {
    return (
      <div className="bg-slate-50 border-l border-slate-200" style={style}>
        <div className="h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>选择幻灯片后开始对话</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-900" style={style}>
      {/* 头部：状态和上下文 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI 助手</h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {context.type === 'page' ? '整页' : `元素 (${context.elementId})`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 连接状态 */}
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {isConnected ? '已连接' : '未连接'}
            </span>
          </div>
        </div>
      </div>

      {/* 聊天线程 */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <AssistantRuntimeProvider runtime={runtime}>
          <div className="h-full overflow-y-auto">
              <div className="mx-auto max-w-3xl p-4">
                {/* 空状态 */}
                {blocks.length === 0 && (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    与 AI 对话生成或修改幻灯片
                  </div>
                )}

                {/* 消息列表 - 使用 ChatBlock 组件 */}
                <div className="space-y-4">
                  {blocks.map((block) => (
                    <ChatBlock key={block.id} block={block} />
                  ))}
                </div>
              </div>
          </div>
        </AssistantRuntimeProvider>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <ChatInput
          disabled={!isConnected || !currentSlideId}
          isThinking={isThinking}
          onSend={sendMessage}
          onAbort={abortGeneration}
        />
      </div>
    </div>
  )
}

/**
 * 聊天输入组件
 */
interface ChatInputProps {
  disabled: boolean
  isThinking: boolean
  onSend: (text: string) => void
  onAbort: () => void
}

function ChatInput({ disabled, isThinking, onSend, onAbort }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input)
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex items-end gap-2">
      {/* 附件按钮 */}
      <button
        disabled={disabled}
        className="rounded-lg border p-2 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        title="上传附件"
      >
        <Paperclip className="h-5 w-5 text-slate-500" />
      </button>

      {/* 输入框 */}
      <textarea
        disabled={disabled}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入您的需求..."
        rows={2}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />

      {/* 语音按钮 */}
      <button
        disabled={disabled}
        className="rounded-lg border p-2 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        title="语音输入"
      >
        <Mic className="h-5 w-5 text-slate-500" />
      </button>

      {/* 发送/中止按钮 */}
      {isThinking ? (
        <button
          onClick={onAbort}
          className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700"
          title="中止生成"
        >
          <Square className="h-5 w-5 fill-current" />
        </button>
      ) : (
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600 dark:disabled:bg-slate-700"
          title="发送"
        >
          <Send className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
