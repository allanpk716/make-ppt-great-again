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
