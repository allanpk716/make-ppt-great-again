/**
 * MessageOrchestrator 服务
 *
 * 负责：
 * 1. 接收 Claude AI 流式响应
 * 2. 聚合相关消息
 * 3. 生成结构化的 ChatBlock
 * 4. 支持增量更新
 */

import type {
  ChatBlock,
  ClaudeStreamEvent,
  UserTextBlock,
  AgentTextBlock,
  AgentReasoningBlock,
  ToolCallBlock,
  AgentEventBlock
} from '../types/chat.js'
import { formatToolDisplayName } from '../types/chat.js'

/**
 * 编排器生成的输出事件
 */
export type OrchestratorOutput =
  | { type: 'block'; block: ChatBlock }
  | { type: 'update'; blockId: string; updates: Partial<ChatBlock> }
  | { type: 'state'; state: { thinking: boolean } }

/**
 * MessageOrchestrator 类
 */
export class MessageOrchestrator {
  private blocks = new Map<string, ChatBlock>()
  private currentAgentBlock: AgentTextBlock | null = null
  private currentReasoningBlock: AgentReasoningBlock | null = null
  private pendingToolCall: ToolCallBlock | null = null
  private isThinking = false

  /**
   * 处理 Claude AI 流式响应
   * 返回 Generator 以支持流式输出
   */
  async *processStream(
    stream: AsyncIterable<ClaudeStreamEvent>
  ): AsyncGenerator<OrchestratorOutput, void, unknown> {
    try {
      for await (const event of stream) {
        yield* this.handleEvent(event)
      }
    } finally {
      // 流结束时清理状态
      this.finalizeCurrentBlocks()
    }
  }

  /**
   * 处理单个事件
   */
  private async *handleEvent(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    switch (event.type) {
      case 'message_start':
        this.isThinking = true
        yield { type: 'state', state: { thinking: true } }
        break

      case 'message_stop':
        this.isThinking = false
        this.finalizeCurrentBlocks()
        yield { type: 'state', state: { thinking: false } }
        break

      case 'content_block_start':
        this.handleContentBlockStart(event)
        break

      case 'content_block_delta':
        yield* this.handleContentBlockDelta(event)
        break

      case 'content_block_stop':
        yield* this.handleContentBlockStop()
        break

      case 'thinking':
        yield* this.handleThinking(event)
        break

      case 'text':
        yield* this.handleText(event)
        break

      case 'tool_use':
        yield* this.handleToolUse(event)
        break

      case 'tool_result':
        yield* this.handleToolResult(event)
        break

      case 'error':
        yield* this.handleError(event)
        break

      default:
        // 忽略未知事件类型
        break
    }
  }

  /**
   * 处理 content_block_start 事件
   */
  private handleContentBlockStart(event: ClaudeStreamEvent): void {
    const blockType = event.content_block_type

    if (blockType === 'thinking') {
      // 创建思考块
      this.currentReasoningBlock = {
        id: `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'agent-reasoning',
        createdAt: Date.now(),
        text: '',
        state: 'thinking'
      }
    } else if (blockType === 'text') {
      // 创建文本块
      this.currentAgentBlock = {
        id: `agent-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'agent-text',
        createdAt: Date.now(),
        text: '',
        format: 'markdown'
      }
    }
  }

  /**
   * 处理 content_block_delta 事件（增量更新）
   */
  private async *handleContentBlockDelta(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    const delta = event.delta
    if (!delta) return

    const text = delta.text || ''
    if (!text) return

    // 优先更新思考块
    if (this.currentReasoningBlock) {
      this.currentReasoningBlock.text += text
      this.currentReasoningBlock.updatedAt = Date.now()

      yield {
        type: 'update',
        blockId: this.currentReasoningBlock.id,
        updates: { text: this.currentReasoningBlock.text }
      }
      return
    }

    // 更新文本块
    if (this.currentAgentBlock) {
      this.currentAgentBlock.text += text
      this.currentAgentBlock.updatedAt = Date.now()

      yield {
        type: 'update',
        blockId: this.currentAgentBlock.id,
        updates: { text: this.currentAgentBlock.text }
      }
    }
  }

  /**
   * 处理 content_block_stop 事件
   */
  private async *handleContentBlockStop(): AsyncGenerator<OrchestratorOutput> {
    // 完成思考块
    if (this.currentReasoningBlock) {
      this.currentReasoningBlock.state = 'done'
      this.currentReasoningBlock.updatedAt = Date.now()

      yield {
        type: 'update',
        blockId: this.currentReasoningBlock.id,
        updates: { state: 'done' }
      }

      this.blocks.set(this.currentReasoningBlock.id, this.currentReasoningBlock)
      this.currentReasoningBlock = null
    }

    // 完成文本块
    if (this.currentAgentBlock) {
      this.currentAgentBlock.updatedAt = Date.now()
      this.blocks.set(this.currentAgentBlock.id, this.currentAgentBlock)
      this.currentAgentBlock = null
    }
  }

