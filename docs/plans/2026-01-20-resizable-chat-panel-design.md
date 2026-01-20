# 可调整大小的聊天面板 - 设计文档

## 目标

实现 PPT 内容区域和 AI 聊天面板之间的可拖拽分隔功能，允许用户自由调整两者宽度比例。

## 功能需求

- 在 PPT 区域和聊天面板之间添加可拖拽分隔线
- 实时改变面板宽度（拖拽时即时反馈）
- 保存用户宽度偏好到 localStorage
- 设置最小宽度限制防止面板过窄
- 支持窗口调整大小自适应

## 架构设计

### 组件层次结构

```
App
├── SlideSidebar
└── ResizableLayout          [新建]
    ├── LayoutProvider       [新建]
    ├── Workspace            [保持 flex-1]
    ├── ResizableHandle      [新建]
    └── CopilotPanel         [动态宽度]
```

### 状态管理

使用 React Context + localStorage 实现状态共享和持久化。

**Context 接口：**
```typescript
interface LayoutContextValue {
  chatWidth: number;
  setChatWidth: (width: number) => void;
}
```

**存储配置：**
- localStorage key: `ppt-copilot-width`
- 默认宽度: 320px
- 最小宽度: 320px
- PPT 最小宽度: 500px
- 最大宽度: `window.innerWidth - 500px`

## 组件设计

### 1. LayoutContext

**文件:** `src/contexts/LayoutContext.tsx`

**职责:**
- 管理聊天面板宽度状态
- 处理 localStorage 读写
- 提供宽度更新函数

**实现要点:**
- 初始化从 localStorage 读取，失败则使用默认值
- setChatWidth 同时更新 state 和 localStorage
- 捕获 localStorage 异常，降级为内存状态

### 2. ResizableHandle

**文件:** `src/components/ResizableLayout/ResizableHandle.tsx`

**职责:**
- 渲染可拖拽分隔线
- 处理鼠标拖拽事件
- 计算新宽度并更新 Context

**视觉设计:**
- 4px 宽，灰色背景 (`bg-slate-300`)
- 悬停时变蓝色 (`hover:bg-blue-400`)
- 显示拖拽图标 (`|||`)
- 拖拽光标 (`cursor: col-resize`)

**交互逻辑:**
1. onMouseDown: 开始拖拽，设置拖拽标志
2. onMouseMove (window): 计算新宽度，更新 Context
3. onMouseUp (window): 结束拖拽，清理事件监听

**边界检查:**
```typescript
const minWidth = 320;
const maxWidth = window.innerWidth - 500;
const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
```

### 3. ResizableLayout

**文件:** `src/components/ResizableLayout/index.tsx`

**职责:**
- 提供 LayoutContext
- 协调 Workspace、Handle、CopilotPanel 布局

**实现:**
```tsx
<LayoutProvider>
  <div className="flex-1 flex overflow-hidden">
    <Workspace />
    <ResizableHandle />
    <CopilotPanel style={{ width: `${chatWidth}px` }} />
  </div>
</LayoutProvider>
```

### 4. CopilotPanel 调整

**文件:** `src/components/CopilotPanel/index.tsx`

**改动:**
- 移除固定宽度类 `w-80`
- 从 Context 读取宽度
- 应用动态 style

## 数据流

```
用户拖拽分隔线
  ↓
ResizableHandle 监听 onMouseMove
  ↓
计算新宽度并边界检查
  ↓
调用 setChatWidth(newWidth)
  ↓
更新 Context state + 保存到 localStorage
  ↓
Workspace 和 CopilotPanel 重新渲染
```

## 错误处理

1. **localStorage 不可用**: 捕获异常，降级为纯内存状态
2. **窗口调整**: 监听 resize 事件，自动调整宽度避免溢出
3. **越界拖拽**: 使用 Math.max/min 限制在有效范围内

## 性能优化

- 使用 useCallback 缓存事件处理函数
- 拖拽时禁用 CSS 过渡动画 (`transition-none`)
- 必要时使用 requestAnimationFrame 节流

## 测试场景

| 场景 | 预期行为 |
|------|---------|
| 拖拽到最左 | 聊天面板停在 320px |
| 拖拽到最右 | PPT 区域停在 500px |
| 快速拖拽 | 宽度更新平滑无卡顿 |
| 刷新页面 | 宽度恢复到上次值 |
| 窗口调整 | 布局自适应，无溢出 |

## 文件清单

**新建文件:**
- `src/contexts/LayoutContext.tsx`
- `src/components/ResizableLayout/index.tsx`
- `src/components/ResizableLayout/ResizableHandle.tsx`

**修改文件:**
- `src/App.tsx` - 引入 ResizableLayout
- `src/components/CopilotPanel/index.tsx` - 使用动态宽度

## 依赖

无需新增依赖，使用现有 React + TypeScript + Tailwind CSS。
