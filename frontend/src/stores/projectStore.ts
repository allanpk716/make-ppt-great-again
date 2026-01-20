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
    (set) => ({
      // 初始状态
      workspacePath: '',
      recentProjects: [],
      settings: {
        autoBackupInterval: 5,
        theme: 'light'
      },

      // 设置 Workspace 路径
      setWorkspacePath: (path) => {
        set({ workspacePath: path });
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
