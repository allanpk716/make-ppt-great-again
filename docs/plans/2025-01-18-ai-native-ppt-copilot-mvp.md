# AI-Native PPT Copilot MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个通过自然语言对话生成和修改 PPT 的 Web 应用，实现"所见即所得"的 AI 把控力

**Architecture:** 前端使用 React + Fabric.js 渲染画布，后端管理多个 Claude Code CLI 会话（每页一个），通过 WebSocket 实时传输 stream-json 流式输出。

**Tech Stack:**
- Frontend: React 18 + Vite + Tailwind CSS + Shadcn/UI + Fabric.js v5.3.0
- State Management: Zustand with persist (localStorage)
- Backend: Express + WebSocket
- CLI: Claude Code CLI with `--output-format stream-json`

**AI 集成特性 (2025-01-18 更新):**
- 使用 `--output-format stream-json` 获取完整流式输出
- 使用 `--dangerously-skip-permissions` 跳过交互式权限确认
- 前端完整展示 AI 思考过程和工具调用详情
- 会话按需创建，30 分钟无活动自动清理

---

## 项目结构设计

```
make-ppt-great-again/
├── frontend/                    # React 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── SlideSidebar/   # 左侧栏：缩略图导航
│   │   │   ├── Workspace/      # 中间栏：画布工作区
│   │   │   │   └── FabricCanvas.tsx
│   │   │   └── CopilotPanel/   # 右侧栏：AI 聊天面板
│   │   │       ├── StreamMessageList.tsx  # 消息列表
│   │   │       ├── ThinkingView.tsx       # AI 思考展示
│   │   │       └── ToolCallView.tsx       # 工具调用展示
│   │   ├── lib/
│   │   │   ├── fabricConverter.ts  # 简化格式 → Fabric.js
│   │   │   ├── streamJsonParser.ts # Stream-JSON 解析器
│   │   │   └── pptDataModel.ts     # 数据类型定义
│   │   ├── stores/
│   │   │   └── pptStore.ts         # Zustand 全局状态
│   │   └── types/
│   │       ├── ppt.ts              # TypeScript 类型
│   │       └── stream.ts           # Stream 事件类型
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Express 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── project.ts        # 项目管理 API
│   │   │   └── slides.ts         # 幻灯片 CRUD API
│   │   ├── services/
│   │   │   └── sessionManager.ts # CLI 会话管理 (stream-json)
│   │   └── middleware/
│   │       └── wsHandler.ts      # WebSocket 处理
│   └── package.json
│
├── projects/                    # 用户项目存储
│   └── {project-id}/
│       ├── project.json         # 项目元数据
│       ├── slides/
│       │   ├── {random-id-1}/   # 每页独立目录
│       │   │   ├── page.json    # 简化格式数据
│       │   │   ├── meta.json    # 页面元数据
│       │   │   └── .claude/     # CLI 会话缓存
│       │   └── {random-id-2}/
│       └── exports/             # 导出的项目包
│
└── docs/
    └── plans/
        └── 2025-01-18-ai-native-ppt-copilot-mvp.md
```

---

## Phase 0: 项目初始化

### Task 0.1: 初始化项目结构

**Files:**
- Create: `frontend/package.json`
- Create: `backend/package.json`
- Create: `package.json` (monorepo root)

**Step 1: 配置 monorepo 结构**

创建根目录 `package.json`:

```json
{
  "name": "make-ppt-great-again",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "frontend",
    "backend"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:backend": "cd backend && npm run dev",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "cd frontend && npm run build",
    "build:backend": "cd backend && npm run build"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

**Step 2: 初始化 git**

```bash
git add .
git commit -m "chore: initialize project structure"
```

---

### Task 0.2: 集成 Tailwind CSS 和 Shadcn/UI

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/index.css`

**Step 1: 安装 Tailwind CSS 和依赖**

```bash
cd frontend
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install class-variance-authority clsx tailwind-merge
```

**Step 2: 配置 Tailwind**

创建 `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      colors: {}
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

**Step 3: 添加 Tailwind 指令到 CSS**

修改 `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Step 4: 提交**

```bash
git add frontend/package.json frontend/tailwind.config.js frontend/src/index.css
git commit -m "feat: integrate Tailwind CSS and Shadcn/UI"
```

---

### Task 0.3: 定义数据类型

**Files:**
- Create: `frontend/src/types/ppt.ts`
- Create: `frontend/src/types/stream.ts`

**Step 1: 定义 PPT 数据类型**

创建 `frontend/src/types/ppt.ts`:

