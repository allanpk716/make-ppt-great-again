# PPT 项目管理系统实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现完整的 PPT 项目管理功能，包括新建、打开、保存项目，以及幻灯片拖拽排序。

**Architecture:** 前后端分离架构。后端提供项目 CRUD API 和文件系统操作，前端 zustand store 管理状态，组件提供 UI 交互。每个项目以文件夹形式存储在 Workspace 中。

**Tech Stack:** Express (后端), React + TypeScript (前端), zustand (状态管理), @dnd-kit/core (拖拽)

---

## Task 1: 创建后端项目服务基础结构

**Files:**
- Create: `backend/src/services/projectService.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/src/types/project.ts`

**Step 1: 定义项目类型**

```typescript
// backend/src/types/project.ts
export interface ProjectMeta {
  id: string;
  title: string;
  version: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  lastAutoBackup: string;
  slideCount: number;
  slideOrder: string[];
  appVersion: string;
}

export interface CreateProjectOptions {
  name: string;
  location?: string;
}

export interface ProjectListItem {
  path: string;
  title: string;
  lastModified: string;
  slideCount: number;
}
```

**Step 2: 创建 ProjectService 核心方法**

```typescript
// backend/src/services/projectService.ts
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { ProjectMeta, CreateProjectOptions, ProjectListItem } from '../types/project.js';

export class ProjectService {
  private static workspacePath = path.join(process.cwd(), 'workspace');
  private static recentProjectsPath = path.join(process.cwd(), 'recentProjects.json');

  static async initialize(): Promise<void> {
    await fs.mkdir(this.workspacePath, { recursive: true });
    // 确保 recentProjects.json 存在
    try {
      await fs.access(this.recentProjectsPath);
    } catch {
      await fs.writeFile(this.recentProjectsPath, JSON.stringify({ projects: [] }, null, 2));
    }
  }

  static getWorkspacePath(): string {
    return this.workspacePath;
  }

  static async setWorkspacePath(newPath: string): Promise<void> {
    await fs.mkdir(newPath, { recursive: true });
    this.workspacePath = newPath;
  }

  static async createProject(options: CreateProjectOptions): Promise<{ path: string; meta: ProjectMeta }> {
    const projectId = uuidv4();
    const projectDir = path.join(options.location || this.workspacePath, options.name);
    await fs.mkdir(projectDir, { recursive: true });

    // 创建子目录
    await fs.mkdir(path.join(projectDir, 'slides'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'assets', 'images'), { recursive: true });
    await fs.mkdir(path.join(projectDir, '.backups'), { recursive: true });

    // 创建项目元数据
    const meta: ProjectMeta = {
      id: projectId,
      title: options.name,
      version: '1.0.0',
      schemaVersion: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAutoBackup: new Date().toISOString(),
      slideCount: 0,
      slideOrder: [],
      appVersion: '0.1.0'
    };

    await fs.writeFile(
      path.join(projectDir, 'project.json'),
      JSON.stringify(meta, null, 2)
    );

    return { path: projectDir, meta };
  }

  static async openProject(projectPath: string): Promise<ProjectMeta> {
    const metaPath = path.join(projectPath, 'project.json');
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content) as ProjectMeta;
  }

  static async listProjects(): Promise<ProjectListItem[]> {
    const entries = await fs.readdir(this.workspacePath, { withFileTypes: true });
    const projects: ProjectListItem[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(this.workspacePath, entry.name);
        const metaPath = path.join(projectPath, 'project.json');
        try {
          const stat = await fs.stat(projectPath);
          const content = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(content) as ProjectMeta;
          projects.push({
            path: projectPath,
            title: meta.title,
            lastModified: stat.mtime.toISOString(),
            slideCount: meta.slideCount
          });
        } catch {
          // 跳过无效项目
        }
      }
    }

    return projects.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }
}
```

**Step 3: 在 index.ts 中初始化 ProjectService**

```typescript
// backend/src/index.ts
import { ProjectService } from './services/projectService.js';

// 在 app.listen 之前添加
await ProjectService.initialize();
console.log('ProjectService initialized');
```

**Step 4: 安装 uuid 依赖**

```bash
cd backend && npm install uuid && npm install --save-dev @types/uuid
```

**Step 5: 启动后端验证初始化**

```bash
npm run dev:backend
```

Expected: 控制台输出 "ProjectService initialized"，workspace 目录已创建

**Step 6: 提交**

