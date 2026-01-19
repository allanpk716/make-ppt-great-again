import React, { useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { usePPTStore } from '@/stores/pptStore';
import { FabricConverter } from '@/lib/fabricConverter';

// 节流函数
function throttle<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  return ((...args: any[]) => {
    const now = Date.now();
    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func(...args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func(...args);
      }, remaining);
    }
  }) as T;
}

export const FabricCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentSlideId, slides, updateSlideData, selectElement, selectedElementId } = usePPTStore();

  const currentSlide = slides.find(s => s.id === currentSlideId);

  // 节流的保存函数
  const saveToStore = useCallback(
    throttle(() => {
      if (!fabricCanvasRef.current || !currentSlideId) return;

      const pageData = FabricConverter.fabricToPage(fabricCanvasRef.current);
      updateSlideData(currentSlideId, pageData);
    }, 500), // 500ms 节流
    [currentSlideId, updateSlideData]
  );

  // 初始化 Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 640,
      height: 360,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      renderOnAddRemove: false // 性能优化：手动控制渲染
    });

    fabricCanvasRef.current = canvas;

    // 选中事件监听
    canvas.on('selection:created', (e: any) => {
      const selected = e.selected?.[0];
      if (selected) {
        const id = (selected as any).id;
        selectElement(id || null);
      }
    });

    canvas.on('selection:updated', (e: any) => {
      const selected = e.selected?.[0];
      if (selected) {
        const id = (selected as any).id;
        selectElement(id || null);
      }
    });

    canvas.on('selection:cleared', () => {
      selectElement(null);
    });

    // 对象修改事件监听（使用节流保存）
    canvas.on('object:modified', () => {
      saveToStore();
    });

    // 对象移动和缩放事件（使用节流保存）
    canvas.on('object:moving', saveToStore);
    canvas.on('object:scaling', saveToStore);

    return () => {
      // 清理定时器
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      canvas.dispose();
    };
  }, [selectElement, saveToStore]);

  // 加载幻灯片数据到画布
  useEffect(() => {
    if (!fabricCanvasRef.current || !currentSlide) return;

    // 批量操作，避免频繁渲染
    fabricCanvasRef.current.renderOnAddRemove = false;
    FabricConverter.pageToFabric(currentSlide.data, fabricCanvasRef.current);
    fabricCanvasRef.current.renderOnAddRemove = true;

    // 一次性渲染所有对象
    fabricCanvasRef.current.renderAll();

    // 设置选中状态
    if (selectedElementId) {
      const objects = fabricCanvasRef.current.getObjects();
      const selectedObj = objects.find(obj => (obj as any).id === selectedElementId);
      if (selectedObj) {
        fabricCanvasRef.current.setActiveObject(selectedObj);
        fabricCanvasRef.current.renderAll();
      }
    }
  }, [currentSlide, selectedElementId]);

  if (!currentSlide) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
        未选择幻灯片
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="border border-slate-200"
    />
  );
};
