/**
 * ChatBlock 类型定义
 *
 * 借鉴 HAPI 项目的消息块架构，将 AI 响应组织成结构化的块
 * 每个块可以独立更新，支持流式显示
 */

/**
 * 所有 ChatBlock 的基础接口
 */
export interface BaseChatBlock {
  id: string
  createdAt: number
  updatedAt?: number
}

/**
 * 用户文本消息块
 */
export interface UserTextBlock extends BaseChatBlock {
  kind: 'user-text'
  text: string
  attachments?: AttachmentMetadata[]
  status?: 'pending' | 'sent' | 'error'
  localId?: string
}

/**
 * AI 文本响应块
 */
export interface AgentTextBlock extends BaseChatBlock {
  kind: 'agent-text'
  text: string
  format?: 'markdown' | 'code'
}

/**
 * AI 思考过程块（可折叠）
 */
export interface AgentReasoningBlock extends BaseChatBlock {
  kind: 'agent-reasoning'
  text: string
  state: 'thinking' | 'done'
}

/**
 * AI 事件块（如工具开始/结束）
 */
export interface AgentEventBlock extends BaseChatBlock {
  kind: 'agent-event'
  event: AgentEvent
}

/**
 * AI 事件类型
 */
export interface AgentEvent {
  type: 'tool_start' | 'tool_end' | 'search' | 'file_read' | 'error' | 'info'
  label: string
  icon?: string
  metadata?: Record<string, unknown>
}

/**
 * 工具调用块
 */
export interface ToolCallBlock extends BaseChatBlock {
  kind: 'tool-call'
  tool: {
    name: string
    displayName: string
    input: Record<string, unknown>
    result?: unknown
    state: 'pending' | 'running' | 'success' | 'error'
  }
  error?: string
}

/**
 * CLI 输出块
 */
export interface CliOutputBlock extends BaseChatBlock {
  kind: 'cli-output'
  text: string
  source: 'user' | 'assistant' | 'system'
}

/**
 * 权限请求块（可交互）
 */
export interface PermissionRequestBlock extends BaseChatBlock {
  kind: 'permission-request'
  requestId: string
  tool: string
  arguments: Record<string, unknown>
  state: 'pending' | 'approved' | 'denied'
  // 内联回调（运行时注入）
  _onApprove?: () => void
  _onDeny?: () => void
}

/**
 * 附件元数据
 */
export interface AttachmentMetadata {
  id: string
  filename: string
  mimeType: string
  size: number
  path?: string
  previewUrl?: string
}

/**
 * ChatBlock 联合类型
 */
export type ChatBlock =
  | UserTextBlock
  | AgentTextBlock
  | AgentReasoningBlock
  | AgentEventBlock
  | ToolCallBlock
  | CliOutputBlock
  | PermissionRequestBlock

/**
 * WebSocket 消息类型（从后端接收）
 */
export type WebSocketMessage =
  | { type: 'chat.block'; block: ChatBlock }
  | { type: 'chat.block.update'; blockId: string; updates: Partial<ChatBlock> }
  | { type: 'chat.session.state'; state: SessionState }
  | { type: 'chat.error'; error: string }

/**
 * 会话状态
 */
export interface SessionState {
  sessionId: string
  thinking: boolean
  controlledByUser: boolean
  activeTools: string[]
  model?: string
  permissionMode?: 'default' | 'bypassPermissions' | 'plan'
}

/**
 * 用户发送的消息类型（发送到后端）
 */
export type UserMessageRequest =
  | { type: 'chat.message.send'; text: string; attachments?: AttachmentMetadata[] }
  | { type: 'chat.permission.approve'; requestId: string }
  | { type: 'chat.permission.deny'; requestId: string }
  | { type: 'chat.abort' }

/**
 * assistant-ui ThreadMessageLike 元数据扩展
 */
export interface ChatMessageMetadata {
  kind: 'user' | 'assistant' | 'tool' | 'event' | 'cli-output' | 'permission-request'
  status?: 'pending' | 'sent' | 'error'
  localId?: string
  originalText?: string
  toolCallId?: string
  event?: AgentEvent
  source?: 'user' | 'assistant' | 'system'
  attachments?: AttachmentMetadata[]
  tool?: {
    name: string
    displayName: string
    input: Record<string, unknown>
    result?: unknown
    state: 'pending' | 'running' | 'success' | 'error'
  }
  requestId?: string
  onApprove?: () => void
  onDeny?: () => void
}

/**
 * 类型守卫：检查块是否为用户消息
 */
export function isUserTextBlock(block: ChatBlock): block is UserTextBlock {
  return block.kind === 'user-text'
}

/**
 * 类型守卫：检查块是否为 AI 消息
 */
export function isAgentBlock(block: ChatBlock): block is AgentTextBlock | AgentReasoningBlock {
  return block.kind === 'agent-text' || block.kind === 'agent-reasoning'
}

/**
 * 类型守卫：检查块是否为工具调用
 */
export function isToolCallBlock(block: ChatBlock): block is ToolCallBlock {
  return block.kind === 'tool-call'
}

/**
 * 类型守卫：检查块是否可更新
 */
export function isUpdatableBlock(
  block: ChatBlock
): block is AgentTextBlock | AgentReasoningBlock | ToolCallBlock {
  return (
    block.kind === 'agent-text' ||
    block.kind === 'agent-reasoning' ||
    block.kind === 'tool-call'
  )
}

/**
 * 类型守卫：检查块是否为权限请求
 */
export function isPermissionRequestBlock(block: ChatBlock): block is PermissionRequestBlock {
  return block.kind === 'permission-request'
}

/**
 * 获取块的显示标题
 */
export function getBlockTitle(block: ChatBlock): string {
  switch (block.kind) {
    case 'user-text':
      return '你'
    case 'agent-text':
      return 'AI 助手'
    case 'agent-reasoning':
      return block.state === 'thinking' ? '思考中...' : '思考过程'
    case 'agent-event':
      return block.event.label
    case 'tool-call':
      return block.tool.displayName
    case 'cli-output':
      return block.source === 'user' ? '终端输入' : block.source === 'system' ? '系统输出' : 'AI 输出'
    case 'permission-request':
      return '权限请求'
    default:
      return '未知'
  }
}

/**
 * 获取块的图标
 */
export function getBlockIcon(block: ChatBlock): string | null {
  switch (block.kind) {
    case 'user-text':
      return '👤'
    case 'agent-text':
      return '🤖'
    case 'agent-reasoning':
      return block.state === 'thinking' ? '🧠💭' : '🧠'
    case 'agent-event':
      return block.event.icon || 'ℹ️'
    case 'tool-call':
      return '🔧'
    case 'cli-output':
      return '💻'
    case 'permission-request':
      return '🔒'
    default:
      return null
  }
}

/**
 * 检查块是否正在处理中
 */
export function isBlockProcessing(block: ChatBlock): boolean {
  switch (block.kind) {
    case 'agent-reasoning':
      return block.state === 'thinking'
    case 'tool-call':
      return block.tool.state === 'pending' || block.tool.state === 'running'
    case 'permission-request':
      return block.state === 'pending'
    default:
      return false
  }
}
