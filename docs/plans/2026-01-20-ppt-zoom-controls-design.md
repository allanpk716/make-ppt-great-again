# PPT 内容区域缩放功能设计文档

**日期**: 2026-01-20
**状态**: 设计完成，待实现

---

## 概述

为 PPT 内容区域添加缩放控制功能，允许用户通过工具栏按钮或下拉选择器调整 PPT 显示大小，支持 25%-400% 的缩放范围，并提供"适应页面"自动缩放功能。

**核心需求**：
- 缩放控制位于 Workspace 工具栏右侧
- 缩放范围：25% - 400%，步进 25%
- 操作方式：放大/缩小按钮 + 百分比下拉选择器
- 缩放状态持久化到 localStorage
- 默认缩放：适应页面（自动计算最佳比例）

---

## 组件架构

### 文件结构

```
frontend/src/
├── contexts/
│   └── ZoomContext.tsx (新建) - 缩放状态管理
├── components/
│   ├── Workspace/
│   │   ├── index.tsx (修改) - 集成缩放控制
│   │   ├── FabricCanvas.tsx (修改) - 应用缩放变换
│   │   └── ZoomControls.tsx (新建) - 缩放控制按钮
│   └── ResizableLayout/
│       └── ResizableHandle.tsx (修改) - 监听布局变化通知缩放重置
└── types/
    └── zoom.ts (新建) - 缩放相关类型定义
```

### 核心组件职责

#### 1. ZoomContext
管理全局缩放状态，提供缩放控制方法。

**状态**：
```typescript
interface ZoomState {
  level: number;           // 当前缩放级别（0.25 - 4.0）
  isAutoFit: boolean;     // 是否为"适应页面"模式
  lastManualLevel: number; // 上次手动设置的缩放级别
}
```

**方法**：
- `zoom: number` - 当前缩放级别 getter
- `setZoom(level: number)` - 设置缩放级别（0.25-4.0）
- `zoomIn()` - 放大 25%
- `zoomOut()` - 缩小 25%
- `resetToFit()` - 重置为适应页面模式
- `calculateFitToPage(container: HTMLElement)` - 计算适应页面的缩放比例

#### 2. ZoomControls
工具栏右侧的缩放控制组件。

**UI 元素**：
- 缩小按钮（-）- 25% 时禁用
- 百分比下拉选择器（25%, 50%, 75%, 100%, 125%, 150%, 200%, 适应页面）
- 放大按钮（+）- 400% 时禁用
- "适应"快捷按钮

#### 3. FabricCanvas 容器
应用 CSS transform 实现缩放效果。

```tsx
<div style={{
  width: `${(canvasWidth * zoomLevel)}px`,
  height: `${(canvasHeight * zoomLevel)}px`,
}}>
  <div style={{
    transform: `scale(${zoomLevel})`,
    transformOrigin: 'center center',
    width: `${canvasWidth}px`,
    height: `${canvasHeight}px`
  }}>
    <FabricCanvas />
  </div>
</div>
```

#### 4. Workspace
集成 ZoomProvider 和 ZoomControls。

---

## 数据流和状态管理

### 初始化流程

```
Workspace 挂载
  ↓
ZoomProvider 初始化
  ↓
从 localStorage 读取保存的缩放级别
  ↓
若无保存值 → 调用 calculateFitToPage() 自动计算
  ↓
应用 CSS transform 到 Canvas 容器
```

### 用户操作流程

**放大/缩小**：
```
用户点击按钮
  ↓
更新 level (±0.25)
  ↓
边界检查 (0.25-4.0)
  ↓
设置 isAutoFit = false
  ↓
保存到 localStorage
  ↓
应用 CSS transform
```

**选择下拉框**：
```
用户选择百分比
  ↓
直接设置 level
  ↓
设置 isAutoFit = false
  ↓
保存到 localStorage
  ↓
应用 CSS transform
```

**适应页面**：
```
用户点击"适应"按钮
  ↓
调用 calculateFitToPage()
  ↓
设置 isAutoFit = true
  ↓
保存到 localStorage
  ↓
应用 CSS transform
```

