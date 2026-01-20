import React from 'react';
import { useZoom } from '@/contexts/ZoomContext';
import { Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
  disabled?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ disabled = false }) => {
  const { level, zoomIn, zoomOut, setZoom, resetToFit } = useZoom();  // 使用 level

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'fit') {
      resetToFit();
    } else {
      const percentage = parseInt(value, 10);
      setZoom(percentage / 100);
    }
  };

  const zoomPercentage = Math.round(level * 100);  // 使用 level

  return (
    <div className="flex items-center gap-2">
      {/* 缩小按钮 */}
      <button
        onClick={zoomOut}
        disabled={disabled || level <= 0.25}  // 使用 level
        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="缩小"
        title="缩小 (Ctrl+-)"
      >
        <Minus className="w-4 h-4 text-slate-600" />
      </button>

      {/* 缩放比例选择器 */}
      <select
        value={zoomPercentage}
        onChange={handleSelect}
        disabled={disabled}
        className="px-2 py-1 border border-slate-300 rounded text-sm min-w-[80px] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="25">25%</option>
        <option value="50">50%</option>
        <option value="75">75%</option>
        <option value="100">100%</option>
        <option value="125">125%</option>
        <option value="150">150%</option>
        <option value="200">200%</option>
        <option value="fit">适应页面</option>
      </select>

      {/* 放大按钮 */}
      <button
        onClick={zoomIn}
        disabled={disabled || level >= 4.0}  // 使用 level
        className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="放大"
        title="放大 (Ctrl++)"
      >
        <Plus className="w-4 h-4 text-slate-600" />
      </button>

      {/* 适应页面快捷按钮 */}
      <button
        onClick={resetToFit}
        disabled={disabled}
        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="适应页面大小"
      >
        适应
      </button>
    </div>
  );
};
