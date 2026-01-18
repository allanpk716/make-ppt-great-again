import React from 'react';
import { MessageSquare } from 'lucide-react';
import { usePPTStore } from '@/stores/pptStore';

export const CopilotPanel: React.FC = () => {
  const { currentSlideId, getCurrentAIContext } = usePPTStore();
  const context = getCurrentAIContext();

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
      </div>

      {/* 消息列表占位 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-sm text-slate-400 text-center py-8">
          与 AI 对话生成或修改幻灯片
        </div>
      </div>

      {/* 输入区域占位 */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-sm text-slate-400 text-center">
          WebSocket 连接待实现（Phase 3）
        </div>
      </div>
    </div>
  );
};
