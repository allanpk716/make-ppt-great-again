import React, { useState, useEffect, useRef } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { MessageSquare, Send } from 'lucide-react';
import { WebSocketClient } from '@/lib/websocketClient';
import { StreamJsonParser } from '@/lib/streamJsonParser';
import { AssistantUIAdapter } from '@/components/AssistantUIAdapter';
import { DisplayMessage } from '@/types/stream';

export const CopilotPanel: React.FC = () => {
  const { getCurrentAIContext, currentSlideId } = usePPTStore();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocketClient | null>(null);

  const context = getCurrentAIContext();

  // 初始化 WebSocket
  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:3001/ws');
    wsRef.current = ws;

    ws.connect().then(() => {
      setIsConnected(true);
    }).catch((error) => {
      console.error('Failed to connect WebSocket:', error);
    });

    ws.onMessage((data) => {
      console.log('CopilotPanel onMessage:', data.type, data);
      if (data.type === 'stream' && data.data) {
        const msg = StreamJsonParser.parse(data.data);
        console.log('Parsed message:', msg);
        // 只添加非 null 的消息（过滤掉 system 事件）
        if (msg) {
          setMessages(prev => [...prev, msg]);
        }
      } else if (data.type === 'raw' && data.text) {
        const msg = StreamJsonParser.parseRaw(data.text);
        setMessages(prev => [...prev, msg]);
      } else if (data.type === 'done') {
        setIsProcessing(false);
      } else if (data.type === 'error') {
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: 'error',
          content: data.error || '未知错误',
          timestamp: new Date()
        }]);
        setIsProcessing(false);
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

    // 添加用户消息
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      type: 'user',
      content: content,
      timestamp: new Date()
    }]);

    // 发送到后端
    wsRef.current.send({
      type: 'chat',
      projectId: 'default',
      slideId: currentSlideId,
      message: content
    });

    setIsProcessing(true);
  };

  const handleSend = () => {
    sendMessage(input);
    setInput('');
  };

  if (!currentSlideId) {
    return (
      <div className="w-80 bg-slate-50 border-l border-slate-200">
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
    <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col">
      {/* 上下文指示器 */}
      <div className="p-4 border-b border-slate-200">
        <div className="text-sm font-medium text-slate-700">当前上下文</div>
        <div className="text-xs text-slate-500 mt-1">
          {context.type === 'page' ? '整页 (Page)' : `元素 (${context.elementId})`}
        </div>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-500">{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">
            与 AI 对话生成或修改幻灯片
          </div>
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