  /**
   * 处理 thinking 事件（兼容旧格式）
   */
  private async *handleThinking(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    if (!this.currentReasoningBlock) {
      this.currentReasoningBlock = {
        id: `reasoning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'agent-reasoning',
        createdAt: Date.now(),
        text: '',
        state: 'thinking'
      }
    }

    this.currentReasoningBlock.text += event.content || ''
    this.currentReasoningBlock.updatedAt = Date.now()

    yield {
      type: 'update',
      blockId: this.currentReasoningBlock.id,
      updates: { text: this.currentReasoningBlock.text }
    }
  }

  /**
   * 处理 text 事件（兼容旧格式）
   */
  private async *handleText(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    if (!this.currentAgentBlock) {
      this.currentAgentBlock = {
        id: `agent-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'agent-text',
        createdAt: Date.now(),
        text: '',
        format: 'markdown'
      }
    }

    this.currentAgentBlock.text += event.text || ''
    this.currentAgentBlock.updatedAt = Date.now()

    yield {
      type: 'update',
      blockId: this.currentAgentBlock.id,
      updates: { text: this.currentAgentBlock.text }
    }
  }

  /**
   * 处理 tool_use 事件
   */
  private async *handleToolUse(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    // 先完成当前块
    yield* this.handleContentBlockStop()

    const toolBlock: ToolCallBlock = {
      id: `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kind: 'tool-call',
      createdAt: Date.now(),
      tool: {
        name: event.name || 'unknown',
        displayName: formatToolDisplayName(event.name || 'unknown'),
        input: event.input || {},
        state: 'pending'
      }
    }

    this.pendingToolCall = toolBlock
    this.blocks.set(toolBlock.id, toolBlock)

    // 发送工具开始事件
    const eventBlock: AgentEventBlock = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kind: 'agent-event',
      createdAt: Date.now(),
      event: {
        type: 'tool_start',
        label: `调用: ${toolBlock.tool.displayName}`,
        icon: '🔧'
      }
    }
    this.blocks.set(eventBlock.id, eventBlock)

    yield { type: 'block', block: eventBlock }
    yield { type: 'block', block: toolBlock }
  }

  /**
   * 处理 tool_result 事件
   */
  private async *handleToolResult(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    if (this.pendingToolCall) {
      const isError = event.isError || false

      // 更新工具调用状态
      this.pendingToolCall.tool.state = isError ? 'error' : 'success'
      this.pendingToolCall.tool.result = event.output
      this.pendingToolCall.updatedAt = Date.now()

      if (isError) {
        this.pendingToolCall.error = String(event.output || '工具执行失败')
      }

      const blockId = this.pendingToolCall.id
      const updates: Partial<ToolCallBlock> = {
        tool: { ...this.pendingToolCall.tool },
        error: this.pendingToolCall.error
      }

      this.pendingToolCall = null

      yield { type: 'update', blockId, updates }

      // 发送工具结束事件
      const eventBlock: AgentEventBlock = {
        id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        kind: 'agent-event',
        createdAt: Date.now(),
        event: {
          type: 'tool_end',
          label: isError ? '工具执行失败' : '工具执行完成',
          icon: isError ? '❌' : '✅'
        }
      }
      this.blocks.set(eventBlock.id, eventBlock)

      yield { type: 'block', block: eventBlock }
    }
  }

  /**
   * 处理错误事件
   */
  private async *handleError(event: ClaudeStreamEvent): AsyncGenerator<OrchestratorOutput> {
    const errorBlock: AgentEventBlock = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kind: 'agent-event',
      createdAt: Date.now(),
      event: {
        type: 'error',
        label: '错误',
        icon: '❌',
        metadata: { message: event.message }
      }
    }

    this.blocks.set(errorBlock.id, errorBlock)
    yield { type: 'block', block: errorBlock }
  }

  /**
   * 完成当前未完成的块
   */
  private finalizeCurrentBlocks(): void {
    if (this.currentReasoningBlock) {
      this.currentReasoningBlock.state = 'done'
      this.currentReasoningBlock.updatedAt = Date.now()
      this.blocks.set(this.currentReasoningBlock.id, this.currentReasoningBlock)
      this.currentReasoningBlock = null
    }

    if (this.currentAgentBlock) {
      this.currentAgentBlock.updatedAt = Date.now()
      this.blocks.set(this.currentAgentBlock.id, this.currentAgentBlock)
      this.currentAgentBlock = null
    }

    this.pendingToolCall = null
  }

  /**
   * 添加用户消息
   */
  addUserMessage(text: string, localId?: string): UserTextBlock {
    const block: UserTextBlock = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      kind: 'user-text',
      createdAt: Date.now(),
      text,
      status: 'sent',
      localId
    }

    this.blocks.set(block.id, block)
    return block
  }

  /**
   * 更新工具调用状态
   */
  updateToolCall(
    blockId: string,
    state: 'running' | 'success' | 'error',
    result?: unknown,
    error?: string
  ): ToolCallBlock | null {
    const block = this.blocks.get(blockId)
    if (block && block.kind === 'tool-call') {
      block.tool.state = state
      block.tool.result = result
      block.error = error
      block.updatedAt = Date.now()
      return block
    }
    return null
  }

  /**
   * 获取所有块
   */
  getAllBlocks(): ChatBlock[] {
    return Array.from(this.blocks.values())
  }

  /**
   * 获取单个块
   */
  getBlock(blockId: string): ChatBlock | undefined {
    return this.blocks.get(blockId)
  }

  /**
   * 清空所有块
   */
  clear(): void {
    this.blocks.clear()
    this.currentAgentBlock = null
    this.currentReasoningBlock = null
    this.pendingToolCall = null
    this.isThinking = false
  }

  /**
   * 获取当前思考状态
   */
  isCurrentlyThinking(): boolean {
    return this.isThinking
  }
}

// 导出辅助函数（从 types/chat.ts 重新导出）
export { formatToolDisplayName }
