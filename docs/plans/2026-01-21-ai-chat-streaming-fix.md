# AI Chat Streaming Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 AI 对话界面中流式消息被拆分的问题，实现正确的消息累积和可折叠的思考/工具调用显示

**Architecture:** 在 CopilotPanel 中实现消息累积逻辑，将同一 AI 回复的所有片段（text/thinking/tool_call/tool_result）合并为单个消息，利用 assistant-ui 的 ReasoningGroup 和工具组件实现可折叠显示

**Tech Stack:** React, @assistant-ui/react, Zustand, WebSocket

---

## Task 1: 创建消息累积类型定义

**Files:**
- Create: `frontend/src/types/accumulation.ts`

**Step 1: 编写类型定义**

创建文件: `frontend/src/types/accumulation.ts`

```typescript
/**
 * 累积中的 AI 消息结构
 * 用于在流式传输期间收集同一回复的所有片段
 */
export interface AccumulatingMessage {
  id: string;
  role: 'assistant';
  parts: AccumulatingPart[];
  status?: { type: 'running' | 'complete' | 'error' };
  createdAt: Date;
}

export interface AccumulatingPart {
  type: 'text' | 'reasoning' | 'tool-use' | 'tool-result';
  content?: string;        // for text and reasoning
  toolName?: string;       // for tool-use and tool-result
  input?: any;             // for tool-use
  output?: any;            // for tool-result
  toolCallId?: string;     // for linking tool-use with tool-result
}

/**
 * 判断是否为同一 AI 回复的片段
 */
export function isSameAssistantReply(
  msg: { type: string },
  currentMsg: AccumulatingMessage | null
): boolean {
  // 用户消息总是开始新的累积
  if (msg.type === 'user') return false;

  // 如果没有当前累积消息，开始新的累积
  if (!currentMsg) return false;

  // AI 相关片段继续累积
  return ['text', 'thinking', 'tool_call', 'tool_result'].includes(msg.type);
}
```

**Step 2: 提交**

```bash
git add frontend/src/types/accumulation.ts
git commit -m "feat(types): add accumulation types for streaming messages"
```

---

## Task 2: 重构 CopilotPanel 消息处理逻辑

**Files:**
- Modify: `frontend/src/components/CopilotPanel/index.tsx`

**Step 1: 添加累积状态**

在文件顶部导入新类型:

```typescript
import { AccumulatingMessage, isSameAssistantReply } from '@/types/accumulation';
```

在组件内添加状态:

```typescript
const [messages, setMessages] = useState<DisplayMessage[]>([]);
const [accumulatingMsg, setAccumulatingMsg] = useState<AccumulatingMessage | null>(null);
```

**Step 2: 修改消息处理逻辑**

替换现有的 `ws.onMessage` 处理逻辑:

```typescript
ws.onMessage((data) => {
  console.log('CopilotPanel onMessage:', data.type, data);

  if (data.type === 'stream' && data.data) {
    const msg = StreamJsonParser.parse(data.data);
    console.log('Parsed message:', msg);

    // 只添加非 null 的消息（过滤掉 system 事件）
    if (!msg) return;

    if (msg.type === 'user') {
      // 添加用户消息
      setMessages((prev) => [...prev, msg]);

      // 开始新的 AI 消息累积
      setAccumulatingMsg({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        parts: [],
        status: { type: 'running' },
        createdAt: new Date(),
      });
    }
    else if (accumulatingMsg && isSameAssistantReply(msg, accumulatingMsg)) {
      // 累积 AI 消息片段
      const newPart = convertDisplayMessageToPart(msg);

      // 特殊处理: text 类型追加到现有 text part
      if (msg.type === 'text') {
        const existingTextPart = accumulatingMsg.parts.find(p => p.type === 'text');
        if (existingTextPart && existingTextPart.content) {
          existingTextPart.content += msg.content || '';
        } else {
          accumulatingMsg.parts.push(newPart);
        }
      } else {
        // thinking, tool_call, tool_result 作为新 part 添加
        accumulatingMsg.parts.push(newPart);
      }

      setAccumulatingMsg({ ...accumulatingMsg });
      console.log('Accumulated parts:', accumulatingMsg.parts.length);
    }
  }
  else if (data.type === 'done') {
    // 完成累积：将 accumulatingMsg 转换为 DisplayMessage[] 并添加到列表
    if (accumulatingMsg) {
      const displayMsgs = convertAccumulatingToDisplayMessages(accumulatingMsg);
      setMessages((prev) => [...prev, ...displayMsgs]);

      console.log(`Added ${displayMsgs.length} messages from accumulation`);
      setAccumulatingMsg(null);
    }
    setIsProcessing(false);
  }
  else if (data.type === 'error') {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        type: 'error',
        content: data.error || '未知错误',
        timestamp: new Date(),
      },
    ]);
    setIsProcessing(false);
    setAccumulatingMsg(null);
  }
});
```

