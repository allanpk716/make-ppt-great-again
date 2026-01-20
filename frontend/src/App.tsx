import { usePPTStore } from '@/stores/pptStore';
import { SlideSidebar } from '@/components/SlideSidebar';
import { ResizableLayout } from '@/components/ResizableLayout';
import { ToastProvider } from '@/components/Toast';
import { MenuBar } from '@/components/MenuBar';
import { WelcomeScreen } from '@/components/WelcomeScreen';

function AppContent() {
  const {
    isNewProject,
    slides,
    currentProjectPath,
    isDirty,
    createNewProject,
    loadProject,
    saveProject,
    markDirty
  } = usePPTStore();

  // 菜单栏处理函数
  const handleNewProject = () => {
    createNewProject();
  };

  const handleOpenProject = () => {
    // TODO: 实现打开项目逻辑
    console.log('打开项目');
    markDirty();
  };

  const handleSaveProject = async () => {
    try {
      await saveProject();
      console.log('项目保存成功');
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

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
      <WelcomeScreen
        onCreateProject={handleNewProject}
        onOpenProject={handleOpenProject}
      />
    );
  }

  // 主界面：带菜单栏的三栏布局
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <MenuBar
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
