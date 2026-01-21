import React from 'react';
import { DisplayMessage } from '@/types/stream';
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';
import { AssistantThread } from '@/components/assistant-ui/thread';

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
    const content = Array.isArray(message.content)
      ? message.content.find((c) => c.type === 'text')?.text || ''
      : '';

    if (content && onSendMessage) {
      onSendMessage(content);
    }
  };

  // 转换 DisplayMessage 到 ThreadMessageLike
  const convertMessage = (msg: DisplayMessage): ThreadMessageLike => {
    if (msg.type === 'user') {
      return {
        role: 'user',
        content: [{ type: 'text', text: msg.content || '' }],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // AI 消息 - 根据 type 转换
    if (msg.type === 'text') {
      return {
        role: 'assistant',
        content: [{ type: 'text', text: msg.content || '' }],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // 思考过程
    if (msg.type === 'thinking') {
      return {
        role: 'assistant',
        content: [
          {
            type: 'reasoning',
            text: msg.content || '',
          },
        ],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // 工具调用
    if (msg.type === 'tool_call') {
      return {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolName: msg.toolName || '',
            toolCallId: msg.id,
            args: msg.toolInput || {},
          },
        ],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // 工具结果 - 转换为文本显示（assistant-ui 不支持 tool-result 类型）
    if (msg.type === 'tool_result') {
      const resultText = `[${msg.toolName || 'Tool'} 结果]\n${JSON.stringify(msg.toolResult, null, 2)}`;
      return {
        role: 'assistant',
        content: [{ type: 'text', text: resultText }],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // 错误
    if (msg.type === 'error') {
      return {
        role: 'assistant',
        content: [{ type: 'text', text: `错误: ${msg.content}` }],
        id: msg.id,
        createdAt: msg.timestamp || new Date(),
      };
    }

    // 默认返回空消息
    return {
      role: 'assistant',
      content: [{ type: 'text', text: '' }],
      id: msg.id,
      createdAt: msg.timestamp || new Date(),
    };
  };

  // 创建 ExternalStoreRuntime
  const runtime = useExternalStoreRuntime({
    isRunning: isProcessing,
    messages: messages,
    convertMessage,
    onNew: handleNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantThread />
    </AssistantRuntimeProvider>
  );
};
