import React, { useState, useRef, useEffect } from 'react';

interface MenuBarProps {
  projectTitle?: string;
  onNewProject?: () => void;
  onOpenProject?: () => void;
  onSaveProject?: () => void;
  onExit?: () => void;
  onWorkspacePath?: () => void;
  onAutoBackup?: () => void;
  isDirty?: boolean;
  shortcuts?: {
    new: string;
    open: string;
    save: string;
  };
}

export const MenuBar: React.FC<MenuBarProps> = ({
  projectTitle,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExit,
  onWorkspacePath,
  onAutoBackup,
  isDirty = false,
  shortcuts = { new: 'Ctrl+N', open: 'Ctrl+O', save: 'Ctrl+S' }
}) => {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setFileMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-gray-900 text-white px-2 py-2 flex items-center justify-between border-b border-gray-700 h-[50px] select-none relative">
      <div className="flex items-center">
        {/* 文件菜单 */}
        <div className="mr-6 relative" ref={fileMenuRef}>
          <button
            className="hover:text-white text-gray-300 transition-colors px-3 py-1 rounded hover:bg-gray-800"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            aria-label="文件菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>

          {fileMenuOpen && (
            <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[200px] z-50">
              <button
                onClick={() => {
                  onNewProject?.();
                  setFileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>新建项目</span>
                {shortcuts.new && <span className="ml-auto opacity-70">({shortcuts.new})</span>}
              </button>

              <button
                onClick={() => {
                  onOpenProject?.();
                  setFileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span>打开项目</span>
                {shortcuts.open && <span className="ml-auto opacity-70">({shortcuts.open})</span>}
              </button>

              <button
                onClick={() => {
                  onSaveProject?.();
                  setFileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>保存</span>
                {shortcuts.save && <span className="ml-auto opacity-70">({shortcuts.save})</span>}
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span>
                )}
              </button>

              <div className="border-t border-gray-700"></div>

              <button
                onClick={() => {
                  onExit?.();
                  setFileMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>退出</span>
              </button>
            </div>
          )}
        </div>

        {/* 设置菜单 */}
        <div className="relative" ref={settingsMenuRef}>
          <button
            className="hover:text-white text-gray-300 transition-colors px-3 py-1 rounded hover:bg-gray-800"
            onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
            aria-label="设置菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {settingsMenuOpen && (
            <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[200px] z-50">
              <button
                onClick={() => {
                  onWorkspacePath?.();
                  setSettingsMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors"
              >
                Workspace 路径
              </button>

              <button
                onClick={() => {
                  onAutoBackup?.();
                  setSettingsMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors"
              >
                自动备份间隔
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 项目名称显示在中间 */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <h1 className="text-xl font-semibold text-white truncate max-w-lg">
          {projectTitle || '未命名项目'}
        </h1>
      </div>

      {/* 右侧保存状态 */}
      <div className="flex items-center">
        {isDirty && (
          <span className="text-sm text-gray-400">未保存</span>
        )}
      </div>
    </div>
  );
};
