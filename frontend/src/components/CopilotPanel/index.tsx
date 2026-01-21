import React, { useState, useEffect, useRef } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { MessageSquare, Send } from 'lucide-react';
import { WebSocketClient } from '@/lib/websocketClient';
import { StreamJsonParser } from '@/lib/streamJsonParser';
import { AssistantUIAdapter } from '@/components/AssistantUIAdapter';
import { DisplayMessage } from '@/types/stream';
import { AccumulatingMessage, isSameAssistantReply, AccumulatingPart } from '@/types/accumulation';

interface CopilotPanelProps {
  style?: React.CSSProperties;
}

export const CopilotPanel: React.FC<CopilotPanelProps> = ({ style }) => {
  const { getCurrentAIContext, currentSlideId } = usePPTStore();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [accumulatingMsg, setAccumulatingMsg] = useState<AccumulatingMessage | null>(null);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocketClient | null>(null);

  const context = getCurrentAIContext();

  // 初始化 WebSocket
  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:3001/ws');
    wsRef.current = ws;

    ws.connect()
      .then(() => {
        setIsConnected(true);
      })
      .catch((error) => {
        console.error('Failed to connect WebSocket:', error);
      });

    ws.onMessage((data) => {
      console.log('CopilotPanel onMessage:', data.type, data);

      if (data.type === 'stream' && data.data) {
        const msg = StreamJsonParser.parse(data.data);
        console.log('Parsed message:', msg);

        // 只添加非 null 的消息（过滤掉 system 事件）
        if (!msg) return;

        if (msg.type === 'user') {
          // 添加用户消息
          setMessages((prev) => [...prev, msg]);

          // 开始新的 AI 消息累积
          setAccumulatingMsg({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            parts: [],
            status: { type: 'running' },
            createdAt: new Date(),
          });
        }
        else if (accumulatingMsg && isSameAssistantReply(msg, accumulatingMsg)) {
          // 累积 AI 消息片段
          const newPart = convertDisplayMessageToPart(msg);

          // 特殊处理: text 类型追加到现有 text part
          if (msg.type === 'text') {
            const existingTextPart = accumulatingMsg.parts.find(p => p.type === 'text');
            if (existingTextPart && existingTextPart.content) {
              existingTextPart.content += msg.content || '';
            } else {
              accumulatingMsg.parts.push(newPart);
            }
          } else {
            // thinking, tool_call, tool_result 作为新 part 添加
            accumulatingMsg.parts.push(newPart);
          }

          setAccumulatingMsg({ ...accumulatingMsg });
          console.log('Accumulated parts:', accumulatingMsg.parts.length);
        }
      }
      else if (data.type === 'done') {
        // 完成累积：将 accumulatingMsg 转换为 DisplayMessage[] 并添加到列表
        if (accumulatingMsg) {
          const displayMsgs = convertAccumulatingToDisplayMessages(accumulatingMsg);
          setMessages((prev) => [...prev, ...displayMsgs]);

          console.log(`Added ${displayMsgs.length} messages from accumulation`);
          setAccumulatingMsg(null);
        }
        setIsProcessing(false);
      }
      else if (data.type === 'error') {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            type: 'error',
            content: data.error || '未知错误',
            timestamp: new Date(),
          },
        ]);
        setIsProcessing(false);
        setAccumulatingMsg(null);
      }
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  // 当 slideId 改变时注册客户端
  useEffect(() => {
    if (currentSlideId && wsRef.current && isConnected) {
      console.log('Registering for slideId:', currentSlideId);
      wsRef.current.register('default', currentSlideId);
    }
  }, [currentSlideId, isConnected]);

  const sendMessage = (content: string) => {
    if (!content.trim() || !currentSlideId || !wsRef.current || isProcessing) return;

    // 设置处理状态
    setIsProcessing(true);

    // 发送到后端（用户消息将由 ws.onMessage 统一处理）
    wsRef.current.send({
      type: 'chat',
      projectId: 'default',
      slideId: currentSlideId,
      message: content,
    });
  };

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  // 将 DisplayMessage 转换为 AccumulatingPart
  function convertDisplayMessageToPart(msg: DisplayMessage): AccumulatingPart {
    switch (msg.type) {
      case 'thinking':
        return {
          type: 'reasoning',
          content: msg.content || '',
        };

      case 'tool_call':
        return {
          type: 'tool-use',
          toolName: msg.toolName || 'unknown',
          input: msg.toolInput,
          toolCallId: msg.id,
        };

      case 'tool_result':
        return {
          type: 'tool-result',
          toolName: msg.toolName || 'unknown',
          output: msg.toolResult,
          toolCallId: msg.id,
        };

      case 'text':
      default:
        return {
          type: 'text',
          content: msg.content || '',
        };
    }
  }

  // 将 AccumulatingMessage 转换为 DisplayMessage[]
  function convertAccumulatingToDisplayMessages(accMsg: AccumulatingMessage): DisplayMessage[] {
    return accMsg.parts.map((part, index) => {
      const baseMsg = {
        id: `${accMsg.id}-${part.type}-${index}`,
        timestamp: accMsg.createdAt,
      };

      switch (part.type) {
        case 'reasoning':
          return {
            ...baseMsg,
            type: 'thinking',
            content: part.content || '',
          };

        case 'tool-use':
          return {
            ...baseMsg,
            type: 'tool_call',
            toolName: part.toolName,
            toolInput: part.input,
          };

        case 'tool-result':
          return {
            ...baseMsg,
            type: 'tool_result',
            toolName: part.toolName,
            toolResult: part.output,
          };

        case 'text':
        default:
          return {
            ...baseMsg,
            type: 'text',
            content: part.content || '',
          };
      }
    });
  }

  if (!currentSlideId) {
    return (
      <div className="bg-slate-50 border-l border-slate-200" style={style}>
        <div className="h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择幻灯片后开始对话</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border-l border-slate-200 flex flex-col" style={style}>
      {/* 上下文指示器 */}
      <div className="p-4 border-b border-slate-200">
        <div className="text-sm font-medium text-slate-700">当前上下文</div>
        <div className="text-xs text-slate-500 mt-1">
          {context.type === 'page' ? '整页 (Page)' : `元素 (${context.elementId})`}
        </div>
        <div className="flex items-center mt-2">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-xs text-slate-500">{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">与 AI 对话生成或修改幻灯片</div>
        ) : (
          <AssistantUIAdapter
            messages={messages}
            isProcessing={isProcessing}
            onSendMessage={sendMessage}
          />
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <textarea
            className="flex-1 p-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="输入您的需求..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed self-end"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