```typescript
// 元素基础类型
export interface BaseElement {
  id: string;
  type: 'text' | 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

// 文本元素
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  style: {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fill: string;
    fontFamily: string;
  };
  textAlign: 'left' | 'center' | 'right';
}

// 矩形元素
export interface RectElement extends BaseElement {
  type: 'rect';
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number;
    ry?: number;
  };
}

// 元素联合类型
export type PPTElement = TextElement | RectElement;

// 页面数据（简化格式）
export interface PageData {
  version: string;
  pageSize: {
    width: number;
    height: number;
  };
  background: string;
  elements: PPTElement[];
}

// 页面元数据
export interface SlideMeta {
  summary: string;
  displayIndex: number;
  createdAt: string;
  updatedAt: string;
}

// 幻灯片
export interface Slide {
  id: string;
  displayIndex: number;
  data: PageData;
  meta: SlideMeta;
}

// 项目元数据
export interface ProjectMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

// 项目数据
export interface Project {
  meta: ProjectMeta;
  slides: Slide[];
}

// AI 上下文类型
export type AIContext = {
  type: 'page' | 'element';
  elementId?: string;
};
```

**Step 2: 定义 Stream 事件类型**

创建 `frontend/src/types/stream.ts`:

```typescript
// Stream-JSON 事件类型（根据 Claude Code CLI 输出格式）
export type StreamEvent =
  | { type: 'thinking'; content: string }
  | { type: 'tool_call'; name: string; input: any }
  | { type: 'tool_result'; name: string; output: any }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string };

// WebSocket 消息类型
export interface WSMessage {
  type: 'stream' | 'raw' | 'done' | 'error';
  slideId?: string;
  data?: StreamEvent;
  text?: string;
  error?: string;
}

// 前端消息展示类型
export interface DisplayMessage {
  id: string;
  type: 'user' | 'thinking' | 'tool_call' | 'tool_result' | 'text' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: any;
  toolResult?: any;
  timestamp: Date;
}
```

**Step 3: 提交**

```bash
git add frontend/src/types/ppt.ts frontend/src/types/stream.ts
git commit -m "feat: define PPT and stream data types"
```

---

### Task 0.4: 实现项目导入/导出功能

**Files:**
- Create: `frontend/src/lib/projectManager.ts`
- Create: `backend/src/routes/project.ts`
- Create: `backend/src/services/versionManager.ts`

**Step 1: 实现版本管理服务**

创建 `backend/src/services/versionManager.ts`:

```typescript
interface Migration {
  from: string;
  to: string;
  migrate: (data: any) => any;
}

const migrations: Migration[] = [
  {
    from: '1.0',
    to: '1.1',
    migrate: (data) => {
      // 未来版本迁移逻辑
      return data;
    }
  }
];

export class VersionManager {
  static validateVersion(version: string): boolean {
    return ['1.0'].includes(version);
  }

  static migrate(data: any): any {
    let current = data;
    while (true) {
      const migration = migrations.find(m => m.from === current.version);
      if (!migration) break;
      current = migration.migrate(current);
    }
    return current;
  }

  static getLatestVersion(): string {
    return '1.0';
  }
}
```

**Step 2: 实现前端项目管理器**

创建 `frontend/src/lib/projectManager.ts`:

```typescript
import { ProjectPackage, Project } from '@/types/ppt';

export class ProjectManager {
  static async exportProject(project: Project): Promise<Blob> {
    const exportPackage: ProjectPackage = {
      version: '1.0',
      meta: {
        title: project.meta.title,
        createdAt: project.meta.createdAt,
        exportedAt: new Date().toISOString(),
        appVersion: '0.1.0'
      },
      slides: project.slides.map(slide => ({
        id: slide.id,
        displayIndex: slide.displayIndex,
        data: slide.data,
        meta: slide.meta
      }))
    };

    const json = JSON.stringify(exportPackage, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  static async importProject(file: File): Promise<Project> {
    const text = await file.text();
    const pkg = JSON.parse(text) as ProjectPackage;

    // 验证版本
    const isValid = await fetch('/api/project/validate-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: pkg.version })
    }).then(r => r.json());

    if (!isValid.valid) {
      throw new Error(`不支持的版本: ${pkg.version}`);
    }

    return {
      meta: {
        title: pkg.meta.title,
        createdAt: pkg.meta.createdAt,
        updatedAt: pkg.meta.createdAt,
        version: pkg.version
      },
      slides: pkg.slides.map(s => ({
        id: s.id,
        displayIndex: s.displayIndex,
        data: s.data,
        meta: s.meta
      }))
    };
  }

  static downloadProject(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

**Step 3: 实现后端项目路由**

创建 `backend/src/routes/project.ts`:

```typescript
import express from 'express';
import { VersionManager } from '../services/versionManager';

