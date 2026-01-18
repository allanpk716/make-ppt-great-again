import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { usePPTStore } from '@/stores/pptStore';
import { FabricConverter } from '@/lib/fabricConverter';

export const FabricCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const { currentSlideId, slides, updateSlideData, selectElement, selectedElementId } = usePPTStore();

  const currentSlide = slides.find(s => s.id === currentSlideId);

  // 初始化 Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 Fabric Canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 640,
      height: 360,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true
    });

    fabricCanvasRef.current = canvas;

    // 选中事件监听
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        const id = (selected as any).id;
        selectElement(id || null);
      }
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected) {
        const id = (selected as any).id;
        selectElement(id || null);
      }
    });

    canvas.on('selection:cleared', () => {
      selectElement(null);
    });

    // 对象修改事件监听
    canvas.on('object:modified', () => {
      saveToStore();
    });

    return () => {
      canvas.dispose();
    };
  }, [selectElement]);

  // 加载幻灯片数据到画布
  useEffect(() => {
    if (!fabricCanvasRef.current || !currentSlide) return;

    FabricConverter.pageToFabric(currentSlide.data, fabricCanvasRef.current);

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

  // 保存到 store
  const saveToStore = () => {
    if (!fabricCanvasRef.current || !currentSlideId) return;

    const pageData = FabricConverter.fabricToPage(fabricCanvasRef.current);
    updateSlideData(currentSlideId, pageData);
  };

  // 对象移动后保存
  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const handleMouseMove = () => {
      // 节流保存可以在这里优化
    };

    fabricCanvasRef.current.on('object:moving', handleMouseMove);
    fabricCanvasRef.current.on('object:scaling', handleMouseMove);

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.off('object:moving', handleMouseMove);
        fabricCanvasRef.current.off('object:scaling', handleMouseMove);
      }
    };
  }, []);

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