```bash
git add backend/src/services/projectService.ts backend/src/types/project.ts backend/src/index.ts
git commit -m "feat(backend): add ProjectService base structure"
```

---

## Task 2: 创建项目管理 API 路由

**Files:**
- Create: `backend/src/routes/projects.ts`
- Modify: `backend/src/index.ts`

**Step 1: 创建项目路由**

```typescript
// backend/src/routes/projects.ts
import express from 'express';
import { ProjectService } from '../services/projectService.js';

const router = express.Router();

// 创建新项目
router.post('/create', async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const result = await ProjectService.createProject({ name, location });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 列出所有项目
router.get('/list', async (req, res) => {
  try {
    const projects = await ProjectService.listProjects();
    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 打开项目
router.get('/open', async (req, res) => {
  try {
    const { path: projectPath } = req.query;
    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }
    const meta = await ProjectService.openProject(projectPath);

    // 读取所有幻灯片
    const slidesDir = require('path').join(projectPath, 'slides');
    const fs = require('fs/promises');
    const slideEntries = await fs.readdir(slidesDir, { withFileTypes: true });
    const slides = [];

    for (const entry of slideEntries) {
      if (entry.isDirectory()) {
        const slidePath = require('path').join(slidesDir, entry.name);
        const pageDataPath = require('path').join(slidePath, 'page.json');
        const metaPath = require('path').join(slidePath, 'meta.json');
        try {
          const [pageData, slideMeta] = await Promise.all([
            fs.readFile(pageDataPath, 'utf-8').then(JSON.parse),
            fs.readFile(metaPath, 'utf-8').then(JSON.parse)
          ]);
          slides.push({
            id: entry.name,
            data: pageData,
            meta: slideMeta
          });
        } catch (e) {
          console.error(`Failed to read slide ${entry.name}:`, e);
        }
      }
    }

    // 按 slideOrder 排序
    const orderedSlides = meta.slideOrder
      .map(id => slides.find(s => s.id === id))
      .filter(Boolean);

    res.json({ meta, slides: orderedSlides });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取 Workspace 路径
router.get('/workspace', (req, res) => {
  res.json({ path: ProjectService.getWorkspacePath() });
});

// 更新 Workspace 路径
router.put('/workspace', async (req, res) => {
  try {
    const { path: newPath } = req.body;
    if (!newPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    await ProjectService.setWorkspacePath(newPath);
    res.json({ success: true, path: newPath });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
```

**Step 2: 注册路由**

```typescript
// backend/src/index.ts
import projectsRouter from './routes/projects.js';

app.use('/api/projects', projectsRouter);
```

**Step 3: 测试 API**

```bash
# 测试创建项目
curl -X POST http://localhost:3000/api/projects/create -H "Content-Type: application/json" -d "{\"name\":\"TestProject\"}"

# 测试列出项目
curl http://localhost:3000/api/projects/list
```

**Step 4: 提交**

```bash
git add backend/src/routes/projects.ts backend/src/index.ts
git commit -m "feat(backend): add project management API routes"
```

---

## Task 3: 创建前端 projectStore

**Files:**
- Create: `frontend/src/stores/projectStore.ts`
- Create: `frontend/src/types/project.ts`

**Step 1: 定义前端项目类型**

```typescript
// frontend/src/types/project.ts
export interface RecentProject {
  path: string;
  title: string;
  lastOpened: string;
  thumbnail?: string;
}

export interface ProjectSettings {
  workspacePath: string;
  autoBackupInterval: number; // 分钟
  theme: 'light' | 'dark';
}

export interface ProjectMeta {
  id: string;
  title: string;
  version: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  lastAutoBackup: string;
  slideCount: number;
  slideOrder: string[];
  appVersion: string;
}
```

**Step 2: 创建 projectStore**

```typescript
// frontend/src/stores/projectStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RecentProject, ProjectSettings } from '@/types/project';

interface ProjectStore {
  // 状态
  workspacePath: string;
  recentProjects: RecentProject[];
  settings: ProjectSettings;

  // 操作
  setWorkspacePath: (path: string) => void;
  addRecentProject: (project: RecentProject) => void;
  removeRecentProject: (path: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  clearRecentProjects: () => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      workspacePath: '',
      recentProjects: [],
      settings: {
        workspacePath: '',
        autoBackupInterval: 5,
        theme: 'light'
      },

      // 设置 Workspace 路径
      setWorkspacePath: (path) => {
        set({ workspacePath: path, settings: { ...get().settings, workspacePath: path } });
      },

      // 添加最近项目
      addRecentProject: (project) => {
        set((state) => {
          const filtered = state.recentProjects.filter(p => p.path !== project.path);
          const updated = [project, ...filtered].slice(0, 10);
          return { recentProjects: updated };
        });
      },

      // 移除最近项目
      removeRecentProject: (path) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter(p => p.path !== path)
        }));
      },

      // 更新设置
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      // 清空最近项目
      clearRecentProjects: () => {
        set({ recentProjects: [] });
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        workspacePath: state.workspacePath,
        recentProjects: state.recentProjects,
        settings: state.settings
      })
    }
  )
);
```

