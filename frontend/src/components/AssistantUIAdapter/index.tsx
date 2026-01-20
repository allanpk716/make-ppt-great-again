import React from "react";
import { DisplayMessage } from "@/types/stream";
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { AssistantThread } from "@/components/assistant-ui/thread";

interface AssistantUIAdapterProps {
  messages: DisplayMessage[];
  isProcessing?: boolean;
  onSendMessage?: (content: string) => void;
}

/**
 * AssistantUI 适配器组件
 * 使用 ExternalStoreRuntime 将现有的 WebSocket 消息流连接到 assistant-ui
 */
export const AssistantUIAdapter: React.FC<AssistantUIAdapterProps> = ({
  messages,
  isProcessing = false,
  onSendMessage,
}) => {
  // 处理新消息
  const handleNew = async (message: AppendMessage) => {
    if (message.content[0]?.type !== "text") {
      throw new Error("Only text messages are supported");
    }

    const input = message.content[0].text;
    if (onSendMessage) {
      onSendMessage(input);
    }
  };

  // 转换消息格式
  const convertMessage = (message: ThreadMessageLike): ThreadMessageLike => {
    return message;
  };

  // 创建 ExternalStoreRuntime
  const runtime = useExternalStoreRuntime({
    isRunning: isProcessing,
    messages: messages as unknown as ThreadMessageLike[],
    convertMessage,
    onNew: handleNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread />
    </AssistantRuntimeProvider>
  );
};
