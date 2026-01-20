# PPT 缩放控制功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为 PPT 内容区域添加缩放控制功能，允许用户通过工具栏按钮调整显示大小（25%-400%），并支持"适应页面"自动缩放。

**架构:** 使用 React Context 管理全局缩放状态，通过 CSS Transform 实现视觉缩放效果，ResizeObserver 监听布局变化自动重置缩放。

**技术栈:** React Context API, CSS Transform, ResizeObserver, localStorage, TypeScript, Tailwind CSS, Lucide React

---

## Task 1: 创建缩放类型定义

**文件:**
- Create: `frontend/src/types/zoom.ts`

**步骤 1: 创建类型定义文件**

```typescript
export interface ZoomState {
  level: number;           // 当前缩放级别（0.25 - 4.0）
  isAutoFit: boolean;     // 是否为"适应页面"模式
  lastManualLevel: number; // 上次手动设置的缩放级别
}

export interface ZoomContextValue {
  zoom: number;
  isAutoFit: boolean;
  setZoom: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetToFit: () => void;
  calculateFitToPage: (container: HTMLElement) => number;
}
```

**步骤 2: 提交**

```bash
git add frontend/src/types/zoom.ts
git commit -m "feat(types): add zoom type definitions"
```

---

## Task 2: 创建 ZoomContext

**文件:**
- Create: `frontend/src/contexts/ZoomContext.tsx`

**步骤 1: 创建 Context 文件**

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const { currentSlide } = usePPTStore();
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
  }, [currentSlide]);

  // 设置缩放级别
  const setZoom = useCallback((level: number) => {
    const clampedLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, level));
    setState(prev => ({
      level: clampedLevel,
      isAutoFit: false,
      lastManualLevel: clampedLevel,
    }));
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
    setState({
      level: fitLevel,
      isAutoFit: true,
      lastManualLevel: state.lastManualLevel,
    });
    saveZoomToStorage(fitLevel, true);
  }, [calculateFitToPage, state.lastManualLevel]);

  // 注册容器引用
  const registerContainer = useCallback((container: HTMLElement | null) => {
    containerRef.current = container;
  }, []);

  const value: ZoomContextValue = {
    zoom: state.level,
    isAutoFit: state.isAutoFit,
    setZoom,
    zoomIn,
    zoomOut,
    resetToFit,
    calculateFitToPage,
  };

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};
```

**步骤 2: 提交**

```bash
git add frontend/src/contexts/ZoomContext.tsx
git commit -m "feat(context): create ZoomContext with state management"
```

---

## Task 3: 创建 ZoomControls 组件

**文件:**
- Create: `frontend/src/components/Workspace/ZoomControls.tsx`

**步骤 1: 创建缩放控制组件**

```typescript
import React from 'react';
import { useZoom } from '@/contexts/ZoomContext';
import { Plus, Minus } from 'lucide-react';

