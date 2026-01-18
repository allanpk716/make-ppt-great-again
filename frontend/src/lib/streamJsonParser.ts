import { StreamEvent, DisplayMessage } from '@/types/stream';

export class StreamJsonParser {
  /**
   * 解析单个 JSON 事件
   */
  static parse(json: any): DisplayMessage {
    const baseMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };

    // 思考事件
    if (json.type === 'thinking') {
      return {
        ...baseMessage,
        type: 'thinking',
        content: json.content
      };
    }

    // 工具调用
    if (json.type === 'tool_use') {
      return {
        ...baseMessage,
        type: 'tool_call',
        toolName: json.name,
        toolInput: json.input
      };
    }

    // 工具结果
    if (json.type === 'tool_result') {
      return {
        ...baseMessage,
        type: 'tool_result',
        toolName: json.name,
        toolResult: json.output
      };
    }

    // 文本输出
    if (json.type === 'text') {
      return {
        ...baseMessage,
        type: 'text',
        content: json.text
      };
    }

    // 错误
    if (json.type === 'error') {
      return {
        ...baseMessage,
        type: 'error',
        content: json.message
      };
    }

    // 默认作为文本处理
    return {
      ...baseMessage,
      type: 'text',
      content: JSON.stringify(json)
    };
  }

  /**
   * 解析原始文本行
   */
  static parseRaw(text: string): DisplayMessage {
    return {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      content: text,
      timestamp: new Date()
    };
  }
}
