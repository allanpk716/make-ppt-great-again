import React, { useEffect } from 'react';
import { useZoom } from '@/contexts/ZoomContext';
import { Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
  disabled?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ disabled = false }) => {
  const { level, zoomIn, zoomOut, setZoom, resetToFit } = useZoom(); // 使用 level

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Plus 或 Ctrl + = : 放大
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        if (!disabled) zoomIn();
      }
      // Ctrl + Minus 或 Ctrl + - : 缩小
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        if (!disabled) zoomOut();
      }
      // Ctrl + 0 : 重置为适应页面
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        if (!disabled) resetToFit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, zoomIn, zoomOut, resetToFit]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'fit') {
      resetToFit();
    } else {
      const percentage = parseInt(value, 10);
      setZoom(percentage / 100);
    }
  };

  const zoomPercentage = Math.round(level * 100); // 使用 level

  // 预设的缩放选项
  const presetOptions = [25, 50, 75, 100, 125, 150, 200];

  return (
    <div className="flex items-center gap-2">
      {/* 缩小按钮 */}
      <button
        onClick={zoomOut}
        disabled={disabled || level <= 0.25} // 使用 level
        className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="缩小"
        title="缩小"
      >
        <Minus className="w-4 h-4 text-slate-600" />
      </button>

      {/* 缩放比例选择器 */}
      <label htmlFor="zoom-select" className="sr-only">
        缩放比例
      </label>
      <select
        id="zoom-select"
        value={zoomPercentage}
        onChange={handleSelect}
        disabled={disabled}
        className="px-2 py-1 border border-slate-300 rounded text-sm min-w-[80px] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {presetOptions.map((option) => (
          <option key={option} value={option}>
            {option}%
          </option>
        ))}
        {/* 如果当前缩放级别不在预设值中，动态添加选项 */}
        {!presetOptions.includes(zoomPercentage) && (
          <option value={zoomPercentage}>{zoomPercentage}%</option>
        )}
        <option value="fit">适应页面</option>
      </select>

      {/* 放大按钮 */}
      <button
        onClick={zoomIn}
        disabled={disabled || level >= 4.0} // 使用 level
        className="p-1 hover:bg-slate-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="放大"
        title="放大"
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
