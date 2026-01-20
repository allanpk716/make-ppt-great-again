import React from "react";
import { DisplayMessage } from "@/types/stream";
import { AssistantThread } from "@/components/assistant-ui/thread";

interface AssistantUIAdapterProps {
  messages: DisplayMessage[];
  isProcessing?: boolean;
  onSendMessage?: (content: string) => void;
}

/**
 * AssistantUI 适配器组件
 * 当前版本提供基础结构，Task 8 会添加实时消息同步功能
 */
export const AssistantUIAdapter: React.FC<AssistantUIAdapterProps> = () => {
  // TODO: Task 8 - 添加消息同步到 assistant-ui 的 Thread 上下文
  // 当前版本只是简单的渲染组件外壳

  return <AssistantThread />;
};