### 布局变化响应

```
ResizableHandle 调整宽度
  ↓
ResizeObserver 检测到容器尺寸变化
  ↓
如果 isAutoFit === true
  ↓
自动重新计算并应用适应页面缩放
```

---

## 适应页面算法

### 核心实现

```typescript
const calculateFitToPage = useCallback((containerRef: HTMLElement): number => {
  if (!currentSlide) return 1.0;

  // PPT 实际尺寸（除以 2 后的显示尺寸）
  const canvasWidth = currentSlide.data.pageSize.width / 2;   // 640px
  const canvasHeight = currentSlide.data.pageSize.height / 2; // 360px

  // 可用容器尺寸（减去 padding 64px）
  const availableWidth = containerRef.clientWidth - 64;
  const availableHeight = containerRef.clientHeight - 64;

  // 计算两个方向的缩放比例
  const scaleX = availableWidth / canvasWidth;
  const scaleY = availableHeight / canvasHeight;

  // 取较小值确保完整显示，最大不超过 1.0（100%）
  const fitScale = Math.min(scaleX, scaleY, 1.0);

  // 确保不小于最小缩放 0.25
  return Math.max(fitScale, 0.25);
}, [currentSlide]);
```

### 自动重置时机

1. **初始加载**：首次打开或 localStorage 无值时
2. **切换幻灯片**：当 `currentSlideId` 改变时
3. **布局调整**：监听 Workspace 容器的 ResizeObserver，当尺寸变化超过 50px 时触发
4. **手动触发**：用户点击"适应页面"按钮

### 布局监听实现

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container || !isAutoFit) return;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      // 只有尺寸变化较大时才重新计算（避免频繁触发）
      if (Math.abs(width - lastWidth) > 50 || Math.abs(height - lastHeight) > 50) {
        recalculateFitToPage();
        setLastWidth(width);
        setLastHeight(height);
      }
    }
  });

  observer.observe(container);
  return () => observer.disconnect();
}, [isAutoFit, recalculateFitToPage]);
```

---

## UI 组件设计

### ZoomControls 组件结构

```tsx
<div className="flex items-center gap-2">
  {/* 缩小按钮 */}
  <button
    onClick={zoomOut}
    disabled={zoomLevel <= 0.25}
    className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
    aria-label="缩小"
  >
    <Minus className="w-4 h-4" />
  </button>

  {/* 缩放比例选择器 */}
  <select
    value={Math.round(zoomLevel * 100)}
    onChange={handleSelect}
    className="px-2 py-1 border rounded text-sm min-w-[80px]"
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
    disabled={zoomLevel >= 4.0}
    className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
    aria-label="放大"
  >
    <Plus className="w-4 h-4" />
  </button>

  {/* 适应页面快捷按钮 */}
  <button
    onClick={resetToFit}
    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded"
    title="适应页面大小"
  >
    适应
  </button>
</div>
```

### Workspace 工具栏修改

```tsx
// 工具栏
<div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4">
  <span className="text-sm text-slate-600">
    {currentSlide ? `第 ${currentSlide.displayIndex + 1} 页` : '未选择幻灯片'}
  </span>

  {/* 右侧添加缩放控制 */}
  <ZoomControls disabled={!currentSlide} />