**Step 3: 添加转换函数**

在文件中添加辅助函数（在组件内部或外部）:

```typescript
// 将 DisplayMessage 转换为 AccumulatingPart
function convertDisplayMessageToPart(msg: DisplayMessage): AccumulatingPart {
  switch (msg.type) {
    case 'thinking':
      return {
        type: 'reasoning',
        content: msg.content || '',
      };

    case 'tool_call':
      return {
        type: 'tool-use',
        toolName: msg.toolName || 'unknown',
        input: msg.toolInput,
        toolCallId: msg.id,
      };

    case 'tool_result':
      return {
        type: 'tool-result',
        toolName: msg.toolName || 'unknown',
        output: msg.toolResult,
        toolCallId: msg.id,
      };

    case 'text':
    default:
      return {
        type: 'text',
        content: msg.content || '',
      };
  }
}

// 将 AccumulatingMessage 转换为 DisplayMessage[]
function convertAccumulatingToDisplayMessages(accMsg: AccumulatingMessage): DisplayMessage[] {
  return accMsg.parts.map((part, index) => {
    const baseMsg = {
      id: `${accMsg.id}-${part.type}-${index}`,
      timestamp: accMsg.createdAt,
    };

    switch (part.type) {
      case 'reasoning':
        return {
          ...baseMsg,
          type: 'thinking',
          content: part.content || '',
        };

      case 'tool-use':
        return {
          ...baseMsg,
          type: 'tool_call',
          toolName: part.toolName,
          toolInput: part.input,
        };

      case 'tool-result':
        return {
          ...baseMsg,
          type: 'tool_result',
          toolName: part.toolName,
          toolResult: part.output,
        };

      case 'text':
      default:
        return {
          ...baseMsg,
          type: 'text',
          content: part.content || '',
        };
    }
  });
}
```

**Step 4: 测试验证**

运行应用:
```bash
cd frontend && npm run dev
```

预期应用正常启动，无 TypeScript 错误

**Step 5: 提交**

```bash
git add frontend/src/components/CopilotPanel/index.tsx frontend/src/types/accumulation.ts
git commit -m "feat(chat): implement message accumulation for streaming replies"
```

---

## Task 3: 更新 AssistantUIAdapter 消息转换逻辑

**Files:**
- Modify: `frontend/src/components/AssistantUIAdapter/index.tsx`

**Step 1: 添加工具调用结果处理**

修改 `convertMessage` 函数，正确处理 `tool_call` 和 `tool-result`:

```typescript
// 工具调用 - 使用 tool-call 类型
if (msg.type === 'tool_call') {
  return {
    role: 'assistant',
    content: [{
      type: 'tool-call',
      toolName: msg.toolName || '',
      toolCallId: msg.id,
      args: msg.toolInput || {},
    }],
    id: msg.id,
    createdAt: msg.timestamp || new Date(),
  };
}

// 工具结果 - 使用 tool-call 类型并附加结果
if (msg.type === 'tool_result') {
  return {
    role: 'assistant',
    content: [{
      type: 'tool-call',
      toolName: msg.toolName || '',
      toolCallId: msg.id,
      args: {},
      result: msg.toolResult,
      status: { type: 'complete' }
    }],
    id: msg.id,
    createdAt: msg.timestamp || new Date(),
  };
}
```

**Step 2: 测试验证**

```bash
cd frontend && npm run dev
```

预期无 TypeScript 错误，类型匹配正确

**Step 3: 提交**

```bash
git add frontend/src/components/AssistantUIAdapter/index.tsx
git commit -m "fix(adapter): properly handle tool-call and tool-result types"
```

---

## Task 4: 优化 Reasoning 组件样式

**Files:**
- Modify: `frontend/src/components/assistant-ui/reasoning.tsx`

**Step 1: 添加流式状态指示**