**Step 3: 提交**

```bash
git add frontend/src/stores/projectStore.ts frontend/src/types/project.ts
git commit -m "feat(frontend): add projectStore for project management"
```

---

## Task 4: 扩展 pptStore 支持项目管理

**Files:**
- Modify: `frontend/src/stores/pptStore.ts`

**Step 1: 扩展 PPTStore 接口**

```typescript
// 在 frontend/src/stores/pptStore.ts 中修改

interface PPTStore {
  // 新增字段
  currentProjectPath: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;

  // 修改 loadProject 签名
  loadProject: (project: { slides: Slide[]; title: string }, projectPath?: string) => void;

  // 新增方法
  saveProject: () => Promise<void>;
  saveAsProject: (path: string) => Promise<void>;
  markDirty: () => void;
  markClean: () => void;
}
```

**Step 2: 实现新功能**

```typescript
// 在 frontend/src/stores/pptStore.ts 的实现部分添加

export const usePPTStore = create<PPTStore>()(
  persist(
    (set, get) => ({
      // 新增状态初始值
      currentProjectPath: null,
      isDirty: false,
      lastSavedAt: null,

      // 修改 loadProject
      loadProject: (project, projectPath) => {
        set({
          slides: project.slides,
          currentSlideId: project.slides[0]?.id || null,
          projectTitle: project.title,
          currentProjectPath: projectPath || null,
          isNewProject: false,
          isDirty: false,
          lastSavedAt: new Date()
        });
      },

      // 保存项目
      saveProject: async () => {
        const { slides, projectTitle, currentProjectPath } = get();
        if (!currentProjectPath) {
          throw new Error('No project open');
        }

        const response = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: currentProjectPath,
            title: projectTitle,
            slides
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save project');
        }

        set({ isDirty: false, lastSavedAt: new Date() });
      },

      // 另存为
      saveAsProject: async (path) => {
        const { slides, projectTitle } = get();

        const response = await fetch('/api/projects/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path,
            title: projectTitle,
            slides
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save project');
        }

        set({
          currentProjectPath: path,
          isDirty: false,
          lastSavedAt: new Date()
        });
      },

      // 标记为脏
      markDirty: () => {
        set({ isDirty: true });
      },

      // 标记为干净
      markClean: () => {
        set({ isDirty: false });
      },

      // 修改 updateSlideData 以自动标记脏
      updateSlideData: (id, data) => {
        set((state) => ({
          slides: state.slides.map(s =>
            s.id === id
              ? { ...s, data, meta: { ...s.meta, updatedAt: new Date().toISOString() } }
              : s
          ),
          isDirty: true
        }));
      },

      // 修改 addSlide 以自动标记脏
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
          currentSlideId: newId,
          isDirty: true
        }));
      }
    }),
    {
      name: 'ppt-storage',
      partialize: (state) => ({
        slides: state.slides,
        currentSlideId: state.currentSlideId,
        projectTitle: state.projectTitle,
        currentProjectPath: state.currentProjectPath
      })
    }
  )
);
```

**Step 3: 提交**

```bash
git add frontend/src/stores/pptStore.ts
git commit -m "feat(frontend): extend pptStore with project save/dirty tracking"
```

---

## Task 5: 创建欢迎屏幕组件

**Files:**
- Create: `frontend/src/components/WelcomeScreen/index.tsx`
- Create: `frontend/src/components/WelcomeScreen/WelcomeScreen.tsx`

**Step 1: 创建 WelcomeScreen 组件**