</div>
```

### 交互细节

1. **按钮状态**：
   - 缩小按钮在 zoomLevel <= 0.25 时禁用
   - 放大按钮在 zoomLevel >= 4.0 时禁用
   - 未选择幻灯片时，所有控件禁用

2. **下拉框行为**：
   - 显示当前百分比
   - 手动选择后立即应用
   - "适应页面"选项计算最佳比例

3. **视觉反馈**：
   - Hover 状态显示背景色
   - 禁用状态半透明显示
   - 当前缩放比例清晰可见

---

## 错误处理和边界情况

### localStorage 故障处理

```typescript
// 读取时的容错
const loadZoomFromStorage = (): number | null => {
  try {
    const saved = localStorage.getItem('ppt-copilot-zoom');
    if (saved) {
      const parsed = parseFloat(saved);
      // 验证范围
      if (!isNaN(parsed) && parsed >= 0.25 && parsed <= 4.0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('无法读取缩放设置，使用默认值:', error);
  }
  return null; // 触发适应页面计算
};

// 保存时的容错
const saveZoomToStorage = (level: number): void => {
  try {
    localStorage.setItem('ppt-copilot-zoom', level.toString());
  } catch (error) {
    console.warn('无法保存缩放设置:', error);
    // 静默失败，不影响功能
  }
};
```

### 边界情况处理

1. **空幻灯片状态**：
   - 未选择幻灯片时，禁用所有缩放控制
   - 显示提示："请先选择幻灯片"

2. **极端缩放比例**：
   - 25% 时禁用缩小按钮，Canvas 可能需要滚动查看
   - 400% 时禁用放大按钮，容器自动扩展尺寸

3. **快速连续操作**：
   - 使用防抖处理缩放计算
   - ResizeObserver 添加 50px 阈值避免频繁触发

4. **浏览器兼容性**：
   - CSS transform 广泛支持，无需降级
   - ResizeObserver 使用 polyfill（若需支持旧浏览器）

5. **内存泄漏防护**：
   - ResizeObserver 在组件卸载时断开连接
   - useEffect cleanup 清理所有事件监听器

6. **容器尺寸异常**：
   - 容器太小无法完整显示 PPT：最小缩放到 25%，允许滚动
   - PPT 尺寸异常：使用默认值 640x360
   - 窗口极小：保证 25% 最小缩放，Canvas 可滚动查看

---

## 测试场景

### 功能测试

| 场景 | 操作 | 预期结果 |
|------|------|----------|
| 初次访问 | 打开应用 | 自动适应页面缩放 |
| 手动缩放 | 点击放大/缩小 | 缩放比例 ±25%，边界处按钮禁用 |
| 下拉选择 | 选择百分比 | 直接应用该缩放比例 |
| 适应页面 | 点击"适应"按钮 | 计算并应用最佳比例 |
| 状态持久化 | 刷新页面 | 恢复上次缩放比例 |
| 切换幻灯片 | 选择不同幻灯片 | 保持当前缩放或触发适应页面 |
| 布局调整 | 拖拽聊天面板 | 自动模式下重新计算适应页面 |
| 极限缩放 | 缩放到 25%/400% | 按钮禁用状态正确 |
| 空状态 | 未选择幻灯片 | 所有控件禁用 |

### 性能测试

- 快速连续点击放大/缩小按钮 → 响应流畅，无卡顿
- 拖拽聊天面板时 → 缩放调整不阻塞拖拽操作
- ResizeObserver 触发频率 → 阈值控制避免过频计算

### 兼容性测试

- Chrome/Edge 最新版本
- Firefox 最新版本
- Safari 最新版本

---

## 实现优先级

### Phase 1: 核心功能（必需）
- [ ] 创建 ZoomContext
- [ ] 创建 ZoomControls 组件
- [ ] 修改 Workspace 集成缩放控制
- [ ] 修改 FabricCanvas 容器应用 transform
- [ ] 实现 localStorage 持久化

### Phase 2: 适应页面（必需）
- [ ] 实现 calculateFitToPage 算法
- [ ] 添加 ResizeObserver 监听
- [ ] 实现自动重置逻辑

### Phase 3: 错误处理（必需）
- [ ] localStorage 故障处理
- [ ] 边界情况处理
- [ ] 禁用状态处理

### Phase 4: 增强（可选）
- [ ] 键盘快捷键（Ctrl + Plus/Minus）
- [ ] 鼠标滚轮缩放（Ctrl + 滚轮）
- [ ] 缩放动画过渡

---

## 技术栈

- **React Context API** - 状态管理
- **CSS Transform** - 缩放实现
- **ResizeObserver API** - 布局监听
- **localStorage** - 状态持久化
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **Lucide React** - 图标（Plus, Minus）

---

## 参考资料

- [CSS transform - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/transform)
- [ResizeObserver - MDN](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [React Context - React Docs](https://react.dev/reference/react/useContext)
