import React, { useState, useEffect } from 'react';

export interface ProjectInfo {
  title: string;
  path: string;
  lastOpened?: string;
  createdAt?: string;
}

interface OpenProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onOpen: (projectPath: string) => void;
}

export const OpenProjectDialog: React.FC<OpenProjectDialogProps> = ({
  open,
  onClose,
  onOpen
}) => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 获取项目列表
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/projects/list');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const result = await response.json();

      // 转换项目数据格式
      const projectList: ProjectInfo[] = (result.data || []).map((p: any) => ({
        title: p.meta?.title || p.title || p.name || '未命名项目',
        path: p.path,
        lastOpened: p.meta?.updatedAt || p.updatedAt,
        createdAt: p.meta?.createdAt || p.createdAt
      }));

      setProjects(projectList);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // 对话框打开时获取项目列表
  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  // 过滤项目
  const filteredProjects = projects.filter(project => {
    const title = (project.title || '').toLowerCase();
    const path = (project.path || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || path.includes(query);
  });

  // 处理项目选择
  const handleProjectClick = (projectPath: string) => {
    onOpen(projectPath);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">打开项目</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 搜索框 */}
        <div className="p-6 border-b border-gray-200">
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 项目列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center text-gray-500 py-8">加载中...</div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {searchQuery ? '未找到匹配的项目' : '暂无项目'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.path}
                  onClick={() => handleProjectClick(project.path)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all cursor-pointer bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-800 truncate flex-1">
                      {project.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 truncate mb-2">{project.path}</p>
                  {project.lastOpened && (
                    <p className="text-xs text-gray-400">
                      上次修改: {new Date(project.lastOpened).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
