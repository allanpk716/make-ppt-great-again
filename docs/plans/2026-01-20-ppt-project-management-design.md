# PPT 项目管理系统设计文档

**日期**: 2026-01-20
**版本**: 1.0.0

## 1. 概述

为 PPT Copilot 添加完整的项目管理功能，支持新建、打开、保存、导入导出 PPT 项目，以及幻灯片拖拽排序。

## 2. 整体架构

### 2.1 架构概览

- **前端**: zustand store 管理项目状态
- **后端**: ProjectService 提供 CRUD API
- **文件系统**: 每个项目一个独立文件夹

### 2.2 Workspace 概念

- 默认 Workspace: 程序目录下的 `workspace/`
- 可在设置中修改路径
- 后端维护 `recentProjects.json` 记录最近打开的项目

## 3. 数据模型

### 3.1 项目文件夹结构

```
MyPresentation/
├── project.json          # 项目元数据
├── slides/
│   ├── a3f9d2e1/         # 唯一 ID
│   │   ├── page.json     # 页面内容
│   │   └── meta.json     # 页面元数据
│   └── b7c4e8f3/
│       ├── page.json
│       └── meta.json
├── assets/
│   └── images/
└── .backups/             # 自动备份
    └── backup-20260120-112500.json
```

### 3.2 project.json 结构

```json
{
  "id": "unique-project-id",
  "title": "我的演示文稿",
  "version": "1.0.0",
  "schemaVersion": "1.0.0",
  "createdAt": "2026-01-20T10:00:00Z",
  "updatedAt": "2026-01-20T11:30:00Z",
  "lastAutoBackup": "2026-01-20T11:25:00Z",
  "slideCount": 5,
  "slideOrder": ["a3f9d2e1", "b7c4e8f3", "c9h5k2m4", "d1n6o8p0", "e3r7t9u2"],
  "appVersion": "0.1.0"
}
```

### 3.3 版本说明

- `version`: 项目内容版本 (SemVer)
- `schemaVersion`: 数据结构版本 (用于迁移验证)
- `appVersion`: 创建项目的应用版本

## 4. 用户界面

### 4.1 快速访问面板 (WelcomeScreen)

- 最近打开的项目列表 (最多 10 条)
- 新建项目按钮
- 打开其他项目按钮
- 设置按钮

### 4.2 菜单栏

```
文件 | 设置
```

**文件菜单**:
```
文件
├─ 新建项目 (Ctrl+N)
├─ 打开项目 (Ctrl+O)
├─ 保存 (Ctrl+S)
├─ 另存为...
├─ 最近项目 ▶
├─ ──────────
└─ 退出
```

**设置菜单**:
```
设置
├─ Workspace 路径...
├─ 自动备份间隔...
└─ ──────────
   （预留）
```

## 5. 核心功能

### 5.1 后端 API

```
POST /api/projects/create          // 创建新项目
GET  /api/projects/list            // 获取 Workspace 中的所有项目
GET  /api/projects/recent          // 获取最近打开的项目列表
GET  /api/projects/open            // 打开项目
POST /api/projects/save            // 保存项目
POST /api/projects/backup          // 创建备份
PUT  /api/projects/settings        // 更新设置
GET  /api/projects/validate-version // 验证版本并迁移
```

### 5.2 新建项目流程

1. 用户点击"新建项目"
2. 输入项目名称 (可选位置，默认 Workspace)
3. 后端创建文件夹结构和初始数据
4. 前端加载项目，更新 currentProjectPath

### 5.3 打开项目流程

1. 用户选择项目 (最近列表或文件对话框)
2. 后端读取 project.json 和所有幻灯片
3. 前端加载数据到 store
4. 更新最近项目列表

### 5.4 保存与备份

- **手动保存**: Ctrl+S 触发，更新 project.json 和 slides
- **自动备份**: 定时触发 (默认 5 分钟)，保留最近 10 个备份

### 5.5 幻灯片拖拽排序

- 使用 @dnd-kit/core 实现
- 完全自由拖拽模式
- 释放后更新 slideOrder 数组
- 拖拽完成后标记 isDirty = true

## 6. 前端 Store 扩展

### 6.1 projectStore (新增)

```typescript
interface ProjectStore {
  workspacePath: string;
  recentProjects: RecentProject[];
  settings: ProjectSettings;

  setWorkspacePath(path: string): void;
  addRecentProject(project: RecentProject): void;
  updateSettings(settings: Partial<ProjectSettings>): void;
}
```

### 6.2 pptStore (扩展)

```typescript
interface PPTStore {
  // 新增
  currentProjectPath: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;

  saveProject(): Promise<void>;
  saveAsProject(path: string): Promise<void>;
}
```

## 7. 组件列表

### 新增组件

- `WelcomeScreen` - 快速访问面板
- `MenuBar` - 菜单栏
- `NewProjectDialog` - 新建项目对话框
- `SettingsPanel` - 设置面板
- `SlideCard` - 幻灯片卡片 (支持拖拽)

### 修改组件

- `SlideSidebar` - 集成拖拽排序
- `App.tsx` - 添加 WelcomeScreen 和 MenuBar
- `pptStore.ts` - 扩展状态管理

## 8. 文件变更

### 后端新增

- `backend/src/routes/projects.ts`
- `backend/src/services/projectService.ts`
- `backend/src/services/versionMigration.ts`

### 前端新增

- `frontend/src/stores/projectStore.ts`
- `frontend/src/components/WelcomeScreen/index.tsx`
- `frontend/src/components/MenuBar/index.tsx`
- `frontend/src/components/NewProjectDialog/index.tsx`
- `frontend/src/components/SettingsPanel/index.tsx`

### 前端修改

- `frontend/src/stores/pptStore.ts`
- `frontend/src/components/SlideSidebar/index.tsx`
- `frontend/src/App.tsx`
- `frontend/src/lib/projectManager.ts`
