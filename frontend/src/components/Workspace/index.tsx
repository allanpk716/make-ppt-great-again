import React, { useEffect, useRef } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { FabricCanvas } from './FabricCanvas';
import { ZoomProvider } from '@/contexts/ZoomContext';
import { ZoomControls } from './ZoomControls';
import { useZoom } from '@/contexts/ZoomContext';

// 内部组件，使用 useZoom hook
const WorkspaceContent: React.FC = () => {
  const { currentSlideId, slides } = usePPTStore();
  const currentSlide = slides.find(s => s.id === currentSlideId);
  const { level, registerContainer } = useZoom();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 注册容器引用，用于"适应页面"功能
  useEffect(() => {
    if (canvasContainerRef.current) {
      registerContainer(canvasContainerRef.current);
    }
  }, [registerContainer]);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      {/* 工具栏 */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-end px-4">
        <span className="text-sm text-slate-600 mr-auto">
          {currentSlide ? `第 ${currentSlide.displayIndex + 1} 页` : '未选择幻灯片'}
        </span>
        <ZoomControls />
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        {currentSlide ? (
          <div
            ref={canvasContainerRef}
            className="bg-white shadow-lg rounded overflow-hidden"
            style={{
              transform: `scale(${level})`,
              transformOrigin: 'center center',
            }}
          >
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

// 导出的组件，使用 ZoomProvider 包裹
export const Workspace: React.FC = () => {
  return (
    <ZoomProvider>
      <WorkspaceContent />
    </ZoomProvider>
  );
};
