import { DisplayMessage } from '@/types/stream';

export class StreamJsonParser {
  /**
   * 解析单个 JSON 事件
   * 返回 null 表示该事件应该被忽略（如 system 事件）
   */
  static parse(json: any): DisplayMessage | null {
    const baseMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };

    // 忽略系统事件（内部钩子响应等）
    if (json.type === 'system') {
      return null;
    }

    // 处理嵌套的 stream_event 结构
    if (json.type === 'stream_event' && json.event) {
      const event = json.event;

      // 处理内容块增量（流式文本）
      if (event.type === 'content_block_delta' && event.delta) {
        if (event.delta.type === 'text_delta') {
          return {
            ...baseMessage,
            type: 'text',
            content: event.delta.text || ''
          };
        }
        // 可以添加其他 delta 类型的处理
      }

      // 处理内容块开始
      if (event.type === 'content_block_start' && event.content_block) {
        const block = event.content_block;
        if (block.type === 'text') {
          // 文本块开始，通常不需要显示
          return null;
        }
      }

      // 处理消息开始
      if (event.type === 'message_start') {
        return null;
      }

      // 处理消息结束
      if (event.type === 'message_delta' || event.type === 'message_stop') {
        return null;
      }

      // 处理工具使用
      if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
        return {
          ...baseMessage,
          type: 'tool_call',
          toolName: event.content_block.name || 'unknown',
          toolInput: event.content_block.input
        };
      }

      // 如果是未知类型，返回 null
      return null;
    }

    // 兼容旧格式（直接的事件类型，没有嵌套）
    if (json.type === 'thinking') {
      return {
        ...baseMessage,
        type: 'thinking',
        content: json.content || ''
      };
    }

    if (json.type === 'tool_use') {
      return {
        ...baseMessage,
        type: 'tool_call',
        toolName: json.name || 'unknown',
        toolInput: json.input
      };
    }

    if (json.type === 'tool_result') {
      return {
        ...baseMessage,
        type: 'tool_result',
        toolName: json.name || 'unknown',
        toolResult: json.output
      };
    }

    if (json.type === 'text') {
      return {
        ...baseMessage,
        type: 'text',
        content: json.text || ''
      };
    }

    if (json.type === 'error') {
      return {
        ...baseMessage,
        type: 'error',
        content: json.message || '未知错误'
      };
    }

    // 默认返回 null（忽略无法识别的事件）
    return null;
  }

  /**
   * 解析原始文本行
   * 首先尝试解析 JSON，如果是 system 消息则返回 null 过滤掉
   */
  static parseRaw(text: string): DisplayMessage | null {
    // 尝试解析为 JSON
    try {
      const parsed = JSON.parse(text);
      // 如果是 system 消息，返回 null 进行过滤
      if (parsed.type === 'system') {
        return null;
      }
      // 对于其他 JSON 类型，使用 parse 方法处理
      return this.parse(parsed);
    } catch {
      // 不是有效的 JSON，作为纯文本返回
      return {
        id: Math.random().toString(36).substring(7),
        type: 'text',
        content: text,
        timestamp: new Date()
      };
    }
  }
}
