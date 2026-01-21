import React, { useEffect, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePPTStore } from '@/stores/pptStore';
import { Plus, Trash2 } from 'lucide-react';
import { ThumbnailGenerator } from '@/lib/thumbnailGenerator';
import { SlideCard } from './SlideCard';

export const SlideSidebar: React.FC = () => {
  const { slides, currentSlideId, addSlide, deleteSlide, switchSlide, reorderSlides } =
    usePPTStore();

  // 设置拖拽传感器
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const generatingRef = useRef<Set<string>>(new Set());

  // 生成单个缩略图
  const generateThumbnail = async (slideId: string) => {
    if (generatingRef.current.has(slideId)) return;

    generatingRef.current.add(slideId);

    try {
      const slide = slides.find((s) => s.id === slideId);
      if (!slide) return;

      const dataUrl = await ThumbnailGenerator.generateThumbnail(slide.data);

      setThumbnails((prev) => new Map(prev).set(slideId, dataUrl));
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    } finally {
      generatingRef.current.delete(slideId);
    }
  };

  // 初始化和更新缩略图
  useEffect(() => {
    slides.forEach((slide) => {
      if (!thumbnails.has(slide.id)) {
        generateThumbnail(slide.id);
      }
    });
  }, [slides]);

  // 清理无效的缩略图
  useEffect(() => {
    const validIds = new Set(slides.map((s) => s.id));
    setThumbnails((prev) => {
      const cleaned = new Map<string, string>();
      prev.forEach((value, key) => {
        if (validIds.has(key)) {
          cleaned.set(key, value);
        }
      });
      return cleaned;
    });
  }, [slides]);

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSlides = arrayMove(slides, oldIndex, newIndex);
        reorderSlides(newSlides.map((s) => s.id));
      }
    }
  };

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-full">
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
              <div className="text-center text-sm text-slate-400 py-8">点击 + 添加幻灯片</div>
            ) : (
              <SortableContext
                items={slides.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {slides.map((slide) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    onClick={switchSlide}
                    onDelete={deleteSlide}
                    isSelected={currentSlideId === slide.id}
                  />
                ))}
              </SortableContext>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
};