const router = express.Router();

// 验证版本
router.post('/validate-version', (req, res) => {
  const { version } = req.body;
  const valid = VersionManager.validateVersion(version);
  res.json({ valid, latestVersion: VersionManager.getLatestVersion() });
});

// 迁移数据
router.post('/migrate', (req, res) => {
  try {
    const migrated = VersionManager.migrate(req.body);
    res.json({ success: true, data: migrated });
  } catch (error) {
    res.status(400).json({ success: true, error: (error as Error).message });
  }
});

export default router;
```

**Step 4: 提交**

```bash
git add frontend/src/lib/projectManager.ts backend/src/routes/project.ts backend/src/services/versionManager.ts
git commit -m "feat: implement project import/export with version management"
```

---

## Phase 1: 前端基础框架

### Task 1.1: 设置 Zustand Store

**Files:**
- Create: `frontend/src/stores/pptStore.ts`

**Step 1: 创建 Zustand store**

创建 `frontend/src/stores/pptStore.ts`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Slide, PPTElement, PageData, AIContext } from '@/types/ppt';

interface PPTStore {
  // 项目数据
  slides: Slide[];
  currentSlideId: string | null;
  projectTitle: string;

  // 选中状态
  selectedElementId: string | null;

  // UI 状态
  isNewProject: boolean;

  // 操作方法
  createNewProject: () => void;
  loadProject: (project: { slides: Slide[]; title: string }) => void;
  addSlide: () => void;
  deleteSlide: (id: string) => void;
  switchSlide: (id: string) => void;
  reorderSlides: (slideIds: string[]) => void;
  updateSlideData: (id: string, data: PageData) => void;
  selectElement: (id: string | null) => void;
  getSelectedElement: () => PPTElement | null;
  getCurrentAIContext: () => AIContext;
}

export const usePPTStore = create<PPTStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      slides: [],
      currentSlideId: null,
      projectTitle: '',
      selectedElementId: null,
      isNewProject: true,

      // 创建新项目
      createNewProject: () => {
        set({
          slides: [],
          currentSlideId: null,
          projectTitle: '',
          selectedElementId: null,
          isNewProject: true
        });
      },

      // 加载项目
      loadProject: (project) => {
        set({
          slides: project.slides,
          currentSlideId: project.slides[0]?.id || null,
          projectTitle: project.title,
          isNewProject: false
        });
      },

      // 添加幻灯片
      addSlide: () => {
        const newId = Math.random().toString(36).substring(2, 9);
        const newSlide: Slide = {
          id: newId,
          displayIndex: get().slides.length,
          data: {
            version: '1.0',
            pageSize: { width: 1280, height: 720 },
            background: '#ffffff',
            elements: []
          },
          meta: {
            summary: '空白页',
            displayIndex: get().slides.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };
        set((state) => ({
          slides: [...state.slides, newSlide],
          currentSlideId: newId
        }));
      },

      // 删除幻灯片
      deleteSlide: (id) => {
        set((state) => {
          const newSlides = state.slides.filter(s => s.id !== id);
          return {
            slides: newSlides,
            currentSlideId: state.currentSlideId === id
              ? newSlides[0]?.id || null
              : state.currentSlideId
          };
        });
      },

      // 切换幻灯片
      switchSlide: (id) => {
        set({ currentSlideId: id, selectedElementId: null });
      },

      // 重新排序
      reorderSlides: (slideIds) => {
        set((state) => {
          const slideMap = new Map(state.slides.map(s => [s.id, s]));
          const newSlides = slideIds.map((id, idx) => {
            const slide = slideMap.get(id);
            if (slide) {
              return { ...slide, displayIndex: idx };
            }
            return slide;
          }).filter(Boolean) as Slide[];
          return { slides: newSlides };
        });
      },

      // 更新幻灯片数据
      updateSlideData: (id, data) => {
        set((state) => ({
          slides: state.slides.map(s =>
            s.id === id
              ? { ...s, data, meta: { ...s.meta, updatedAt: new Date().toISOString() } }
              : s
          )
        }));
      },

      // 选中元素
      selectElement: (id) => {
        set({ selectedElementId: id });
      },

      // 获取选中元素
      getSelectedElement: () => {
        const { slides, currentSlideId, selectedElementId } = get();
        if (!currentSlideId || !selectedElementId) return null;
        const slide = slides.find(s => s.id === currentSlideId);
        return slide?.data.elements.find(e => e.id === selectedElementId) || null;
      },

      // 获取当前 AI 上下文
      getCurrentAIContext: () => {
        const { selectedElementId } = get();
        return {
          type: selectedElementId ? 'element' : 'page',
          elementId: selectedElementId || undefined
        };
      }
    }),
    {
      name: 'ppt-storage',
      partialize: (state) => ({
        slides: state.slides,
        currentSlideId: state.currentSlideId,
        projectTitle: state.projectTitle
      })
    }
  )
);
```