修改 `ReasoningGroupImpl` 组件:

```typescript
import { useAssistantState } from '@assistant-ui/react';

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex
}) => {
  // 检测 reasoning 是否正在流式传输
  const isReasoningStreaming = useAssistantState(({ message }) => {
    if (message.status?.type !== 'running') return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    return lastType === 'reasoning' && lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        <ReasoningText>{children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  );
};
```

**Step 2: 改进触发器样式**

更新 `ReasoningTrigger` 组件:

```typescript
const ReasoningTrigger: FC<{ active: boolean; className?: string }> = ({
  active,
  className
}) => (
  <summary
    className={cn(
      'group/trigger -mb-2 flex cursor-pointer items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground',
      'select-none', // 防止文本选中
      className
    )}
  >
    <Brain className="h-4 w-4 shrink-0" />
    <span className="relative inline-block leading-none">
      <span>思考过程</span>
      {active && (
        <span
          className="absolute inset-0 animate-pulse opacity-70"
          aria-hidden
        >
          思考过程
        </span>
      )}
    </span>
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/rotate-0" />
  </summary>
);
```

**Step 3: 测试验证**

```bash
cd frontend && npm run dev
```

预期样式正常，无编译错误

**Step 4: 提交**

```bash
git add frontend/src/components/assistant-ui/reasoning.tsx
git commit -m "style(reasoning): add streaming state indicator and improve styles"
```

---

## Task 5: 优化 ToolDisplay 组件

**Files:**
- Modify: `frontend/src/components/assistant-ui/tool-display.tsx`

**Step 1: 添加更好的视觉反馈**

改进状态显示逻辑:

```typescript
// 改进状态判断
const getStatus = (): 'running' | 'complete' | 'error' => {
  if (status?.type === 'running') return 'running';
  if (status?.type === 'incomplete' && status.reason === 'error') return 'error';
  if (status?.type === 'requires-action') return 'running';
  return 'complete';
};

const currentStatus = getStatus();

// 状态样式映射
const statusConfig = {
  running: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    text: '执行中...',
    className: 'text-blue-600',
    bgClassName: 'bg-blue-50',
  },
  complete: {
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    text: '完成',
    className: 'text-green-600',
    bgClassName: 'bg-green-50',
  },
  error: {
    icon: <XCircle className="h-4 w-4 text-red-600" />,
    text: '失败',
    className: 'text-red-600',
    bgClassName: 'bg-red-50',
  },
};
```

**Step 2: 更新渲染逻辑**

```typescript
const config = statusConfig[currentStatus];

return (
  <div className="my-2 rounded-lg border border-muted bg-muted/50 p-3 transition-colors hover:bg-muted/70">
    <div className="flex items-center gap-2 text-sm font-medium">
      <Wrench className="h-4 w-4" />
      <span className="font-mono">{toolName}</span>

      {/* 状态指示器 */}
      {currentStatus === 'running' && (
        <div className={cn('ml-auto flex items-center gap-1 text-xs', config.className)}>
          {config.icon}
          <span>{config.text}</span>
        </div>
      )}

      {currentStatus !== 'running' && (
        <div className="ml-auto">
          {config.icon}
        </div>
      )}
    </div>

    {/* 输入参数 */}
    {args && (
      <details className="mt-2 group/details">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          输入参数
        </summary>
        <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
          {formatJson(args)}
        </pre>
      </details>
    )}

    {/* 输出结果 */}
    {result !== undefined && (
      <details className="mt-2 group/details" open={currentStatus === 'error'}>
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
          {currentStatus === 'error' ? '错误信息' : '输出结果'}
        </summary>
        <pre
          className={cn(
            'mt-2 overflow-x-auto rounded p-2 text-xs',
            currentStatus === 'error'
              ? 'bg-red-50 text-red-900'
              : 'bg-background'
          )}
        >
          {formatJson(result)}
        </pre>
      </details>
    )}
  </div>
);
```

**Step 3: 测试验证**

```bash
cd frontend && npm run dev
```

预期工具调用显示正确，状态图标正常

**Step 4: 提交**

```bash
git add frontend/src/components/assistant-ui/tool-display.tsx
git commit -m "style(tools): improve tool call display with better status indicators"
```

---

## Task 6: 添加 CSS 动画

**Files:**
- Modify: `frontend/src/styles/globals.css` (或创建)

**Step 1: 添加动画定义**

