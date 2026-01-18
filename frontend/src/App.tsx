import { usePPTStore } from '@/stores/pptStore';
import { SlideSidebar } from '@/components/SlideSidebar';
import { Workspace } from '@/components/Workspace';
import { CopilotPanel } from '@/components/CopilotPanel';
import { ToastProvider } from '@/components/Toast';

function AppContent() {
  const { isNewProject, slides, addSlide } = usePPTStore();

  // 欢迎页面
  if (isNewProject && slides.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">PPT Copilot</h1>
          <p className="text-xl text-slate-600 mb-8">AI 原生 PPT 生成助手</p>
          <button
            onClick={addSlide}
            className="px-8 py-3 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
          >
            开始创建
          </button>
        </div>
      </div>
    );
  }

  // 主界面：三栏布局
  return (
    <div className="h-screen flex bg-slate-50">
      <SlideSidebar />
      <Workspace />
      <CopilotPanel />
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