```tsx
// frontend/src/components/WelcomeScreen/WelcomeScreen.tsx
import { useProjectStore } from '@/stores/projectStore';
import { usePPTStore } from '@/stores/pptStore';
import { useEffect, useState } from 'react';

interface ProjectListItem {
  path: string;
  title: string;
  lastModified: string;
  slideCount: number;
}

export function WelcomeScreen() {
  const { recentProjects, addRecentProject } = useProjectStore();
  const { loadProject } = usePPTStore();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects/list');
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProject = async (projectPath: string) => {
    try {
      const response = await fetch(`/api/projects/open?path=${encodeURIComponent(projectPath)}`);
      const data = await response.json();

      loadProject(
        {
          slides: data.slides,
          title: data.meta.title
        },
        projectPath
      );

      addRecentProject({
        path: projectPath,
        title: data.meta.title,
        lastOpened: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to open project:', error);
    }
  };

  const handleNewProject = () => {
    // 触发新建项目对话框（后续实现）
    console.log('New project clicked');
  };

  const handleBrowseProjects = () => {
    // 触发文件选择对话框（后续实现）
    console.log('Browse projects clicked');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">PPT Copilot</h1>
          <p className="text-xl text-slate-600">AI 原生 PPT 生成助手</p>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">最近打开的项目</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProjects.slice(0, 6).map((project) => (
                <button
                  key={project.path}
                  onClick={() => handleOpenProject(project.path)}
                  className="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all text-left"
                >
                  <div className="font-medium text-slate-900 truncate">{project.title}</div>
                  <div className="text-sm text-slate-500 mt-1 truncate">{project.path}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <button
            onClick={handleNewProject}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            新建项目
          </button>
          <button
            onClick={handleBrowseProjects}
            className="px-6 py-3 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-lg border border-slate-200"
          >
            打开项目
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 创建 index 导出**

```tsx
// frontend/src/components/WelcomeScreen/index.tsx
export { WelcomeScreen } from './WelcomeScreen';
```

**Step 3: 提交**

```bash
git add frontend/src/components/WelcomeScreen/
git commit -m "feat(frontend): add WelcomeScreen component"
```

---

## Task 6: 创建菜单栏组件

**Files:**
- Create: `frontend/src/components/MenuBar/index.tsx`
- Create: `frontend/src/components/MenuBar/MenuBar.tsx`

**Step 1: 创建 MenuBar 组件**

```tsx
// frontend/src/components/MenuBar/MenuBar.tsx
import { useRef, useState, useEffect } from 'react';
import { usePPTStore } from '@/stores/pptStore';