**Step 2: 安装 Zustand**

```bash
cd frontend
npm install zustand
```

**Step 3: 提交**

```bash
git add frontend/src/stores/pptStore.ts frontend/package.json
git commit -m "feat: setup Zustand store with persist"
```

---

### Task 1.2: 创建三栏布局结构

**Files:**
- Create: `frontend/src/components/SlideSidebar/index.tsx`
- Create: `frontend/src/components/Workspace/index.tsx`
- Create: `frontend/src/components/CopilotPanel/index.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1-6: 略（与原方案相同）**

**提交：**

```bash
git add frontend/src/components frontend/src/App.tsx frontend/package.json
git commit -m "feat: create three-column layout structure"
```

---

## Phase 2: Fabric.js 画布实现

### Task 2.1: 集成 Fabric.js 并创建画布组件

**Files:**
- Create: `frontend/src/components/Workspace/FabricCanvas.tsx`
- Create: `frontend/src/lib/fabricConverter.ts`

**步骤略（与原方案相同）**

---

### Task 2.2: 实现缩略图生成与同步

**Files:**
- Create: `frontend/src/lib/thumbnailGenerator.ts`
- Modify: `frontend/src/components/SlideSidebar/index.tsx`

**步骤略（与原方案相同）**

---

## Phase 3: 后端 Stream-JSON 集成

### Task 3.1: 实现 CLI 会话管理器

**Files:**
- Create: `backend/src/services/sessionManager.ts`
- Create: `backend/src/routes/slides.ts`

**Step 1: 创建会话管理器**

创建 `backend/src/services/sessionManager.ts`:

```typescript
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { WebSocket } from 'ws';

interface CLISession {
  slideId: string;
  process: ChildProcess;
  projectPath: string;
  createdAt: Date;
  clients: Set<WebSocket>;
}

export class SessionManager {
  private static sessions = new Map<string, CLISession>();
  private static projectsBasePath = path.join(process.cwd(), 'projects');
  private static activityTracker = new Map<string, Date>();
  private static readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分钟
  private static readonly MAX_CONCURRENT_SESSIONS = 5;

