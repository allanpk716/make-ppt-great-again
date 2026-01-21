import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ppt-copilot-width';
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 320;

interface LayoutContextValue {
  chatWidth: number;
  setChatWidth: (width: number) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return context;
};

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chatWidth, setChatWidthState] = useState<number>(DEFAULT_WIDTH);

  // 初始化时从 localStorage 读取
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH) {
          setChatWidthState(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      // 降级为内存状态
    }
  }, []);

  const setChatWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_WIDTH, width);
    setChatWidthState(clampedWidth);

    try {
      localStorage.setItem(STORAGE_KEY, clampedWidth.toString());
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
      // 降级为内存状态
    }
  }, []);

  // 窗口调整时确保宽度不溢出
  useEffect(() => {
    const handleResize = () => {
      const maxWidth = window.innerWidth - 500; // 减去左侧栏+PPT最小宽度
      if (chatWidth > maxWidth) {
        setChatWidth(maxWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chatWidth, setChatWidth]);

  return (
    <LayoutContext.Provider value={{ chatWidth, setChatWidth }}>{children}</LayoutContext.Provider>
  );
};