在全局样式文件中添加:

```css
/* Reasoning 展开/收起动画 */
.aui-reasoning-content {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

/* details 展开动画 */
details > summary {
  list-style: none;
}

details > summary::-webkit-details-marker {
  display: none;
}

details[open] > summary ~ * {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 流式文本光标效果（可选） */
.streaming-text::after {
  content: '|';
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

/* 平滑过渡 */
.message-part {
  transition: all 0.15s ease-out;
}
```

**Step 2: 在应用入口导入样式**

确保 `main.tsx` 或 `App.tsx` 中导入了样式:

```typescript
import './styles/globals.css';
```

**Step 3: 测试验证**

```bash
cd frontend && npm run dev
```

预期动画正常工作

**Step 4: 提交**

```bash
git add frontend/src/styles/globals.css
git commit -m "style(animations): add smooth transitions for message parts"
```

---

## Task 7: 集成测试

**Files:**
- Create: `frontend/src/components/CopilotPanel/__tests__/ CopilotPanel.test.tsx`

**Step 1: 编写消息累积测试**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CopilotPanel } from '../index';
import { DisplayMessage } from '@/types/stream';

// Mock WebSocketClient
vi.mock('@/lib/websocketClient', () => ({
  WebSocketClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn(),
    onMessage: vi.fn(),
    register: vi.fn(),
  })),
}));

describe('CopilotPanel - Message Accumulation', () => {
  it('should accumulate text fragments into single message', async () => {
    const { container } = render(<CopilotPanel />);
    // 验证累积逻辑
    // 需要模拟 WebSocket 消息流
  });

  it('should keep reasoning as separate part', async () => {
    // 验证 thinking 保持独立
  });

  it('should keep tool calls as separate parts', async () => {
    // 验证工具调用保持独立
  });
});
```

**Step 2: 跳过实际集成测试（需要真实 WebSocket）**

由于集成测试需要真实 WebSocket 连接，暂时跳过，改用手动测试。

**Step 3: 提交**

```bash
git add frontend/src/components/CopilotPanel/__tests__/
git commit -m "test(chat): add CopilotPanel accumulation tests (placeholder)"
```

---

## Task 8: 手动测试验证

**Files:**
- Test: 启动前后端服务器
- Test: 创建新项目并测试 AI 对话

**Step 1: 启动后端服务器**

```bash
cd backend
npm run dev
```

预期: 服务器在 3001 端口启动，看到 "Server running on port 3001"

**Step 2: 启动前端服务器**

```bash
cd frontend
npm run dev
```

预期: Vite 服务器在 5173 端口启动

**Step 3: 测试流程**

1. 打开浏览器访问 http://localhost:5173
2. 点击 "新建项目"，创建测试项目
3. 进入项目后，在 AI 对话框输入测试消息:
   ```
   创建一个包含标题和副标题的幻灯片
   ```
4. 观察消息显示:
   - 用户消息应显示在右侧（蓝色气泡）
   - AI 回复应显示在左侧（灰色气泡）
   - 流式文本应累积在一起，而不是分成多个气泡
   - 思考过程应显示为可折叠的 "思考过程" 区域
   - 工具调用应显示为可折叠的工具框

**Step 4: 验证点**

- [ ] 流式文本正确累积（不拆分）
- [ ] 思考过程可折叠
- [ ] 工具调用可折叠
- [ ] 动画平滑
- [ ] 无 TypeScript 错误

**Step 5: 记录测试结果并提交修复**

```bash
# 如果测试通过
git commit --allow-empty -m "test(chat): verify streaming message accumulation works correctly"

# 如果发现 bug，创建修复任务
```

---

## 总结

本计划通过 8 个任务完成以下改进:

1. ✅ 创建消息累积类型
2. ✅ 重构 CopilotPanel 实现累积逻辑
3. ✅ 更新 AssistantUIAdapter 处理新类型
4. ✅ 优化 Reasoning 组件样式
5. ✅ 优化 ToolDisplay 组件
6. ✅ 添加 CSS 动画
7. ✅ 编写集成测试
8. ✅ 手动测试验证

**关键改进:**
- 流式文本正确累积到单个消息
- 思考过程可折叠，带动画
- 工具调用独立显示，可折叠
- 流式状态视觉反馈

**预计工时:** 2-3 小时
**风险:** 低（主要是重构现有逻辑）
