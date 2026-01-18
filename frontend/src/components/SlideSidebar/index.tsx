import React, { useEffect, useState, useRef } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { Plus, Trash2 } from 'lucide-react';
import { ThumbnailGenerator } from '@/lib/thumbnailGenerator';

export const SlideSidebar: React.FC = () => {
  const { slides, currentSlideId, addSlide, deleteSlide, switchSlide } = usePPTStore();
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const generatingRef = useRef<Set<string>>(new Set());

  // 生成单个缩略图
  const generateThumbnail = async (slideId: string, index: number) => {
    if (generatingRef.current.has(slideId)) return;

    generatingRef.current.add(slideId);

    try {
      const slide = slides.find(s => s.id === slideId);
      if (!slide) return;

      const dataUrl = await ThumbnailGenerator.generateThumbnail(slide.data);

      setThumbnails(prev => new Map(prev).set(slideId, dataUrl));
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    } finally {
      generatingRef.current.delete(slideId);
    }
  };

  // 初始化和更新缩略图
  useEffect(() => {
    slides.forEach((slide, index) => {
      if (!thumbnails.has(slide.id)) {
        generateThumbnail(slide.id, index);
      }
    });
  }, [slides]);

  // 清理无效的缩略图
  useEffect(() => {
    const validIds = new Set(slides.map(s => s.id));
    setThumbnails(prev => {
      const cleaned = new Map<string, string>();
      prev.forEach((value, key) => {
        if (validIds.has(key)) {
          cleaned.set(key, value);
        }
      });
      return cleaned;
    });
  }, [slides]);

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">幻灯片</h2>
          <button
            onClick={addSlide}
            className="p-1 hover:bg-slate-200 rounded"
            title="添加幻灯片"
          >
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="text-xs text-slate-500 mt-1">{slides.length} 页</div>
      </div>

      {/* 幻灯片列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {slides.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">
            点击 + 添加幻灯片
          </div>
        ) : (
          slides.map((slide) => (
            <div
              key={slide.id}
              className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all ${
                currentSlideId === slide.id
                  ? 'ring-2 ring-blue-500'
                  : 'hover:ring-1 hover:ring-slate-300'
              }`}
              onClick={() => switchSlide(slide.id)}
            >
              {/* 缩略图 */}
              <div className="aspect-video bg-white border border-slate-200 rounded mb-1 overflow-hidden">
                {thumbnails.get(slide.id) ? (
                  <img
                    src={thumbnails.get(slide.id)}
                    alt={`Slide ${slide.displayIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-slate-400">{slide.displayIndex + 1}</span>
                  </div>
                )}
              </div>

              {/* 页码和删除按钮 */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-slate-600">第 {slide.displayIndex + 1} 页</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSlide(slide.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
