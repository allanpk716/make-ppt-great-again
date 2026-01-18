import React from 'react';
import { DisplayMessage } from '@/types/stream';
import { ThinkingView } from './ThinkingView';
import { ToolCallView } from './ToolCallView';

interface StreamMessageListProps {
  messages: DisplayMessage[];
}

export const StreamMessageList: React.FC<StreamMessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.type === 'thinking' && msg.content && (
            <ThinkingView content={msg.content} />
          )}
          {msg.type === 'tool_call' && (
            <ToolCallView name={msg.toolName!} input={msg.toolInput} />
          )}
          {msg.type === 'tool_result' && (
            <ToolCallView name={msg.toolName!} result={msg.toolResult} />
          )}
          {msg.type === 'text' && msg.content && (
            <div className="p-3 bg-slate-100 rounded-lg">
              <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          )}
          {msg.type === 'error' && msg.content && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg">
              <div className="text-sm">{msg.content}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
