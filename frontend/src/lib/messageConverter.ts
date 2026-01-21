import { DisplayMessage } from '@/types/stream';

// assistant-ui 消息结构
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  parts?: AssistantMessagePart[];
  status?: { type: 'running' | 'complete' | 'error' };
}

export type AssistantMessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-use'; name: string; input: any }
  | { type: 'tool-result'; name: string; output: any };

/**
 * 将现有的 DisplayMessage[] 转换为 assistant-ui 兼容的消息格式
 */
export function convertToAssistantMessages(messages: DisplayMessage[]): AssistantMessage[] {
  const result: AssistantMessage[] = [];
  let currentAssistantMsg: AssistantMessage | null = null;

  for (const msg of messages) {
    if (msg.type === 'user') {
      // 保存之前的 assistant 消息
      if (currentAssistantMsg) {
        result.push(currentAssistantMsg);
        currentAssistantMsg = null;
      }

      // 添加用户消息
      result.push({
        id: msg.id,
        role: 'user',
        content: msg.content,
      });
    } else {
      // AI 相关消息类型 (text, thinking, tool_call, tool_result)
      if (!currentAssistantMsg) {
        currentAssistantMsg = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          parts: [],
        };
      }

      // 将不同类型转换为 parts
      switch (msg.type) {
        case 'thinking':
          currentAssistantMsg.parts?.push({
            type: 'reasoning',
            text: msg.content || '',
          });
          break;

        case 'tool_call':
          currentAssistantMsg.parts?.push({
            type: 'tool-use',
            name: msg.toolName || 'unknown',
            input: msg.toolInput,
          });
          break;

        case 'tool_result':
          currentAssistantMsg.parts?.push({
            type: 'tool-result',
            name: msg.toolName || 'unknown',
            output: msg.toolResult,
          });
          break;

        case 'text':
          currentAssistantMsg.parts?.push({
            type: 'text',
            text: msg.content || '',
          });
          // 同时设置 content 用于简化渲染
          currentAssistantMsg.content = msg.content;
          break;

        case 'error':
          currentAssistantMsg.parts?.push({
            type: 'text',
            text: `错误: ${msg.content}`,
          });
          currentAssistantMsg.status = { type: 'error' };
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
