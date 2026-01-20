import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { ZoomContextValue, ZoomState } from '@/types/zoom';
import { usePPTStore } from '@/stores/pptStore';

const STORAGE_KEY = 'ppt-copilot-zoom';
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const DEFAULT_ZOOM = 1.0;

const ZoomContext = createContext<ZoomContextValue | undefined>(undefined);

export const useZoom = () => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within ZoomProvider');
  }
  return context;
};

// 从 localStorage 加载缩放设置
const loadZoomFromStorage = (): { level: number; isAutoFit: boolean } | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.level && !isNaN(parsed.level) && parsed.level >= MIN_ZOOM && parsed.level <= MAX_ZOOM) {
        return { level: parsed.level, isAutoFit: parsed.isAutoFit || false };
      }
    }
  } catch (error) {
    console.warn('无法读取缩放设置，使用默认值:', error);
  }
  return null;
};

// 保存缩放设置到 localStorage
const saveZoomToStorage = (level: number, isAutoFit: boolean): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ level, isAutoFit }));
  } catch (error) {
    console.warn('无法保存缩放设置:', error);
  }
};

export const ZoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { slides, currentSlideId } = usePPTStore();
  const [state, setState] = React.useState<ZoomState>({
    level: DEFAULT_ZOOM,
    isAutoFit: false,
    lastManualLevel: DEFAULT_ZOOM,
  });

  const containerRef = useRef<HTMLElement | null>(null);

  // 初始化时从 localStorage 读取
  useEffect(() => {
    const loaded = loadZoomFromStorage();
    if (loaded) {
      setState({
        level: loaded.level,
        isAutoFit: loaded.isAutoFit,
        lastManualLevel: loaded.level,
      });
    }
  }, []);

  // 计算适应页面的缩放比例
  const calculateFitToPage = useCallback((container: HTMLElement): number => {
    const currentSlide = slides.find(s => s.id === currentSlideId);
    if (!currentSlide) return DEFAULT_ZOOM;

    // PPT 实际尺寸（除以 2 后的显示尺寸）
    const canvasWidth = currentSlide.data.pageSize.width / 2;   // 640px
    const canvasHeight = currentSlide.data.pageSize.height / 2; // 360px

    // 可用容器尺寸（减去 padding 64px）
    const availableWidth = container.clientWidth - 64;
    const availableHeight = container.clientHeight - 64;

    // 计算两个方向的缩放比例
    const scaleX = availableWidth / canvasWidth;
    const scaleY = availableHeight / canvasHeight;

    // 取较小值确保完整显示，最大不超过 1.0（100%）
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    // 确保不小于最小缩放 0.25
    return Math.max(fitScale, MIN_ZOOM);
  }, [slides, currentSlideId]);

  // 设置缩放级别
  const setZoom = useCallback((level: number) => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    setState({
      level: clampedLevel,
      isAutoFit: false,
      lastManualLevel: clampedLevel,
    });
    saveZoomToStorage(clampedLevel, false);
  }, []);

  // 放大
  const zoomIn = useCallback(() => {
    setState(prev => {
      const newLevel = Math.min(MAX_ZOOM, prev.level + 0.25);
      saveZoomToStorage(newLevel, false);
      return {
        level: newLevel,
        isAutoFit: false,
        lastManualLevel: newLevel,
      };
    });
  }, []);

  // 缩小
  const zoomOut = useCallback(() => {
    setState(prev => {
      const newLevel = Math.max(MIN_ZOOM, prev.level - 0.25);
      saveZoomToStorage(newLevel, false);
      return {
        level: newLevel,
        isAutoFit: false,
        lastManualLevel: newLevel,
      };
    });
  }, []);

  // 重置为适应页面
  const resetToFit = useCallback(() => {
    if (!containerRef.current) return;
    const fitLevel = calculateFitToPage(containerRef.current);
    setState(prev => ({
      level: fitLevel,
      isAutoFit: true,
      lastManualLevel: prev.lastManualLevel,
    }));
    saveZoomToStorage(fitLevel, true);
  }, [calculateFitToPage]);

  // 注册容器引用
  const registerContainer = useCallback((container: HTMLElement | null) => {
    containerRef.current = container;
  }, []);

  const value: ZoomContextValue = {
    level: state.level,  // 注意：使用 level 而不是 zoom
    isAutoFit: state.isAutoFit,
    setZoom,
    zoomIn,
    zoomOut,
    resetToFit,
    calculateFitToPage,
    registerContainer,
  };

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};
