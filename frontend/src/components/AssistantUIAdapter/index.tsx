import React, { useMemo } from "react";
import { DisplayMessage } from "@/types/stream";
import { convertToAssistantMessages } from "@/lib/messageConverter";
import { AssistantThread } from "@/components/assistant-ui/thread";

interface AssistantUIAdapterProps {
  messages: DisplayMessage[];
  isProcessing?: boolean;
  onSendMessage?: (content: string) => void;
}

/**
 * AssistantUI 适配器组件
 * 负责将现有的 WebSocket 消息数据流连接到 assistant-ui 的 Thread 组件
 *
 * 注意：当前版本提供基础结构和消息转换逻辑
 * Task 8 将添加完整的 Runtime 集成和实时消息同步功能
 */
export const AssistantUIAdapter: React.FC<AssistantUIAdapterProps> = ({
  messages,
  isProcessing = false,
}) => {
  // 转换消息格式（为 Task 8 准备）
  useMemo(() => {
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

  // TODO: Task 8 - 完整的 Runtime 集成需要：
  // 1. 创建或获取 AssistantRuntime
  // 2. 使用 AssistantRuntimeProvider 包裹组件
  // 3. 使用 useThread hook 同步消息到 assistant-ui 的 Thread 上下文
  // 4. 实现 onSendMessage 回调

  // 当前版本：返回基础 Thread 组件作为占位符
  // 这允许在完成完整 Runtime 集成之前先构建 UI
  return <AssistantThread />;
};
