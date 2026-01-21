import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { usePPTStore } from '@/stores/pptStore';
import { RecentProject } from '@/types/project';
import { NewProjectDialog } from '@/components/NewProjectDialog';

export const WelcomeScreen: React.FC = () => {
  const { recentProjects, addRecentProject } = useProjectStore();
  const { loadProject } = usePPTStore();
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // 获取项目列表
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/list');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时获取项目列表
  useEffect(() => {
    fetchProjects();
  }, []);

  // 新建项目
  const handleNewProject = () => {
    setShowNewProjectDialog(true);
  };

  // 项目创建完成
  const handleProjectCreated = async (name: string) => {
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const data = await response.json();

      // 加载新创建的项目
      await handleOpenProject(data.data.path);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  // 打开项目
  const handleOpenProject = async (path: string) => {
    try {
      const response = await fetch(`/api/projects/open?projectPath=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error('Failed to open project');
      }
      const data = await response.json();

      // 加载项目数据到 store
      loadProject({ slides: data.data.slides, title: data.data.meta.title || '未命名项目' }, path);

      // 添加到最近项目
      const recentProject: RecentProject = {
        path,
        title: data.data.meta.title || '未命名项目',
        lastOpened: new Date().toISOString(),
      };
      addRecentProject(recentProject);
    } catch (error) {
      console.error('Error opening project:', error);
    }
  };

  // 处理最近项目卡片点击
  const handleRecentProjectClick = (project: RecentProject) => {
    handleOpenProject(project.path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        {/* 标题区域 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-4">PPT Copilot</h1>
          <p className="text-xl text-slate-600">智能 PPT 编辑助手，让创作更简单</p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-4 max-w-md mx-auto">
          <button
            onClick={handleNewProject}
            className="w-full px-6 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0 shadow-lg"
          >
            新建项目
          </button>
        </div>

        {/* 最近项目 */}
        {(recentProjects.length > 0 || projects.length > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-slate-800 mb-6">最近项目</h2>

            {loading ? (
              <div className="text-center text-slate-500 py-8">加载中...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...recentProjects, ...projects].map((project, index) => (
                  <div
                    key={`${project.path}-${index}`}
                    onClick={() => handleRecentProjectClick(project)}
                    className="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-slate-50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-slate-800 truncate flex-1">
                        {project.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500 truncate mb-2">{project.path}</p>
                    <p className="text-xs text-slate-400">
                      {project.lastOpened
                        ? `上次打开: ${new Date(project.lastOpened).toLocaleString('zh-CN')}`
                        : '项目文件'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {recentProjects.length === 0 && projects.length === 0 && !loading && (
              <div className="text-center text-slate-500 py-8">暂无最近项目</div>
            )}
          </div>
        )}

        {/* 新建项目对话框 */}
        <NewProjectDialog
          open={showNewProjectDialog}
          onClose={() => setShowNewProjectDialog(false)}
          onCreate={handleProjectCreated}
        />
      </div>
    </div>
  );
};
