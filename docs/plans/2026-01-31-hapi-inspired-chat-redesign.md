# HAPI 风格聊天界面重设计方案

**日期**: 2026-01-31
**状态**: 设计完成，待实施
**参考**: [HAPI 项目](https://github.com/tiann/hapi)

---

## 概述

本方案借鉴 [HAPI](https://github.com/tiann/hapi) 项目的前端实现，重构聊天界面，实现：
- 流畅的流式响应效果
- 结构化的消息块显示（ChatBlock）
- 可交互的权限审批
- 类似 Claude Code 的终端体验

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端架构                     │
│                                                                  │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │   CopilotPanel      │    │   useExternalStoreRuntime        │ │
│  │                     │    │   (assistant-ui)                 │ │
│  │  ┌───────────────┐  │    │  - isRunning: thinking          │ │
│  │  │  ThreadPrimitive│  │←──│  - messages: ChatBlock[]        │ │
│  │  │   (assistant-ui)│  │    │  - onNew: 发送消息             │ │
│  │  └───────────────┘  │    │  - onCancel: 中止生成            │ │
│  │       ↓             │    └─────────────────────────────────┘ │
│  │  ┌───────────────┐  │                  ↑                    │
│  │  │  ChatBlock[]   │  │                  │                   │ │
│  │  │    渲染        │  │         ┌───────────────┐            │
│  │  └───────────────┘  │         │ MessageReducer│            │
│  └─────────────────────┘         │   WebSocket →  │            │
│                                  │   ChatBlock    │            │
│                                  └───────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                           ↑
                           │ WebSocket (ChatBlock)
                           │
┌─────────────────────────────────────────────────────────────────┐
│                         后端架构                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            MessageOrchestrator                          │    │
│  │  - 接收 Claude AI Stream                                │    │
│  │  - 聚合相关消息                                         │    │
│  │  - 生成 ChatBlock 格式                                  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │            ChatBlockEmitter                             │    │
│  │  - 流式推送 ChatBlock                                   │    │
│  │  - 支持增量更新 (block.update)                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 数据结构

### ChatBlock 类型

```typescript
export type ChatBlock =
  | UserTextBlock
  | AgentTextBlock
  | AgentReasoningBlock
  | AgentEventBlock
  | ToolCallBlock
  | CliOutputBlock
  | PermissionRequestBlock

interface BaseBlock {
  id: string
  createdAt: number
  updatedAt?: number
}

// 用户消息
interface UserTextBlock extends BaseBlock {
  kind: 'user-text'
  text: string
  attachments?: AttachmentMetadata[]
  status?: 'pending' | 'sent' | 'error'
  localId?: string
}

// AI 文本响应
interface AgentTextBlock extends BaseBlock {
  kind: 'agent-text'
  text: string
  format?: 'markdown' | 'code'
}

// AI 思考过程
interface AgentReasoningBlock extends BaseBlock {
  kind: 'agent-reasoning'
  text: string
  state: 'thinking' | 'done'
}

// 工具调用
interface ToolCallBlock extends BaseBlock {
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

// 权限请求（可交互）
interface PermissionRequestBlock extends BaseBlock {
  kind: 'permission-request'
  requestId: string
  tool: string
  arguments: Record<string, unknown>
  state: 'pending' | 'approved' | 'denied'
}
```

### WebSocket 消息格式

```typescript
export type WebSocketMessage =
  | { type: 'chat.block'; block: ChatBlock }
  | { type: 'chat.block.update'; blockId: string; updates: Partial<ChatBlock> }
  | { type: 'chat.session.state'; state: SessionState }
  | { type: 'chat.error'; error: string }

interface SessionState {
  sessionId: string
  thinking: boolean
  controlledByUser: boolean
  activeTools: string[]
}
```

---

## 前端组件结构

```
frontend/src/components/assistant-ui/
├── ChatThread.tsx              # 主线程容器
├── ChatComposer.tsx            # 输入框
├── ChatBlock/
│   ├── index.tsx               # ChatBlock 路由渲染
│   ├── UserTextBlock.tsx       # 用户消息
│   ├── AgentTextBlock.tsx      # AI 文本响应
│   ├── AgentReasoningBlock.tsx # 思考过程（可折叠）
│   ├── AgentEventBlock.tsx     # 事件指示器
│   ├── ToolCallBlock.tsx       # 工具调用卡片
│   └── PermissionRequestBlock.tsx  # 权限请求（可交互）
└── hooks/
    ├── useChatRuntime.ts       # assistant-ui 运行时适配
    ├── useChatBlocks.ts        # ChatBlock 状态管理
    └── useWebSocketChat.ts     # WebSocket 连接管理
```

### 关键组件

**AgentReasoningBlock** - 可折叠的思考过程显示
**ToolCallBlock** - 工具调用卡片，显示输入/输出和状态
**PermissionRequestBlock** - 内联权限审批交互

---

## 后端核心模块

### MessageOrchestrator

```typescript
// backend/src/services/MessageOrchestrator.ts

export class MessageOrchestrator {
  private blocks = new Map<string, ChatBlock>()
  private currentAgentBlock: AgentTextBlock | null = null
  private currentReasoningBlock: AgentReasoningBlock | null = null

  *processStream(stream: AsyncIterable<ClaudeStreamEvent>): Generator<ChatBlock> {
    for await (const event of stream) {
      switch (event.type) {
        case 'content_block_delta':
          yield* this.handleContentBlockDelta(event)
          break
        case 'tool_use':
          yield* this.handleToolUse(event)
          break
      }
    }
  }

  // 增量更新 - 减少传输数据量
  private *handleContentBlockDelta(event: ContentBlockDeltaEvent): Generator<ChatBlock> {
    const block = this.currentAgentBlock || this.currentReasoningBlock
    if (block) {
      block.text += event.delta?.text || ''
      block.updatedAt = Date.now()
      yield {
        type: 'chat.block.update',
        blockId: block.id,
        updates: { text: block.text }
      }
    }
  }
}
```

### WebSocketChatHandler

```typescript
// backend/src/websocket/chatHandler.ts

export class WebSocketChatHandler {
  private orchestrator = new MessageOrchestrator()

  async handleConnection(ws: WebSocket) {
    ws.on('message', async (data: Buffer) => {
      const message = JSON.parse(data.toString())

      switch (message.type) {
        case 'chat.message.send':
          await this.handleMessageSend(ws, message.text)
          break
        case 'chat.permission.approve':
          await this.handlePermissionApprove(ws, message.requestId)
          break
        case 'chat.abort':
          await this.handleAbort(ws)
          break
      }
    })
  }

  private async handleMessageSend(ws: WebSocket, text: string) {
    // 1. 创建用户消息块
    // 2. 更新会话状态 (thinking: true)
    // 3. 调用 Claude AI
    // 4. 处理流式响应 (orchestrator.processStream)
    // 5. 完成 (thinking: false)
  }
}
```

---

## 运行时适配器

### useChatRuntime

```typescript
// frontend/src/hooks/useChatRuntime.ts

export function useChatRuntime() {
  const { blocks, isThinking, sendMessage, abortGeneration } = useWebSocketChat()

  const messageConverter = useCallback((block: ChatBlock) => {
    return convertBlockToThreadMessage(block)
  }, [])

  const convertedMessages = useExternalMessageConverter<ChatBlock>({
    callback: messageConverter,
    messages: blocks,
    isRunning: isThinking
  })

  const adapter = useMemo(() => ({
    isDisabled: !isConnected,
    isRunning: isThinking,
    messages: convertedMessages,
    onNew: handleSendMessage,
    onCancel: handleAbort,
    unstable_capabilities: { copy: true }
  }), [/* deps */])

  return useExternalStoreRuntime(adapter)
}
```

---

## 实施计划

### 阶段一：后端基础设施（第1-2周）

| 任务 | 文件 | 优先级 |
|------|------|--------|
| 定义 ChatBlock 类型 | `backend/src/types/chat.ts` | P0 |
| 创建 MessageOrchestrator | `backend/src/services/MessageOrchestrator.ts` | P0 |
| WebSocket 路由 | `backend/src/websocket/chatHandler.ts` | P0 |
| Claude API 集成 | `backend/src/services/claude.ts` | P0 |
| 单元测试 | `backend/src/websocket/__tests__/` | P1 |

### 阶段二：前端核心组件（第2-3周）

| 任务 | 文件 | 优先级 |
|------|------|--------|
| 定义 ChatBlock 类型 | `frontend/src/types/chat.ts` | P0 |
| useWebSocketChat Hook | `frontend/src/hooks/useWebSocketChat.ts` | P0 |
| useChatRuntime Hook | `frontend/src/hooks/useChatRuntime.ts` | P0 |
| ChatBlock 组件 | `frontend/src/components/ChatBlock/` | P0 |
| CopilotPanel 主组件 | `frontend/src/components/CopilotPanel.tsx` | P0 |

### 阶段三：交互功能（第3-4周）

| 任务 | 优先级 |
|------|--------|
| 权限审批交互 | P0 |
| 消息重试 | P1 |
| 中止生成 | P0 |
| 文件上传 | P1 |
| 语音输入 | P2 |

### 阶段四：优化与测试（第4周）

| 任务 | 优先级 |
|------|--------|
| 消息虚拟滚动 | P1 |
| 增量更新优化 | P1 |
| 主题适配 | P2 |
| E2E 测试 | P1 |

---

## 预期效果

- **流式显示**: 平滑的文本、thinking、工具调用流式渲染
- **消息组织**: 相关消息组织成可折叠的块
- **交互控制**: 实时权限审批、中止生成、重试消息
- **用户体验**: 类似 HAPI/Claude Code 的终端体验

---

## 参考资源

- [HAPI GitHub](https://github.com/tiann/hapi)
- [assistant-ui 文档](https://assistant-ui.com/)
- [Claude Code 官方](https://claude.ai/code)