  /**
   * 初始化项目目录
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.projectsBasePath, { recursive: true });
      this.startCleanupTimer();
    } catch (error) {
      console.error('Failed to initialize projects directory:', error);
      throw error;
    }
  }

  /**
   * 获取或创建会话
   */
  static async getOrCreateSession(projectId: string, slideId: string): Promise<CLISession> {
    // 检查是否已存在
    const existing = this.sessions.get(slideId);
    if (existing && existing.process.exitCode === null) {
      this.updateActivity(slideId);
      return existing;
    }

    // 检查并发限制
    if (this.sessions.size >= this.MAX_CONCURRENT_SESSIONS) {
      // 清理最久未活动的会话
      const oldestSlide = this.getOldestInactiveSession();
      if (oldestSlide) {
        this.closeSession(oldestSlide);
      }
    }

    // 创建新会话
    const projectPath = path.join(this.projectsBasePath, projectId, 'slides', slideId);
    await fs.mkdir(projectPath, { recursive: true });

    // 启动 Claude Code CLI with stream-json
    const cliProcess = spawn('claude', [
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--project', projectPath
    ], {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const session: CLISession = {
      slideId,
      process: cliProcess,
      projectPath,
      createdAt: new Date(),
      clients: new Set()
    };

    this.sessions.set(slideId, session);
    this.updateActivity(slideId);
    this.setupStdoutHandler(session);
    this.setupProcessHandlers(session);

    return session;
  }

  /**
   * 设置 stdout 处理器（透传 stream-json）
   */
  private static setupStdoutHandler(session: CLISession): void {
    session.process.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          // 验证是否为有效 JSON
          const json = JSON.parse(line);
          // 透传到所有连接的客户端
          this.broadcastToSession(session.slideId, {
            type: 'stream',
            slideId: session.slideId,
            data: json
          });
        } catch {
          // 非JSON行作为原始文本转发
          this.broadcastToSession(session.slideId, {
            type: 'raw',
            slideId: session.slideId,
            text: line
          });
        }
      }
    });

    // 处理 stderr
    session.process.stderr.on('data', (chunk: Buffer) => {
      console.error(`CLI stderr [${session.slideId}]:`, chunk.toString());
    });
  }

  /**
   * 设置进程事件处理
   */
  private static setupProcessHandlers(session: CLISession): void {
    session.process.on('exit', (code) => {
      console.log(`CLI session ${session.slideId} exited with code ${code}`);
      this.broadcastToSession(session.slideId, {
        type: 'done',
        slideId: session.slideId
      });
      this.sessions.delete(session.slideId);
      this.activityTracker.delete(session.slideId);
    });

    session.process.on('error', (error) => {
      console.error(`CLI session ${session.slideId} error:`, error);
      this.broadcastToSession(session.slideId, {
        type: 'error',
        slideId: session.slideId,
        error: error.message
      });
    });
  }

  /**
   * 发送消息到 CLI
   */
  static async sendMessage(projectId: string, slideId: string, message: string): Promise<void> {
    try {
      const session = await this.getOrCreateSession(projectId, slideId);

      // 发送消息到 CLI stdin
      session.process.stdin.write(message + '\n');
      this.updateActivity(slideId);
    } catch (error) {
      console.error(`Failed to send message to ${slideId}:`, error);
      throw error;
    }
  }

  /**
   * 注册 WebSocket 客户端
   */
  static registerClient(slideId: string, ws: WebSocket): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.clients.add(ws);
    }
  }

  /**
   * 注销 WebSocket 客户端
   */
  static unregisterClient(slideId: string, ws: WebSocket): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.clients.delete(ws);
    }
  }

  /**
   * 广播消息到会话的所有客户端
   */
  private static broadcastToSession(slideId: string, message: any): void {
    const session = this.sessions.get(slideId);
    if (!session) return;

    const data = JSON.stringify(message);
    session.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  /**
   * 更新活跃时间
   */
  static updateActivity(slideId: string): void {
    this.activityTracker.set(slideId, new Date());
  }

  /**
   * 获取最久未活动的会话
   */
  private static getOldestInactiveSession(): string | null {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [slideId, lastActive] of this.activityTracker) {
      if (lastActive.getTime() < oldestTime) {
        oldest = slideId;
        oldestTime = lastActive.getTime();
      }
    }

    return oldest;
  }

  /**
   * 关闭会话
   */
  static closeSession(slideId: string): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.process.kill();
      session.clients.forEach(ws => ws.close());
      this.sessions.delete(slideId);
      this.activityTracker.delete(slideId);
    }
  }

  /**
   * 关闭所有会话
   */
  static closeAllSessions(): void {
    this.sessions.forEach((session, slideId) => {
      this.closeSession(slideId);
    });
  }

  /**
   * 启动清理定时器
   */
  private static startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [slideId, lastActive] of this.activityTracker) {
        if (now - lastActive.getTime() > this.INACTIVITY_TIMEOUT) {
          console.log(`Closing inactive session: ${slideId}`);
          this.closeSession(slideId);
        }
      }
    }, 60000); // 每分钟检查
  }

  /**
   * 获取项目基础路径
   */
  static get projectsBasePath(): string {
    return this.projectsBasePath;
  }
}
```

**Step 2: 创建幻灯片 API 路由**

创建 `backend/src/routes/slides.ts`:

```typescript
import express from 'express';
import { SessionManager } from '../services/sessionManager';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// 获取幻灯片数据
router.get('/:projectId/slides/:slideId', async (req, res) => {
  try {
    const { projectId, slideId } = req.params;
    const slidePath = path.join(
      SessionManager.projectsBasePath,
      projectId,
      'slides',
      slideId,
      'page.json'
    );

    const data = await fs.readFile(slidePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Slide not found' });
  }
});

// 更新幻灯片数据
router.put('/:projectId/slides/:slideId', async (req, res) => {
  try {
    const { projectId, slideId } = req.params;
    const pageData = req.body;

    const slidePath = path.join(
      SessionManager.projectsBasePath,
      projectId,
      'slides',
      slideId,
      'page.json'
    );

    await fs.writeFile(slidePath, JSON.stringify(pageData, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// 创建新幻灯片
router.post('/:projectId/slides', async (req, res) => {
  try {
    const { projectId } = req.params;
    const slideId = req.body.slideId || Math.random().toString(36).substring(2, 9);

    const slidePath = path.join(
      SessionManager.projectsBasePath,
      projectId,
      'slides',
      slideId
    );

    await fs.mkdir(slidePath, { recursive: true });

    // 创建空白页
    const pageData = {
      version: '1.0',
      pageSize: { width: 1280, height: 720 },
      background: '#ffffff',
      elements: []
    };

    await fs.writeFile(
      path.join(slidePath, 'page.json'),
      JSON.stringify(pageData, null, 2)
    );

    // 创建元数据
    const meta = {
      summary: '空白页',
      displayIndex: req.body.displayIndex || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(slidePath, 'meta.json'),
      JSON.stringify(meta, null, 2)
    );

    res.json({ slideId, data: pageData, meta });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

export default router;
```

**Step 3: 提交**

```bash
git add backend/src/services/sessionManager.ts backend/src/routes/slides.ts
git commit -m "feat: implement CLI session manager with stream-json support"
```

---

### Task 3.2: 实现 WebSocket 处理器

**Files:**
- Create: `backend/src/middleware/wsHandler.ts`
- Modify: `backend/src/index.ts`

**Step 1: 创建 WebSocket 处理器**

创建 `backend/src/middleware/wsHandler.ts`:

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { SessionManager } from '../services/sessionManager';

interface WSMessage {
  type: 'chat' | 'heartbeat';
  projectId: string;
  slideId?: string;
  message?: string;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentSlideId: string | null = null;

    console.log('New WebSocket connection');

    // 心跳
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());

        if (msg.type === 'chat' && msg.slideId) {
          currentSlideId = msg.slideId;

          // 注册客户端到会话
          SessionManager.registerClient(msg.slideId, ws);

          // 发送消息到 CLI
          await SessionManager.sendMessage(
            msg.projectId,
            msg.slideId,
            msg.message || ''
          );
        }
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          error: (error as Error).message
        }));
      }
    });

    ws.on('close', () => {
      if (currentSlideId) {
        SessionManager.unregisterClient(currentSlideId, ws);
      }
      console.log('WebSocket connection closed');
    });
  });

  // 心跳检测
  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}
```

**Step 2: 更新后端入口**

创建 `backend/src/index.ts`:

```typescript
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import projectRouter from './routes/project';
import slidesRouter from './routes/slides';
import { SessionManager } from './services/sessionManager';
import { setupWebSocket } from './middleware/wsHandler';

const app = express();
const server = createServer(app);

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/project', projectRouter);
app.use('/api', slidesRouter);

// WebSocket
setupWebSocket(server);

// 初始化
SessionManager.initialize().then(() => {
  console.log('Session Manager initialized');
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  SessionManager.closeAllSessions();
  server.close();
});
```

**Step 3: 提交**

```bash
git add backend/src/middleware/wsHandler.ts backend/src/index.ts
git commit -m "feat: implement WebSocket handler for stream-json"
```

---

## Phase 4: 前端 Stream-JSON 解析与展示

### Task 4.1: 创建 Stream-JSON 解析器

**Files:**
- Create: `frontend/src/lib/streamJsonParser.ts`

**Step 1: 创建解析器**

创建 `frontend/src/lib/streamJsonParser.ts`:

```typescript
import { StreamEvent, DisplayMessage } from '@/types/stream';

export class StreamJsonParser {
  /**
   * 解析单个 JSON 事件
   */
  static parse(json: any): DisplayMessage {
    const baseMessage = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date()
    };

    // 思考事件
    if (json.type === 'thinking') {
      return {
        ...baseMessage,
        type: 'thinking',
        content: json.content
      };
    }

    // 工具调用
    if (json.type === 'tool_use') {
      return {
        ...baseMessage,
        type: 'tool_call',
        toolName: json.name,
        toolInput: json.input
      };
    }

    // 工具结果
    if (json.type === 'tool_result') {
      return {
        ...baseMessage,
        type: 'tool_result',
        toolName: json.name,
        toolResult: json.output
      };
    }

    // 文本输出
    if (json.type === 'text') {
      return {
        ...baseMessage,
        type: 'text',
        content: json.text
      };
    }

    // 错误
    if (json.type === 'error') {
      return {
        ...baseMessage,
        type: 'error',
        content: json.message
      };
    }

    // 默认作为文本处理
    return {
      ...baseMessage,
      type: 'text',
      content: JSON.stringify(json)
    };
  }

  /**
   * 解析原始文本行
   */
  static parseRaw(text: string): DisplayMessage {
    return {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      content: text,
      timestamp: new Date()
    };
  }
}
```

**Step 2: 提交**

```bash
git add frontend/src/lib/streamJsonParser.ts
git commit -m "feat: implement stream-json parser"
```

---

### Task 4.2: 创建消息展示组件

**Files:**
- Create: `frontend/src/components/CopilotPanel/ThinkingView.tsx`
- Create: `frontend/src/components/CopilotPanel/ToolCallView.tsx`
- Create: `frontend/src/components/CopilotPanel/StreamMessageList.tsx`

**Step 1: 创建 ThinkingView**

创建 `frontend/src/components/CopilotPanel/ThinkingView.tsx`:

```typescript
import React from 'react';
import { BrainCircuit } from 'lucide-react';

interface ThinkingViewProps {
  content: string;
}

export const ThinkingView: React.FC<ThinkingViewProps> = ({ content }) => (
  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
    <BrainCircuit className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium text-amber-700 mb-1">思考中</div>
      <div className="text-sm text-amber-900 break-words">{content}</div>
    </div>
  </div>
);
```

**Step 2: 创建 ToolCallView**

创建 `frontend/src/components/CopilotPanel/ToolCallView.tsx`:

```typescript
import React from 'react';
import { Wrench, CheckCircle } from 'lucide-react';

interface ToolCallViewProps {
  name: string;
  input?: any;
  result?: any;
}

export const ToolCallView: React.FC<ToolCallViewProps> = ({ name, input, result }) => (
  <div className="border rounded-lg overflow-hidden">
    <div className="flex items-center gap-2 p-2 bg-slate-100">
      {result ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : (
        <Wrench className="w-4 h-4 text-slate-600" />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
    {input && (
      <div className="p-2 bg-blue-50">
        <div className="text-xs text-blue-600 mb-1">输入</div>
        <pre className="text-xs text-blue-900 overflow-auto max-h-32">
          {JSON.stringify(input, null, 2)}
        </pre>
      </div>
    )}
    {result && (
      <div className="p-2 bg-green-50">
        <div className="text-xs text-green-600 mb-1">结果</div>
        <pre className="text-xs text-green-900 overflow-auto max-h-32">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    )}
  </div>
);
```

**Step 3: 创建消息列表**

创建 `frontend/src/components/CopilotPanel/StreamMessageList.tsx`:

```typescript
import React from 'react';
import { DisplayMessage } from '@/types/stream';
import { ThinkingView } from './ThinkingView';
import { ToolCallView } from './ToolCallView';

interface StreamMessageListProps {
  messages: DisplayMessage[];
}

export const StreamMessageList: React.FC<StreamMessageListProps> = ({ messages }) => {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.type === 'thinking' && msg.content && (
            <ThinkingView content={msg.content} />
          )}
          {msg.type === 'tool_call' && (
            <ToolCallView name={msg.toolName!} input={msg.toolInput} />
          )}
          {msg.type === 'tool_result' && (
            <ToolCallView name={msg.toolName!} result={msg.toolResult} />
          )}
          {msg.type === 'text' && msg.content && (
            <div className="p-3 bg-slate-100 rounded-lg">
              <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          )}
          {msg.type === 'error' && msg.content && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg">
              <div className="text-sm">{msg.content}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

**Step 4: 提交**

```bash
git add frontend/src/components/CopilotPanel/ThinkingView.tsx frontend/src/components/CopilotPanel/ToolCallView.tsx frontend/src/components/CopilotPanel/StreamMessageList.tsx
git commit -m "feat: implement stream message display components"
```

---

### Task 4.3: 更新 CopilotPanel 主组件

**Files:**
- Modify: `frontend/src/components/CopilotPanel/index.tsx`

**Step 1: 重写 CopilotPanel**

修改 `frontend/src/components/CopilotPanel/index.tsx`:

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { MessageSquare, Send } from 'lucide-react';
import { WebSocketClient } from '@/lib/websocketClient';
import { StreamJsonParser } from '@/lib/streamJsonParser';
import { StreamMessageList } from './StreamMessageList';
import { DisplayMessage } from '@/types/stream';

export const CopilotPanel: React.FC = () => {
  const { getCurrentAIContext, currentSlideId } = usePPTStore();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef<WebSocketClient | null>(null);

  const context = getCurrentAIContext();

  // 初始化 WebSocket
  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:3001/ws');
    wsRef.current = ws;

    ws.connect().then(() => {
      setIsConnected(true);
    }).catch((error) => {
      console.error('Failed to connect WebSocket:', error);
    });

    ws.onMessage((data) => {
      if (data.type === 'stream' && data.data) {
        const msg = StreamJsonParser.parse(data.data);
        setMessages(prev => [...prev, msg]);
      } else if (data.type === 'raw' && data.text) {
        const msg = StreamJsonParser.parseRaw(data.text);
        setMessages(prev => [...prev, msg]);
      } else if (data.type === 'done') {
        setIsProcessing(false);
      } else if (data.type === 'error') {
        setMessages(prev => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: 'error',
          content: data.error || '未知错误',
          timestamp: new Date()
        }]);
        setIsProcessing(false);
      }
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  const handleSend = () => {
    if (!input.trim() || !currentSlideId || !wsRef.current || isProcessing) return;

    // 添加用户消息
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      content: input,
      timestamp: new Date()
    }]);

    // 发送到后端
    wsRef.current.send({
      type: 'chat',
      projectId: 'default',
      slideId: currentSlideId,
      message: input
    });

    setInput('');
    setIsProcessing(true);
  };

  if (!currentSlideId) {
    return (
      <div className="w-80 bg-slate-50 border-l border-slate-200">
        <div className="h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>选择幻灯片后开始对话</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-50 border-l border-slate-200 flex flex-col">
      {/* 上下文指示器 */}
      <div className="p-4 border-b border-slate-200">
        <div className="text-sm font-medium text-slate-700">当前上下文</div>
        <div className="text-xs text-slate-500 mt-1">
          {context.type === 'page' ? '整页 (Page)' : `元素 (${context.elementId})`}
        </div>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-500">{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">
            与 AI 对话生成或修改幻灯片
          </div>
        ) : (
          <StreamMessageList messages={messages} />
        )}
        {isProcessing && (
          <div className="text-sm text-slate-400 animate-pulse mt-4">
            AI 正在处理...
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex gap-2">
          <textarea
            className="flex-1 p-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="输入您的需求..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed self-end"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Step 2: 提交**

```bash
git add frontend/src/components/CopilotPanel/index.tsx
git commit -m "feat: update CopilotPanel with stream-json support"
```

---

## Phase 5: 错误处理与优化

### Task 5.1: 添加错误处理和用户反馈

**Files:**
- Create: `frontend/src/components/Toast/index.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/lib/websocketClient.ts`

**步骤略（与原方案相同）**

---

### Task 5.2: 性能优化

**Files:**
- Modify: `frontend/src/components/Workspace/FabricCanvas.tsx`
- Modify: `frontend/src/lib/thumbnailGenerator.ts`

**步骤略（与原方案相同）**

---

## 测试指南

### 手动测试清单

**1. 项目创建流程**
- [ ] 启动应用，看到空白状态界面
- [ ] 点击"开始创建"进入编辑界面
- [ ] 可以添加新幻灯片
- [ ] 可以切换幻灯片

**2. 画布交互**
- [ ] 点击元素可以选中
- [ ] 拖拽元素可以移动
- [ ] 拖拽控制点可以缩放
- [ ] 点击空白处取消选中

**3. AI 对话功能（Stream-JSON）**
- [ ] 输入消息后能看到 AI 思考过程
- [ ] 能看到工具调用详情（read_file, write_file 等）
- [ ] 能看到工具结果
- [ ] 完成后画布自动更新
- [ ] WebSocket 断开后能自动重连

**4. 会话管理**
- [ ] 切换幻灯片时自动创建对应会话
- [ ] 30 分钟无活动后会话自动关闭

**5. 缩略图同步**
- [ ] 修改画布后，缩略图自动更新

**6. 导入/导出**
- [ ] 可以导出项目为 JSON 文件
- [ ] 可以导入之前导出的项目

---

## 部署说明

### 开发环境启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 前端: http://localhost:5173
# 后端: http://localhost:3001
```

### 生产环境构建

```bash
# 构建前端
cd frontend
npm run build

# 构建后端
cd ../backend
npm run build

# 使用 PM2 启动
pm2 start backend/dist/index.js --name "ppt-copilot-backend"
```

---

## 故障排查

**问题**: CLI 无法启动
- 检查 Claude Code CLI 是否正确安装
- 检查 `--dangerously-skip-permissions` 参数是否生效
- 检查项目目录权限

**问题**: Stream-JSON 解析失败
- 检查 CLI 输出格式是否为 stream-json
- 查看浏览器控制台错误信息

**问题**: 会话未自动清理
- 检查定时器是否正常工作
- 检查 activityTracker 是否正确更新

---

## 参考资源

- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Live Streaming Text Output #4346](https://github.com/anthropics/claude-code/issues/4346)
- [Claude Code CLI: The Definitive Technical Reference](https://blakecrosley.com/guide/claude-code)

---

## 未来增强

**Phase 6+ 可能的功能：**
- 支持更多元素类型（图片、形状、图表）
- 拖拽排序幻灯片
- 右键菜单（复制、粘贴、删除）
- 多人协作编辑
- 导出为 PPTX 文件
- 模板库
- 主题切换
- 动画效果
