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
 * WebSocket 消息类型
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
 * 用户发送的消息类型
 */
export type UserMessageRequest =
  | { type: 'chat.message.send'; text: string; attachments?: AttachmentMetadata[] }
  | { type: 'chat.permission.approve'; requestId: string }
  | { type: 'chat.permission.deny'; requestId: string }
  | { type: 'chat.abort' }

/**
 * Claude AI Stream-JSON 事件类型（根据 Claude Code CLI 输出格式）
 */
export type ClaudeStreamEvent =
  | { type: 'system'; subtype?: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; name: string; input: unknown }
  | { type: 'tool_result'; name: string; output: unknown; isError?: boolean }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string }
  | { type: 'content_block_start'; index?: number; content_block_type?: string }
  | { type: 'content_block_delta'; delta?: { text?: string; type?: string } }
  | { type: 'content_block_stop' }
  | { type: 'message_delta'; delta?: { stop_reason?: string; stop_sequence?: null }; usage?: unknown }
  | { type: 'message_start' }
  | { type: 'message_stop' }
  | { type: string; [key: string]: unknown }

/**
 * 辅助函数：创建用户消息块
 */
export function createUserTextBlock(
  text: string,
  options?: {
    localId?: string
    attachments?: AttachmentMetadata[]
  }
): UserTextBlock {
  return {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind: 'user-text',
    createdAt: Date.now(),
    text,
    status: 'sent',
    localId: options?.localId,
    attachments: options?.attachments
  }
}

/**
 * 辅助函数：创建 AI 文本块
 */
export function createAgentTextBlock(
  text: string,
  format: 'markdown' | 'code' = 'markdown'
): AgentTextBlock {
  return {
    id: `agent-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind: 'agent-text',
    createdAt: Date.now(),
    text,
    format
  }
}

/**
 * 辅助函数：创建思考过程块
 */
export function createAgentReasoningBlock(
  text: string,
  state: 'thinking' | 'done' = 'thinking'
): AgentReasoningBlock {
  return {
    id: `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind: 'agent-reasoning',
    createdAt: Date.now(),
    text,
    state
  }
}

/**
 * 辅助函数：创建工具调用块
 */
export function createToolCallBlock(
  name: string,
  input: Record<string, unknown>
): ToolCallBlock {
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind: 'tool-call',
    createdAt: Date.now(),
    tool: {
      name,
      displayName: formatToolDisplayName(name),
      input,
      state: 'pending'
    }
  }
}

/**
 * 辅助函数：格式化工具名称
 * MCP 工具: mcp__server__tool_name -> Server: Tool Name
 */
export function formatToolDisplayName(name: string): string {
  if (name.startsWith('mcp__')) {
    const parts = name.split('__')
    if (parts.length >= 3) {
      const server = parts[1]
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')
      const toolName = parts[2]
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')
      return `${server}: ${toolName}`
    }
  }
  return name
}

/**
 * 辅助函数：检查块是否为用户消息
 */
export function isUserTextBlock(block: ChatBlock): block is UserTextBlock {
  return block.kind === 'user-text'
}

/**
 * 辅助函数：检查块是否为 AI 消息
 */
export function isAgentBlock(block: ChatBlock): block is AgentTextBlock | AgentReasoningBlock {
  return block.kind === 'agent-text' || block.kind === 'agent-reasoning'
}

/**
 * 辅助函数：检查块是否为工具调用
 */
export function isToolCallBlock(block: ChatBlock): block is ToolCallBlock {
  return block.kind === 'tool-call'
}

/**
 * 辅助函数：检查块是否可更新
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
