// Stream-JSON 事件类型（根据 Claude Code CLI 输出格式）
export type StreamEvent =
  | { type: 'system'; subtype?: string }
  | { type: 'thinking'; content: string }
  | { type: 'tool_use'; name: string; input: any }
  | { type: 'tool_result'; name: string; output: any }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string }
  | { type: string; [key: string]: any }; // 兜底类型

// WebSocket 消息类型
export interface WSMessage {
  type: 'stream' | 'raw' | 'done' | 'error';
  slideId?: string;
  data?: StreamEvent;
  text?: string;
  error?: string;
}

// 前端消息展示类型
export interface DisplayMessage {
  id: string;
  type: 'user' | 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  timestamp: Date;
}

// 导出 assistant-ui 兼容类型
export type { AssistantMessage, AssistantMessagePart } from '@/lib/messageConverter';
