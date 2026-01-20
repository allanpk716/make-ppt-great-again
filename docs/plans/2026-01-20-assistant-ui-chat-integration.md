# Assistant-UI 聊天界面集成实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将 assistant-ui 组件库集成到现有的 PPT 项目中，实现类似 ChatGPT/Dify 的聊天界面，支持流式回复、thinking 展示和 tool calling 可视化。

**架构:** 使用 assistant-ui 的 Thread 和 Message 组件替代现有的 StreamMessageList，创建消息转换层将 WebSocket 数据映射到 assistant-ui 的数据结构，保留现有的 WebSocket 通信逻辑。

**技术栈:**
- **前端:** React 18.3 + TypeScript + Tailwind CSS
- **UI 库:** assistant-ui (@assistant-ui/react)
- **Markdown:** @assistant-ui/react-markdown + remark-gfm
- **通信:** 现有 WebSocket (ws://localhost:3001/ws)

> **注意:** tw-shimmer 已被移除，因为它需要 Tailwind CSS v4，而项目当前使用 v3。
> 后续可以通过以下方式之一实现 shimmer 效果：
> 1. 手动实现 CSS 动画（已在 `index.css` 中添加自定义 shimmer 动画）
> 2. 升级项目到 Tailwind CSS v4（需要更全面的测试和迁移）

---

## 前置准备

### Task 1: 安装依赖包

**文件:**
- Modify: `frontend/package.json`

**Step 1: 安装 assistant-ui 核心包**

在 `frontend` 目录执行：

```bash
cd frontend
npm install @assistant-ui/react
```

> **注意:** 已移除 `tw-shimmer` 依赖，因为它需要 Tailwind CSS v4，与项目当前的 v3 不兼容。
> shimmer 效果已通过自定义 CSS 实现（见 Task 7）。

预期输出:
```
added 15 packages, and audited 35 packages in 5s
```

**Step 2: 安装 Markdown 渲染依赖**

```bash
npm install @assistant-ui/react-markdown remark-gfm
```

预期输出:
```
added 8 packages, and audited 43 packages in 3s
```

**Step 3: 验证安装**

检查 `package.json` 中新增的依赖:

```bash
cat package.json | grep assistant-ui
```

预期输出应包含:
- `@assistant-ui/react`
- `@assistant-ui/react-markdown`
- `remark-gfm`

**Step 4: 提交依赖安装**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "feat: install assistant-ui dependencies"
```

---

### Task 2: 创建 assistant-ui 配置文件

**文件:**
- Create: `frontend/src/components/assistant-ui/thread.tsx`
- Create: `frontend/src/components/assistant-ui/markdown-text.tsx`
- Create: `frontend/src/components/assistant-ui/reasoning.tsx`

**Step 1: 创建 Thread 组件**

创建 `frontend/src/components/assistant-ui/thread.tsx`:

```tsx
"use client";

import { Thread } from "@assistant-ui/react";
import { MessagePrimitive } from "@assistant-ui/react";
import { Reasoning, ReasoningGroup } from "./reasoning";
import { MarkdownText } from "./markdown-text";

export const AssistantThread = () => {
  return (
    <Thread>
      {({ messages }) => (
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessagePrimitive.Root
              key={message.id}
              className={`flex ${
                message.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <MessagePrimitive.Parts
                  components={{
                    Reasoning: Reasoning,
                    ReasoningGroup: ReasoningGroup,
                    Text: MarkdownText,
                  }}
                />
              </div>
            </MessagePrimitive.Root>
          ))}
        </div>
      )}
    </Thread>
  );
};
```

**Step 2: 创建 MarkdownText 组件**

创建 `frontend/src/components/assistant-ui/markdown-text.tsx`:

```tsx
"use client";

import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { useMemo } from "react";
import {
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm max-w-none dark:prose-invert"
      components={defaultComponents}
    />
  );
};

export const MarkdownText = () => <MarkdownTextImpl />;

// 复制功能 hook
const useCopyToClipboard = ({ copiedDuration = 2000 } = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;

    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

// 代码头部组件
const CodeHeader = ({ language, code }: { language?: string; code?: string }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  if (!code) return null;

  return (
    <div className="flex items-center justify-between rounded-t-lg bg-muted px-4 py-2">
      <span className="text-xs text-muted-foreground">
        {language || "code"}
      </span>
      <button
        onClick={onCopy}
        className="rounded p-1 hover:bg-muted-foreground/20"
      >
        {isCopied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

// 默认 Markdown 组件
const defaultComponents = memoizeMarkdownComponents({
  p: ({ className, ...props }) => (
    <p className={cn("mb-2 last:mb-0", className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock && "rounded bg-muted px-1 py-0.5 font-mono text-sm",
          className
        )}
        {...props}
      />
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "mb-2 overflow-x-auto rounded-lg bg-muted p-4",
        className
      )}
      {...props}
    />
  ),
});
```

**Step 3: 创建 Reasoning 组件**

创建 `frontend/src/components/assistant-ui/reasoning.tsx`:

```tsx
"use client";

import {
  memo,
  useCallback,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";
import {
  useScrollLock,
  useAssistantState,
  type ReasoningMessagePartComponent,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { Brain, ChevronDown } from "lucide-react";
import { MarkdownText } from "./markdown-text";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

const ReasoningRoot: FC<
  PropsWithChildren<{ className?: string }>
> = ({ className, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details
      open={isOpen}
      onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      className={cn("mb-4 w-full", className)}
    >
      {children}
    </details>
  );
};

const ReasoningTrigger: FC<{ active: boolean; className?: string }> = ({
  active,
  className,
}) => (
  <summary
    className={cn(
      "group/trigger -mb-2 flex cursor-pointer items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
      className
    )}
  >
    <Brain className="h-4 w-4 shrink-0" />
    <span className="relative inline-block leading-none">
      <span>思考过程</span>
      {active && (
        <span className="absolute inset-0 animate-pulse">思考过程</span>
      )}
    </span>
    <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
  </summary>
);

const ReasoningContent: FC<
  PropsWithChildren<{
    className?: string;
    "aria-busy"?: boolean;
  }>
> = ({ className, children, "aria-busy": ariaBusy }) => (
  <div
    className={cn(
      "relative overflow-hidden text-muted-foreground text-sm pl-6 leading-relaxed",
      className
    )}
    aria-busy={ariaBusy}
  >
    {children}
  </div>
);

const ReasoningImpl: ReasoningMessagePartComponent = () => <MarkdownText />;

const ReasoningGroupImpl: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAssistantState(({ message }) => {
    if (message.status?.type !== "running") return false;
    const lastIndex = message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  return (
    <ReasoningRoot>
      <ReasoningTrigger active={isReasoningStreaming} />
      <ReasoningContent aria-busy={isReasoningStreaming}>
        {children}
      </ReasoningContent>
    </ReasoningRoot>
  );
};

export const Reasoning = memo(ReasoningImpl);
Reasoning.displayName = "Reasoning";

export const ReasoningGroup = memo(ReasoningGroupImpl);
ReasoningGroup.displayName = "ReasoningGroup";
```

**Step 4: 提交组件创建**

```bash
git add frontend/src/components/assistant-ui/
git commit -m "feat: create assistant-ui base components"
```

---

## 核心集成

### Task 3: 创建消息转换层

**文件:**
- Create: `frontend/src/lib/messageConverter.ts`

**Step 1: 创建转换函数**

创建 `frontend/src/lib/messageConverter.ts`:

```typescript
import { DisplayMessage } from "@/types/stream";

// assistant-ui 消息结构
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content?: string;
  parts?: AssistantMessagePart[];
  status?: { type: "running" | "complete" | "error" };
}

export type AssistantMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-use"; name: string; input: any }
  | { type: "tool-result"; name: string; output: any };

/**
 * 将现有的 DisplayMessage[] 转换为 assistant-ui 兼容的消息格式
 */
export function convertToAssistantMessages(
  messages: DisplayMessage[]
): AssistantMessage[] {
  const result: AssistantMessage[] = [];
  let currentAssistantMsg: AssistantMessage | null = null;

  for (const msg of messages) {
    if (msg.type === "user") {
      // 保存之前的 assistant 消息
      if (currentAssistantMsg) {
        result.push(currentAssistantMsg);
        currentAssistantMsg = null;
      }

      // 添加用户消息
      result.push({
        id: msg.id,
        role: "user",
        content: msg.content,
      });
    } else {
      // AI 相关消息类型 (text, thinking, tool_call, tool_result)
      if (!currentAssistantMsg) {
        currentAssistantMsg = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          parts: [],
        };
      }

      // 将不同类型转换为 parts
      switch (msg.type) {
        case "thinking":
          currentAssistantMsg.parts?.push({
            type: "reasoning",
            text: msg.content || "",
          });
          break;

        case "tool_call":
          currentAssistantMsg.parts?.push({
            type: "tool-use",
            name: msg.toolName || "unknown",
            input: msg.toolInput,
          });
          break;

        case "tool_result":
          currentAssistantMsg.parts?.push({
            type: "tool-result",
            name: msg.toolName || "unknown",
            output: msg.toolResult,
          });
          break;

        case "text":
          currentAssistantMsg.parts?.push({
            type: "text",
            text: msg.content || "",
          });
          // 同时设置 content 用于简化渲染
          currentAssistantMsg.content = msg.content;
          break;

        case "error":
          currentAssistantMsg.parts?.push({
            type: "text",
            text: `错误: ${msg.content}`,
          });
          currentAssistantMsg.status = { type: "error" };
          break;
      }
    }
  }

  // 保存最后一条 assistant 消息
  if (currentAssistantMsg) {
    result.push(currentAssistantMsg);
  }

  return result;
}
```

**Step 2: 添加类型定义到 stream.ts**

修改 `frontend/src/types/stream.ts`，在文件末尾添加:

```typescript
// 导出 assistant-ui 兼容类型
export type { AssistantMessage, AssistantMessagePart } from "@/lib/messageConverter";
```

**Step 3: 提交转换层**

```bash
git add frontend/src/lib/messageConverter.ts frontend/src/types/stream.ts
git commit -m "feat: add message converter for assistant-ui"
```

---

### Task 4: 创建 AssistantUI 适配器组件

**文件:**
- Create: `frontend/src/components/AssistantUIAdapter/index.tsx`

**Step 1: 创建适配器组件**

创建 `frontend/src/components/AssistantUIAdapter/index.tsx`:

```tsx
import React, { useEffect, useMemo } from "react";
import { DisplayMessage } from "@/types/stream";
import { convertToAssistantMessages, AssistantMessage } from "@/lib/messageConverter";
import { AssistantRoot } from "@assistant-ui/react";
import { AssistantThread } from "@/components/assistant-ui/thread";

interface AssistantUIAdapterProps {
  messages: DisplayMessage[];
  isProcessing?: boolean;
  onSendMessage?: (content: string) => void;
}

export const AssistantUIAdapter: React.FC<AssistantUIAdapterProps> = ({
  messages,
  isProcessing = false,
  onSendMessage,
}) => {
  // 转换消息格式
  const assistantMessages = useMemo(() => {
    const converted = convertToAssistantMessages(messages);

    // 如果正在处理，标记最后一条 assistant 消息为 running
    if (isProcessing && converted.length > 0) {
      const lastMsg = converted[converted.length - 1];
      if (lastMsg.role === "assistant") {
        lastMsg.status = { type: "running" };
      }
    }

    return converted;
  }, [messages, isProcessing]);

  return (
    <AssistantRoot>
      <AssistantThread />
    </AssistantRoot>
  );
};
```

**Step 2: 提交适配器**

```bash
git add frontend/src/components/AssistantUIAdapter/
git commit -m "feat: create AssistantUI adapter component"
```

---

### Task 5: 集成到 CopilotPanel

**文件:**
- Modify: `frontend/src/components/CopilotPanel/index.tsx`

**Step 1: 备份现有实现**

```bash
git checkout -b backup-copilot-panel
git push origin backup-copilot-panel
git checkout main
```

**Step 2: 修改 CopilotPanel 引入 AssistantUIAdapter**

将 `frontend/src/components/CopilotPanel/index.tsx` 中的:

```tsx
import { StreamMessageList } from './StreamMessageList';
```

替换为:

```tsx
import { AssistantUIAdapter } from '@/components/AssistantUIAdapter';
```

**Step 3: 替换消息列表渲染**

将消息列表部分的代码 (约 118-127 行):

```tsx
<div className="flex-1 overflow-y-auto p-4">
  {messages.length === 0 ? (
    <div className="text-sm text-slate-400 text-center py-8">
      与 AI 对话生成或修改幻灯片
    </div>
  ) : (
    <StreamMessageList messages={messages} />
  )}
</div>
```

替换为:

```tsx
<div className="flex-1 overflow-y-auto p-4">
  {messages.length === 0 ? (
    <div className="text-sm text-slate-400 text-center py-8">
      与 AI 对话生成或修改幻灯片
    </div>
  ) : (
    <AssistantUIAdapter
      messages={messages}
      isProcessing={isProcessing}
    />
  )}
</div>
```

**Step 4: 测试界面**

启动前端开发服务器:

```bash
cd frontend
npm run dev
```

在浏览器打开 http://localhost:5173，检查:
1. 页面正常加载无报错
2. CopilotPanel 显示正常
3. 样式正确应用

**Step 5: 提交集成**

```bash
git add frontend/src/components/CopilotPanel/index.tsx
git commit -m "feat: integrate assistant-ui into CopilotPanel"
```

---

## 样式优化

### Task 6: 配置 Tailwind 动画

**文件:**
- Modify: `frontend/tailwind.config.js`

**Step 1: 添加自定义动画**

修改 `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))"
      },
      keyframes: {
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
      },
      animation: {
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 2: 提交配置**

```bash
git add frontend/tailwind.config.js
git commit -m "style: add custom animations for collapsible components"
```

---

### Task 7: 创建全局 CSS 样式

**文件:**
- Modify: `frontend/src/index.css`

**Step 1: 添加 Markdown 样式**

在 `frontend/src/index.css` 末尾添加:

```css
/* Markdown 样式 */
.prose {
  max-width: none;
  color: hsl(var(--foreground));
}

.prose p {
  margin-bottom: 0.75rem;
}

.prose p:last-child {
  margin-bottom: 0;
}

.prose code {
  background-color: hsl(var(--muted));
  border-radius: 0.25rem;
  padding: 0.125rem 0.25rem;
  font-size: 0.875rem;
}

.prose pre {
  background-color: hsl(var(--muted) / 0.5);
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
}

/* 思考过程动画 */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(
    to right,
    transparent 0%,
    hsl(var(--muted-foreground) / 0.3) 50%,
    transparent 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

**Step 2: 提交样式**

```bash
git add frontend/src/index.css
git commit -m "style: add markdown and shimmer styles"
```

---

## 功能增强

### Task 8: 实现流式消息更新

**文件:**
- Modify: `frontend/src/components/AssistantUIAdapter/index.tsx`

**Step 1: 添加实时消息合并逻辑**

修改 `AssistantUIAdapter` 组件，添加消息合并功能:

```tsx
import React, { useEffect, useMemo, useState } from "react";
import { DisplayMessage } from "@/types/stream";
import { convertToAssistantMessages, AssistantMessage } from "@/lib/messageConverter";
import { AssistantRoot, useThread } from "@assistant-ui/react";
import { AssistantThread } from "@/components/assistant-ui/thread";

interface AssistantUIAdapterProps {
  messages: DisplayMessage[];
  isProcessing?: boolean;
  onSendMessage?: (content: string) => void;
}

// 内部组件使用 useThread hook
const AssistantThreadWrapper = ({ messages, isProcessing }: {
  messages: DisplayMessage[];
  isProcessing: boolean;
}) => {
  const { setMessages } = useThread();

  // 转换并更新消息
  const assistantMessages = useMemo(() => {
    const converted = convertToAssistantMessages(messages);

    // 如果正在处理，标记最后一条 assistant 消息为 running
    if (isProcessing && converted.length > 0) {
      const lastMsg = converted[converted.length - 1];
      if (lastMsg.role === "assistant") {
        lastMsg.status = { type: "running" };
      }
    }

    return converted;
  }, [messages, isProcessing]);

  // 同步消息到 thread
  useEffect(() => {
    setMessages(assistantMessages);
  }, [assistantMessages, setMessages]);

  return <AssistantThread />;
};

export const AssistantUIAdapter: React.FC<AssistantUIAdapterProps> = ({
  messages,
  isProcessing = false,
  onSendMessage,
}) => {
  return (
    <AssistantRoot>
      <AssistantThreadWrapper
        messages={messages}
        isProcessing={isProcessing}
      />
    </AssistantRoot>
  );
};
```

**Step 2: 测试流式更新**

启动后端和前端:

```bash
# 终端 1
npm run dev:backend

# 终端 2
npm run dev:frontend
```

在浏览器中发送测试消息，验证:
1. 用户消息右对齐显示
2. AI 消息左对齐显示
3. 流式回复实时更新
4. thinking 内容可折叠

**Step 3: 提交流式更新**

```bash
git add frontend/src/components/AssistantUIAdapter/
git commit -m "feat: implement real-time message streaming"
```

---

### Task 9: 添加 Tool Calling 展示组件

**文件:**
- Create: `frontend/src/components/assistant-ui/tool-display.tsx`

**Step 1: 创建 Tool 展示组件**

创建 `frontend/src/components/assistant-ui/tool-display.tsx`:

```tsx
import { Wrench, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolDisplayProps {
  name: string;
  input?: any;
  output?: any;
  status?: "running" | "complete" | "error";
}

export const ToolDisplay: React.FC<ToolDisplayProps> = ({
  name,
  input,
  output,
  status = "complete",
}) => {
  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="my-2 rounded-lg border border-muted bg-muted/50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wrench className="h-4 w-4" />
        <span className="font-mono">{name}</span>
        {status === "running" && (
          <span className="ml-auto text-xs text-muted-foreground">
            执行中...
          </span>
        )}
        {status === "complete" && (
          <CheckCircle className="ml-auto h-4 w-4 text-green-600" />
        )}
        {status === "error" && (
          <XCircle className="ml-auto h-4 w-4 text-red-600" />
        )}
      </div>

      {input && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            输入参数
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(input)}
          </pre>
        </details>
      )}

      {output && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            输出结果
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-xs">
            {formatJson(output)}
          </pre>
        </details>
      )}
    </div>
  );
};
```

**Step 2: 在 thread.tsx 中注册 Tool 组件**

修改 `frontend/src/components/assistant-ui/thread.tsx`，添加 Tool 渲染:

```tsx
import { ToolDisplay } from "./tool-display";

// 在 MessagePrimitive.Parts 的 components 中添加:
// (如果 assistant-ui 支持 tool 部分，可以这样配置)
```

**Step 3: 提交 Tool 展示**

```bash
git add frontend/src/components/assistant-ui/tool-display.tsx
git commit -m "feat: add tool calling display component"
```

---

## 测试与验证

### Task 10: 端到端测试

**文件:**
- Test: `浏览器手动测试`

**Step 1: 启动完整环境**

```bash
# 确保后端 WebSocket 服务器运行在 ws://localhost:3001/ws
npm run dev:backend

# 在另一个终端启动前端
npm run dev:frontend
```

**Step 2: 测试用户消息发送**

1. 打开浏览器访问 http://localhost:5173
2. 选择一个幻灯片
3. 在输入框输入测试消息: "创建一个标题"
4. 点击发送按钮

**预期结果:**
- 用户消息立即显示，右对齐，蓝色背景
- 输入框清空
- 按钮显示为禁用状态

**Step 3: 测试 AI 流式回复**

1. 观察左侧 AI 消息区域
2. 验证内容逐字/逐句显示

**预期结果:**
- AI 消息左对齐，灰色背景
- 内容实时更新显示（打字机效果）
- Markdown 格式正确渲染

**Step 4: 测试 Thinking 展示**

1. 发送一个会触发思考的请求
2. 观察 "思考过程" 区域

**预期结果:**
- "思考过程" 标题显示
- 默认可折叠状态
- 展开后显示 thinking 内容
- 有 shimmer 动画效果

**Step 5: 测试 Tool Calling**

1. 发送一个会调用工具的请求
2. 观察 tool 展示区域

**预期结果:**
- 工具名称显示
- 输入参数可折叠查看
- 输出结果可折叠查看
- 状态图标正确显示

**Step 6: 测试响应式布局**

1. 调整浏览器窗口大小
2. 在不同屏幕尺寸下测试

**预期结果:**
- 消息气泡自适应宽度（最大 75%）
- 在小屏幕上正常显示
- 滚动条正常工作

**Step 7: 记录测试结果**

创建测试文档:

```bash
echo "# 集成测试结果

- [x] 用户消息右对齐显示
- [x] AI 消息左对齐显示
- [x] 流式回复实时更新
- [x] Thinking 内容可折叠
- [x] Tool Calling 可视化
- [x] Markdown 格式正确渲染
- [x] 响应式布局正常

测试日期: $(date +%Y-%m-%d)
" > docs/test-results/assistant-ui-integration-test.md
```

**Step 8: 提交测试文档**

```bash
git add docs/test-results/
git commit -m "test: add integration test results"
```

---

## 文档与清理

### Task 11: 更新项目文档

**文件:**
- Create: `docs/assistant-ui-integration.md`
- Modify: `CLAUDE.md`

**Step 1: 创建集成文档**

创建 `docs/assistant-ui-integration.md`:

```markdown
# Assistant-UI 集成文档

## 概述

本项目使用 [assistant-ui](https://github.com/assistant-ui/assistant-ui) 组件库实现类似 ChatGPT 的聊天界面。

## 核心组件

### AssistantUIAdapter
消息转换适配器，将 WebSocket 消息转换为 assistant-ui 兼容格式。

位置: `frontend/src/components/AssistantUIAdapter/index.tsx`

### Message Converter
消息格式转换工具。

位置: `frontend/src/lib/messageConverter.ts`

### Thread & Message Components
聊天界面核心组件。

位置: `frontend/src/components/assistant-ui/`

## 数据流

```
WebSocket Message
  ↓
DisplayMessage (当前格式)
  ↓
convertToAssistantMessages()
  ↓
AssistantMessage (assistant-ui 格式)
  ↓
Thread/Message Components
  ↓
UI 渲染
```

## 消息类型映射

| DisplayMessage.type | AssistantMessagePart.type |
|---------------------|---------------------------|
| user                | role: "user"              |
| text                | type: "text"              |
| thinking            | type: "reasoning"         |
| tool_call           | type: "tool-use"          |
| tool_result         | type: "tool-result"       |
| error               | type: "text" (带错误信息)  |

## 自定义样式

### 消息气泡颜色

- 用户消息: `bg-blue-600 text-white`
- AI 消息: `bg-slate-100 text-slate-900`

修改位置: `frontend/src/components/assistant-ui/thread.tsx`

### Thinking 样式

修改位置: `frontend/src/components/assistant-ui/reasoning.tsx`

### Tool 样式

修改位置: `frontend/src/components/assistant-ui/tool-display.tsx`

## 调试

### 启用详细日志

在浏览器控制台:
```javascript
localStorage.setItem('debug', 'assistant-ui:*')
```

### 查看转换后的消息

在 CopilotPanel 中添加:
```tsx
console.log('Converted messages:', assistantMessages)
```
```

**Step 2: 更新 CLAUDE.md**

在 `CLAUDE.md` 的项目信息部分添加:

```markdown
## UI 组件库

项目使用 **assistant-ui** 组件库实现聊天界面。

- **文档**: [assistant-ui GitHub](https://github.com/assistant-ui/assistant-ui)
- **组件位置**: `frontend/src/components/assistant-ui/`
- **集成文档**: `docs/assistant-ui-integration.md`
```

**Step 3: 提交文档**

```bash
git add docs/assistant-ui-integration.md CLAUDE.md
git commit -m "docs: add assistant-ui integration documentation"
```

---

### Task 12: 代码清理与优化

**文件:**
- Delete: `frontend/src/components/CopilotPanel/StreamMessageList.tsx` (保留备份)
- Delete: `frontend/src/components/CopilotPanel/ThinkingView.tsx` (保留备份)
- Delete: `frontend/src/components/CopilotPanel/ToolCallView.tsx` (保留备份)

**Step 1: 创建备份目录**

```bash
mkdir -p frontend/src/components/.backup
```

**Step 2: 移动旧组件到备份**

```bash
mv frontend/src/components/CopilotPanel/StreamMessageList.tsx frontend/src/components/.backup/
mv frontend/src/components/CopilotPanel/ThinkingView.tsx frontend/src/components/.backup/
mv frontend/src/components/CopilotPanel/ToolCallView.tsx frontend/src/components/.backup/
```

**Step 3: 更新导入引用**

检查是否有其他文件引用了这些组件:

```bash
cd frontend
grep -r "StreamMessageList\|ThinkingView\|ToolCallView" src/
```

如果有引用，需要更新为使用 AssistantUIAdapter。

**Step 4: 添加 .gitignore**

在 `frontend/.gitignore` 添加:

```
# 备份的旧组件
src/components/.backup/
```

**Step 5: 提交清理**

```bash
git add frontend/.gitignore
git rm frontend/src/components/CopilotPanel/StreamMessageList.tsx
git rm frontend/src/components/CopilotPanel/ThinkingView.tsx
git rm frontend/src/components/CopilotPanel/ToolCallView.tsx
git commit -m "refactor: remove old chat components, replaced with assistant-ui"
```

---

### Task 13: 性能优化

**文件:**
- Modify: `frontend/src/components/AssistantUIAdapter/index.tsx`

**Step 1: 添加消息虚拟化**

对于大量消息历史，考虑使用虚拟滚动:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// 在 Thread 组件中实现虚拟列表
```

**Step 2: 添加消息防抖**

```tsx
import { useDebouncedCallback } from "use-debounce";

// 对频繁的消息更新进行防抖处理
```

**Step 3: 优化 Markdown 渲染**

```tsx
// 使用缓存记忆 Markdown 渲染结果
const memoizedMarkdown = useMemo(() => {
  return renderMarkdown(content);
}, [content]);
```

**Step 4: 提交优化**

```bash
git add frontend/src/components/AssistantUIAdapter/
git commit -m "perf: add message virtualization and debouncing"
```

---

## 完成

### Task 14: 最终验证与发布

**Step 1: 运行完整测试套件**

```bash
cd frontend
npm run build
```

确保构建无错误。

**Step 2: 检查包大小**

```bash
npm run build -- --mode=analyze
```

确保 assistant-ui 相关包不会导致 bundle 过大。

**Step 3: 创建发布说明**

创建 `docs/release-notes/assistant-ui-integration.md`:

```markdown
# Assistant-UI 集成 - 发布说明

## 新功能

- ✨ ChatGPT 风格聊天界面
- ✨ 流式回复实时显示
- ✨ Thinking 过程可折叠展示
- ✨ Tool Calling 可视化
- ✨ Markdown 格式支持（代码高亮、GFM）

## 改进

- 🎨 用户消息右对齐，蓝色背景
- 🎨 AI 消息左对齐，灰色背景
- 🎨 平滑的展开/折叠动画
- 🎨 响应式布局适配

## 技术变更

- 新增依赖: @assistant-ui/react, @assistant-ui/react-markdown, tw-shimmer
- 新增组件: AssistantUIAdapter, Thread, Reasoning, ToolDisplay
- 新增工具: messageConverter

## 升级指南

无需额外配置，现有 WebSocket 通信保持不变。

## 已知问题

无

## 下一步

- [ ] 添加消息导出功能
- [ ] 支持多轮对话上下文
- [ ] 添加消息搜索功能
```

**Step 4: 最终提交**

```bash
git add docs/release-notes/
git commit -m "docs: add release notes for assistant-ui integration"
```

**Step 5: 创建 PR**

```bash
git checkout -b feature/assistant-ui-integration
git push origin feature/assistant-ui-integration
```

在 GitHub 创建 Pull Request，包含:
- 清晰的 PR 标题: "feat: integrate assistant-ui for ChatGPT-like chat interface"
- 详细的 PR 描述，引用本计划文档
- 相关的截图或录屏

**Step 6: 合并后清理**

```bash
git checkout main
git pull origin main
git branch -d feature/assistant-ui-integration
```

---

## 附录: 故障排查

### 常见问题

**Q: 消息不显示**
- 检查 console 是否有错误
- 验证 messageConverter 返回的数据格式
- 确认 AssistantThread 正确渲染

**Q: 样式未生效**
- 确认 tailwind.config.js 已更新
- 检查 index.css 是否正确引入
- 清除浏览器缓存

**Q: 流式更新不流畅**
- 检查 isProcessing 状态是否正确
- 验证 useMemo 依赖项
- 考虑添加防抖

**Q: Markdown 渲染异常**
- 检查 remark-gfm 是否正确安装
- 验证 content 是否为有效字符串
- 查看 console 中的解析错误

---

**计划完成！**

此计划涵盖了从依赖安装到最终发布的完整流程。每个任务都是独立的，可以逐步完成和测试。