export function MenuBar() {
  const { saveProject, currentProjectPath, isDirty } = usePPTStore();
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node) &&
          settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleSave = async () => {
    if (currentProjectPath) {
      try {
        await saveProject();
        setActiveMenu(null);
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
  };

  const handleNewProject = () => {
    // 触发新建项目
    console.log('New project');
    setActiveMenu(null);
  };

  const handleOpenProject = () => {
    // 触发打开项目
    console.log('Open project');
    setActiveMenu(null);
  };

  return (
    <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-2">
      {/* File Menu */}
      <div className="relative" ref={fileMenuRef}>
        <button
          onClick={() => toggleMenu('file')}
          className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 rounded"
        >
          文件
        </button>
        {activeMenu === 'file' && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-48 z-50">
            <button
              onClick={handleNewProject}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
            >
              新建项目 <span className="text-slate-400 ml-4">Ctrl+N</span>
            </button>
            <button
              onClick={handleOpenProject}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100"
            >
              打开项目 <span className="text-slate-400 ml-4">Ctrl+O</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!currentProjectPath}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存 <span className="text-slate-400 ml-4">Ctrl+S</span>
              {isDirty && <span className="text-red-500 ml-2">●</span>}
            </button>
            <hr className="my-1 border-slate-200" />
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100">
              退出
            </button>
          </div>
        )}
      </div>

      {/* Settings Menu */}
      <div className="relative" ref={settingsMenuRef}>
        <button
          onClick={() => toggleMenu('settings')}
          className="px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 rounded"
        >
          设置
        </button>
        {activeMenu === 'settings' && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-48 z-50">
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100">
              Workspace 路径...
            </button>
            <button className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100">
              自动备份间隔...
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: 创建 index 导出**

```tsx
// frontend/src/components/MenuBar/index.tsx
export { MenuBar } from './MenuBar';
```

**Step 3: 提交**

```bash
git add frontend/src/components/MenuBar/
git commit -m "feat(frontend): add MenuBar component"
```

---

## Task 7: 更新 App.tsx 集成新组件

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: 修改 App.tsx**

```tsx
// frontend/src/App.tsx
import { usePPTStore } from '@/stores/pptStore';
import { SlideSidebar } from '@/components/SlideSidebar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { ToastProvider } from '@/components/Toast';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { MenuBar } from '@/components/MenuBar';

function AppContent() {
  const { isNewProject, slides, currentProjectPath } = usePPTStore();

  // 显示欢迎屏幕：没有打开项目时
  if (!currentProjectPath && slides.length === 0) {
    return <WelcomeScreen />;
  }

  // 主界面：菜单栏 + 三栏布局
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <MenuBar />
      <div className="flex-1 flex">
        <SlideSidebar />
        <ResizableLayout />
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
```

**Step 2: 提交**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): integrate WelcomeScreen and MenuBar into App"
```

---

## Task 8: 实现幻灯片拖拽排序

**Files:**
- Modify: `frontend/src/components/SlideSidebar/index.tsx`
- Create: `frontend/src/components/SlideSidebar/SlideCard.tsx`

**Step 1: 安装拖拽库**

```bash
cd frontend && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: 创建 SlideCard 组件**

```tsx
// frontend/src/components/SlideSidebar/SlideCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Slide } from '@/types/ppt';

interface SlideCardProps {
  slide: Slide;
  isSelected: boolean;
  onClick: () => void;
}

export function SlideCard({ slide, isSelected, onClick }: SlideCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <div
        className="aspect-video bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md"
        onClick={onClick}
      >
        {/* 拖拽手柄 */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing bg-white/80 rounded"
        >
          <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
          </svg>
        </div>

        {/* 幻灯片预览 */}
        <div className="p-2">
          <div className="text-xs text-slate-500 truncate">{slide.meta.summary}</div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: 更新 SlideSidebar 集成拖拽**

```tsx
// frontend/src/components/SlideSidebar/index.tsx
import { usePPTStore } from '@/stores/pptStore';
import { SlideCard } from './SlideCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

export function SlideSidebar() {
  const { slides, currentSlideId, switchSlide, reorderSlides, markDirty } = usePPTStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = slides.findIndex((s) => s.id === active.id);
      const newIndex = slides.findIndex((s) => s.id === over.id);

      const newSlides = arrayMove(slides, oldIndex, newIndex);
      const newOrder = newSlides.map(s => s.id);
      reorderSlides(newOrder);
      markDirty();
    }
  };

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h2 className="font-semibold text-slate-700">幻灯片</h2>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <SortableContext
            items={slides.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {slides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                isSelected={slide.id === currentSlideId}
                onClick={() => switchSlide(slide.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}
```

**Step 4: 提交**

```bash
git add frontend/src/components/SlideSidebar/
git commit -m "feat(frontend): add drag-and-drop slide reordering"
```

---

## Task 9: 实现保存项目 API

**Files:**
- Modify: `backend/src/routes/projects.ts`
- Modify: `backend/src/services/projectService.ts`

**Step 1: 在 ProjectService 添加保存方法**

```typescript
// backend/src/services/projectService.ts 中添加

static async saveProject(projectPath: string, data: {
  title: string;
  slides: Array<{ id: string; data: any; meta: any }>;
}): Promise<void> {
  // 更新 project.json
  const metaPath = path.join(projectPath, 'project.json');
  const oldMeta: ProjectMeta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

  const newMeta: ProjectMeta = {
    ...oldMeta,
    title: data.title,
    updatedAt: new Date().toISOString(),
    slideCount: data.slides.length,
    slideOrder: data.slides.map(s => s.id)
  };

  await fs.writeFile(metaPath, JSON.stringify(newMeta, null, 2));

  // 保存每个幻灯片
  for (const slide of data.slides) {
    const slideDir = path.join(projectPath, 'slides', slide.id);
    await fs.mkdir(slideDir, { recursive: true });

    await fs.writeFile(
      path.join(slideDir, 'page.json'),
      JSON.stringify(slide.data, null, 2)
    );

    await fs.writeFile(
      path.join(slideDir, 'meta.json'),
      JSON.stringify(slide.meta, null, 2)
    );
  }
}
```

**Step 2: 添加保存路由**

```typescript
// backend/src/routes/projects.ts 中添加

router.post('/save', async (req, res) => {
  try {
    const { path: projectPath, title, slides } = req.body;
    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }
    await ProjectService.saveProject(projectPath, { title, slides });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
```

**Step 3: 提交**

```bash
git add backend/src/routes/projects.ts backend/src/services/projectService.ts
git commit -m "feat(backend): add save project API"
```

---

## Task 10: 添加键盘快捷键支持

**Files:**
- Create: `frontend/src/hooks/useKeyboardShortcuts.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: 创建键盘快捷键 Hook**

```typescript
// frontend/src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { useProjectStore } from '@/stores/projectStore';

export function useKeyboardShortcuts() {
  const { saveProject, currentProjectPath } = usePPTStore();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (currentProjectPath) {
          try {
            await saveProject();
          } catch (error) {
            console.error('Failed to save:', error);
          }
        }
      }

      // Ctrl+N: 新建项目
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        console.log('New project shortcut');
      }

      // Ctrl+O: 打开项目
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        console.log('Open project shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentProjectPath, saveProject]);
}
```

**Step 2: 在 App 中使用 Hook**

```tsx
// frontend/src/App.tsx 中添加
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

function AppContent() {
  useKeyboardShortcuts();
  // ... 其余代码
}
```

**Step 3: 提交**

```bash
git add frontend/src/hooks/useKeyboardShortcuts.ts frontend/src/App.tsx
git commit -m "feat(frontend): add keyboard shortcuts support"
```

---

## Task 11: 创建新建项目对话框

**Files:**
- Create: `frontend/src/components/NewProjectDialog/index.tsx`
- Modify: `frontend/src/components/WelcomeScreen/WelcomeScreen.tsx`

**Step 1: 创建对话框组件**

```tsx
// frontend/src/components/NewProjectDialog/index.tsx
import { useState } from 'react';

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入项目名称');
      return;
    }
    onCreate(name.trim());
    setName('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">新建项目</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              项目名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="我的演示文稿"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: 集成到 WelcomeScreen**

```tsx
// frontend/src/components/WelcomeScreen/WelcomeScreen.tsx 中添加
import { NewProjectDialog } from '@/components/NewProjectDialog';

export function WelcomeScreen() {
  // ... 现有代码
  const [showNewDialog, setShowNewDialog] = useState(false);

  const handleCreateProject = async (name: string) => {
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const data = await response.json();

      // 打开新创建的项目
      await handleOpenProject(data.path);

      setShowNewDialog(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div>
      {/* 现有内容 */}
      <NewProjectDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onCreate={handleCreateProject}
      />
    </div>
  );
}
```

**Step 3: 提交**

```bash
git add frontend/src/components/NewProjectDialog/
git commit -m "feat(frontend): add NewProjectDialog component"
```

---

## Task 12: 测试完整流程

**Files:**
- Test: 所有修改

**Step 1: 启动前后端**

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

**Step 2: 测试新建项目**

1. 打开浏览器访问 `http://localhost:5173`
2. 应该看到欢迎屏幕
3. 点击"新建项目"
4. 输入项目名称"测试项目"
5. 点击"创建"
6. 验证：进入主界面，菜单栏显示，保存按钮有脏标记

**Step 3: 测试保存项目**

1. 添加一张新幻灯片
2. 按 Ctrl+S 或点击菜单"文件 → 保存"
3. 验证：脏标记消失，后端 workspace 目录下创建项目文件夹

**Step 4: 测试拖拽排序**

1. 创建多张幻灯片
2. 拖拽幻灯片卡片改变顺序
3. 验证：顺序改变，出现脏标记
4. 保存项目
5. 重新打开项目验证顺序保持

**Step 5: 测试重新打开**

1. 刷新页面
2. 应该看到欢迎屏幕
3. 点击最近项目中的"测试项目"
4. 验证：项目正确加载，幻灯片顺序正确

**Step 6: 修复发现的问题**

记录并修复测试中发现的问题。

**Step 7: 最终提交**

```bash
git add .
git commit -m "test: verify project management end-to-end flow"
```

---

## 完成清单

- [ ] Task 1: 创建后端项目服务基础结构
- [ ] Task 2: 创建项目 API 路由
- [ ] Task 3: 创建前端 projectStore
- [ ] Task 4: 扩展 pptStore 支持项目管理
- [ ] Task 5: 创建欢迎屏幕组件
- [ ] Task 6: 创建菜单栏组件
- [ ] Task 7: 更新 App.tsx 集成新组件
- [ ] Task 8: 实现幻灯片拖拽排序
- [ ] Task 9: 实现保存项目 API
- [ ] Task 10: 添加键盘快捷键支持
- [ ] Task 11: 创建新建项目对话框
- [ ] Task 12: 测试完整流程
