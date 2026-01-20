import React, { useState } from 'react';
import { usePPTStore } from '@/stores/pptStore';
import { useProjectStore } from '@/stores/projectStore';
import { SlideSidebar } from '@/components/SlideSidebar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { ToastProvider } from '@/components/Toast';
import { MenuBar } from '@/components/MenuBar';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { OpenProjectDialog } from '@/components/OpenProjectDialog';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { RecentProject } from '@/types/project';

function AppContent() {
  const {
    isNewProject,
    slides,
    currentProjectPath,
    projectTitle,
    isDirty,
    createNewProject,
    loadProject,
    saveProject,
    markDirty
  } = usePPTStore();
  const { addRecentProject } = useProjectStore();
  const [showOpenProjectDialog, setShowOpenProjectDialog] = useState(false);

  // 菜单栏处理函数 - 定义在 useKeyboardShortcuts 之前
  const handleNewProject = () => {
    createNewProject();
  };

  const handleOpenProject = () => {
    setShowOpenProjectDialog(true);
  };

  // 处理从对话框选择打开项目
  const handleOpenProjectFromDialog = async (projectPath: string) => {
    try {
      const response = await fetch(`/api/projects/open?projectPath=${encodeURIComponent(projectPath)}`);
      if (!response.ok) {
        throw new Error('Failed to open project');
      }
      const data = await response.json();

      // 加载项目数据到 store
      loadProject(
        { slides: data.data.slides, title: data.data.meta.title || '未命名项目' },
        projectPath
      );

      // 添加到最近项目
      const recentProject: RecentProject = {
        path: projectPath,
        title: data.data.meta.title || '未命名项目',
        lastOpened: new Date().toISOString()
      };
      addRecentProject(recentProject);
    } catch (error) {
      console.error('Error opening project:', error);
    }
  };

  const handleSaveProject = async () => {
    try {
      await saveProject();
      console.log('项目保存成功');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  // 键盘快捷键处理
  useKeyboardShortcuts({
    'ctrl+n': handleNewProject,
    'ctrl+o': handleOpenProject,
    'ctrl+s': handleSaveProject,
  }, {
    enableMac: true,
    preventDefault: true
  });

  const handleExit = () => {
    // TODO: 实现退出逻辑
    console.log('退出应用');
  };

  const handleWorkspacePath = () => {
    // TODO: 实现设置 workspace 路径
    console.log('设置 workspace 路径');
  };

  const handleAutoBackup = () => {
    // TODO: 实现设置自动备份间隔
    console.log('设置自动备份间隔');
  };

  // 显示欢迎页面（无项目且无幻灯片）
  if (!currentProjectPath && slides.length === 0) {
    return (
      <>
        <WelcomeScreen />
        <OpenProjectDialog
          open={showOpenProjectDialog}
          onClose={() => setShowOpenProjectDialog(false)}
          onOpen={handleOpenProjectFromDialog}
        />
      </>
    );
  }

  // 主界面：带菜单栏的三栏布局
  return (
    <>
      <div className="h-screen flex flex-col bg-slate-50">
        <MenuBar
          projectTitle={projectTitle}
          onNewProject={handleNewProject}
          onOpenProject={handleOpenProject}
          onSaveProject={handleSaveProject}
          onExit={handleExit}
          onWorkspacePath={handleWorkspacePath}
          onAutoBackup={handleAutoBackup}
          isDirty={isDirty}
          shortcuts={{ new: 'Ctrl+N', open: 'Ctrl+O', save: 'Ctrl+S' }}
        />
        <div className="flex flex-1 overflow-hidden">
          <SlideSidebar />
          <ResizableLayout />
        </div>
      </div>
      <OpenProjectDialog
        open={showOpenProjectDialog}
        onClose={() => setShowOpenProjectDialog(false)}
        onOpen={handleOpenProjectFromDialog}
      />
    </>
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
