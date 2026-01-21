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
