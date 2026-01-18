import React from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { FabricCanvas } from './FabricCanvas';

export const Workspace: React.FC = () => {
  const { currentSlideId, slides } = usePPTStore();
  const currentSlide = slides.find(s => s.id === currentSlideId);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      {/* 工具栏 */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4">
        <span className="text-sm text-slate-600">
          {currentSlide ? `第 ${currentSlide.displayIndex + 1} 页` : '未选择幻灯片'}
        </span>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {currentSlide ? (
          <div className="bg-white shadow-lg rounded overflow-hidden">
            <div
              className="bg-white"
              style={{
                width: `${currentSlide.data.pageSize.width / 2}px`,
                height: `${currentSlide.data.pageSize.height / 2}px`,
              }}
            >
              <FabricCanvas />
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400">
            <p className="text-lg mb-2">未选择幻灯片</p>
            <p className="text-sm">请从左侧选择或创建幻灯片</p>
          </div>
        )}
      </div>
    </div>
  );
};
