import React, { useCallback, useEffect } from 'react';
import { useLayout } from '@/contexts/LayoutContext';

export const ResizableHandle: React.FC = () => {
  const { setChatWidth } = useLayout();
  const [isDragging, setIsDragging] = React.useState(false);

  const MIN_WIDTH = 320;
  const MAX_WIDTH = window.innerWidth - 500;

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
    document.body.style.userSelect = 'none'; // 防止拖拽时选中文字
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 计算新宽度：窗口宽度 - 鼠标X坐标
      const newWidth = window.innerWidth - e.clientX;

      // 边界检查
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setChatWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setChatWidth]);

  return (
    <div
      className={`w-1 bg-slate-300 hover:bg-blue-400 cursor-col-resize flex items-center justify-center select-none transition-colors ${
        isDragging ? 'bg-blue-400' : ''
      }`}
      onMouseDown={handleMouseDown}
      style={{ width: '4px' }}
    >
      {/* 拖拽图标指示器 */}
      <span className="text-slate-400 text-xs opacity-50">|||</span>
    </div>
  );
};