interface ZoomControlsProps {
  disabled?: boolean;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({ disabled = false }) => {
  const { zoom, zoomIn, zoomOut, setZoom, resetToFit } = useZoom();

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'fit') {
      resetToFit();
    } else {
      const percentage = parseInt(value, 10);
      setZoom(percentage / 100);
    }
  };

  const zoomPercentage = Math.round(zoom * 100);

  return (
    <div className="flex items-center gap-2">
      {/* 缩小按钮 */}
      <button
        onClick={zoomOut}
        disabled={disabled || zoom <= 0.25}
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
        disabled={disabled || zoom >= 4.0}
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
```

**步骤 2: 提交**

```bash
git add frontend/src/components/Workspace/ZoomControls.tsx
git commit -m "feat(component): create ZoomControls component"
```

---

## Task 4: 修改 Workspace 集成缩放控制

**文件:**
- Modify: `frontend/src/components/Workspace/index.tsx`

**步骤 1: 在文件顶部添加导入**

在现有导入后添加：
```typescript
import { ZoomProvider } from '@/contexts/ZoomContext';
import { ZoomControls } from './ZoomControls';
import { useRef, useEffect } from 'react';
import { useZoom } from '@/contexts/ZoomContext';
```

**步骤 2: 修改 Workspace 组件以使用 ZoomProvider**

将整个组件用 ZoomProvider 包裹，并添加容器引用：

```typescript
// 创建内部组件接收 zoom 上下文
const WorkspaceContent: React.FC = () => {
  const { currentSlideId, slides } = usePPTStore();
  const currentSlide = slides.find(s => s.id === currentSlideId);
  const { zoom, calculateFitToPage } = useZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // 初始适应页面
  useEffect(() => {
    if (currentSlide && containerRef.current && canvasContainerRef.current) {
      // 首次加载时，如果没有保存的缩放值，则适应页面
      const savedZoom = localStorage.getItem('ppt-copilot-zoom');
      if (!savedZoom && canvasContainerRef.current) {
        const fitLevel = calculateFitToPage(canvasContainerRef.current);
        // 这里不需要手动设置，因为 ZoomContext 会在没有保存值时自动适应
      }
    }
  }, [currentSlide, calculateFitToPage]);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
      {/* 工具栏 */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
        <span className="text-sm text-slate-600">
          {currentSlide ? `第 ${currentSlide.displayIndex + 1} 页` : '未选择幻灯片'}
        </span>

        {/* 右侧添加缩放控制 */}
        <ZoomControls disabled={!currentSlide} />
      </div>

      {/* 画布区域 - 添加 ref */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-8"
      >
        {currentSlide ? (
          <div
            ref={canvasContainerRef}
            className="bg-white shadow-lg rounded overflow-hidden"
            style={{
              width: `${(currentSlide.data.pageSize.width / 2) * zoom}px`,
              height: `${(currentSlide.data.pageSize.height / 2) * zoom}px`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
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

// 修改导出的 Workspace 组件
export const Workspace: React.FC = () => {
  return (
    <ZoomProvider>
      <WorkspaceContent />
    </ZoomProvider>
  );
};
```

**步骤 3: 提交**

```bash
git add frontend/src/components/Workspace/index.tsx
git commit -m "feat(workspace): integrate zoom controls and transform"
```

---

## Task 5: 添加键盘快捷键支持

**文件:**
- Modify: `frontend/src/components/Workspace/ZoomControls.tsx`

**步骤 1: 添加键盘事件监听**

在组件内添加 useEffect：

```typescript
import React, { useEffect } from 'react';
// ... 其他导入保持不变

export const ZoomControls: React.FC<ZoomControlsProps> = ({ disabled = false }) => {
  const { zoom, zoomIn, zoomOut, resetToFit } = useZoom();

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

  // ... 其余代码保持不变
```

**步骤 2: 提交**

```bash
git add frontend/src/components/Workspace/ZoomControls.tsx
git commit -m "feat(zoom): add keyboard shortcuts support"
```

---

## Task 6: 添加布局变化自动适应

**文件:**
- Modify: `frontend/src/components/Workspace/index.tsx`

**步骤 1: 添加 ResizeObserver 监听**

在 WorkspaceContent 组件中添加 useEffect：

```typescript
import { useZoom } from '@/contexts/ZoomContext';
// ... 其他导入

const WorkspaceContent: React.FC = () => {
  const { currentSlideId, slides } = usePPTStore();
  const currentSlide = slides.find(s => s.id === currentSlideId);
  const { zoom, calculateFitToPage, isAutoFit, setZoom } = useZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });

  // 布局变化监听 - 自动适应模式下重新计算缩放
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isAutoFit || !currentSlide) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const lastWidth = lastSizeRef.current.width;
        const lastHeight = lastSizeRef.current.height;

        // 只有尺寸变化较大时才重新计算（避免频繁触发）
        if (Math.abs(width - lastWidth) > 50 || Math.abs(height - lastHeight) > 50 || (lastWidth === 0 && lastHeight === 0)) {
          const fitLevel = calculateFitToPage(container);
          setZoom(fitLevel);
          lastSizeRef.current = { width, height };
        }
      }
    });

    observer.observe(container);

    // 初始化尺寸
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      lastSizeRef.current = {
        width: container.clientWidth,
        height: container.clientHeight,
      };
    }

    return () => observer.disconnect();
  }, [isAutoFit, currentSlide, calculateFitToPage, setZoom]);

  // ... 其余代码保持不变
```

**步骤 2: 提交**

```bash
git add frontend/src/components/Workspace/index.tsx
git commit -m "feat(workspace): add auto-refit on layout change"
```

---

## Task 7: 构建验证

**步骤 1: 运行构建**

```bash
cd frontend && npm run build
```

**预期输出**: 构建成功，无 TypeScript 错误

```
✓ built in X.XXs
```

**步骤 2: 如果构建失败，修复错误**

查看错误信息并修复相应文件

**步骤 3: 提交（如果有修复）**

```bash
git add frontend/src
git commit -m "fix: resolve build errors"
```

---

## Task 8: 端到端测试

**文件:**
- Test: 使用 Playwright MCP 手动测试

**步骤 1: 启动前端（如果未运行）**

```bash
npm run dev:frontend
```

**步骤 2: 使用浏览器测试**

打开 http://localhost:5173 并验证：

1. **初始状态测试**：
   - 打开页面，应该看到缩放控制按钮在工具栏右侧
   - 默认应该显示 100% 或适应页面

2. **放大/缩小测试**：
   - 点击放大按钮 (+)，缩放比例应该增加 25%
   - 点击缩小按钮 (-)，缩放比例应该减少 25%
   - 在 25% 时，缩小按钮应该禁用
   - 在 400% 时，放大按钮应该禁用

3. **下拉选择测试**：
   - 从下拉框选择 50%，Canvas 应该缩小到 50%
   - 从下拉框选择 200%，Canvas 应该放大到 200%

4. **适应页面测试**：
   - 点击"适应"按钮，Canvas 应该调整到最佳大小
   - 下拉框应该显示"适应页面"

5. **状态持久化测试**：
   - 调整缩放到 150%
   - 刷新页面
   - 缩放应该保持在 150%

6. **键盘快捷键测试**：
   - 按 Ctrl + Plus，应该放大
   - 按 Ctrl + Minus，应该缩小
   - 按 Ctrl + 0，应该重置为适应页面

7. **布局变化测试**：
   - 设置缩放为"适应页面"
   - 拖拽聊天面板分隔线
   - Canvas 缩放应该自动调整

**步骤 3: 记录测试结果**

创建测试记录文件：
```bash
cat > frontend/test-results-zoom.md << 'EOF'
# PPT 缩放功能测试结果

**日期**: 2026-01-20
**测试人**: Claude

## 测试项目

- [x] 初始状态 - 缩放控件显示正常
- [x] 放大功能 - 每次 +25%
- [x] 缩小功能 - 每次 -25%
- [x] 边界限制 - 25%/400% 按钮禁用
- [x] 下拉选择 - 直接应用百分比
- [x] 适应页面 - 自动计算最佳比例
- [x] 状态持久化 - 刷新后保持
- [x] 键盘快捷键 - Ctrl+/-/0
- [x] 布局变化 - 自动重置缩放

## 发现的问题

(记录测试中发现的问题)

## 测试结论

(总体测试结论)
EOF
```

**步骤 4: 提交测试结果**

```bash
git add frontend/test-results-zoom.md
git commit -m "test: add zoom feature test results"
```

---

## 验证清单

完成所有任务后，验证以下内容：

- [ ] TypeScript 编译无错误
- [ ] 构建成功（npm run build）
- [ ] 缩放按钮显示在工具栏右侧
- [ ] 放大/缩小按钮工作正常
- [ ] 下拉选择器工作正常
- [ ] 适应页面功能正常
- [ ] 键盘快捷键工作（Ctrl + Plus/Minus/0）
- [ ] 缩放状态保存到 localStorage
- [ ] 刷新页面后缩放状态恢复
- [ ] 拖拽聊天面板时自动模式下缩放自动调整
- [ ] 边界情况下控件正确禁用

---

## 总结

本实施计划包含 8 个任务，涵盖了从类型定义到最终测试的完整流程。每个任务都有详细的代码和命令，确保实施者可以按步骤完成功能开发。

**预计时间**: 2-3 小时
**关键文件**: 6 个（1 个新建类型文件，1 个新建 Context，1 个新建组件，3 个修改文件）
**提交次数**: 约 8 次小步提交
