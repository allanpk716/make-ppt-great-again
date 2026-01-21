import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePPTStore } from '../pptStore';

describe('PPTStore', () => {
  beforeEach(() => {
    // 清除 localStorage 中的持久化数据
    localStorage.clear();
    // 重置 store 状态
    usePPTStore.getState().createNewProject();
  });

  afterEach(() => {
    // 每个测试后清除状态，防止状态泄漏
    localStorage.clear();
  });

  describe('Project Management', () => {
    it('should create new project', () => {
      usePPTStore.getState().createNewProject();

      const store = usePPTStore.getState();
      expect(store.slides).toEqual([]);
      expect(store.projectTitle).toBe('');
      expect(store.isNewProject).toBe(true);
      expect(store.currentProjectPath).toBeNull();
    });

    it('should load project', () => {
      const mockProject = {
        slides: [
          {
            id: 'slide-1',
            displayIndex: 0,
            data: {
              version: '1.0',
              pageSize: { width: 1280, height: 720 },
              background: '#ffffff',
              elements: [],
            },
            meta: {
              summary: 'Test Slide',
              displayIndex: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
        title: 'Test Project',
      };

      usePPTStore.getState().loadProject(mockProject, '/test/path');

      const store = usePPTStore.getState();
      expect(store.slides).toHaveLength(1);
      expect(store.projectTitle).toBe('Test Project');
      expect(store.currentProjectPath).toBe('/test/path');
      expect(store.isNewProject).toBe(false);
    });
  });

  describe('Slide Management', () => {
    it('should add slide', () => {
      usePPTStore.getState().addSlide();

      const store = usePPTStore.getState();
      expect(store.slides).toHaveLength(1);
      expect(store.currentSlideId).toBeDefined();
      expect(store.isDirty).toBe(true);
    });

    it('should delete slide', () => {
      usePPTStore.getState().addSlide();
      const slideId = usePPTStore.getState().currentSlideId!;

      usePPTStore.getState().deleteSlide(slideId);

      const store = usePPTStore.getState();
      expect(store.slides).toHaveLength(0);
      expect(store.currentSlideId).toBeNull();
    });

    it('should switch slide', () => {
      usePPTStore.getState().addSlide();
      usePPTStore.getState().addSlide();
      const secondSlideId = usePPTStore.getState().slides[1].id;

      usePPTStore.getState().switchSlide(secondSlideId);

      const store = usePPTStore.getState();
      expect(store.currentSlideId).toBe(secondSlideId);
      expect(store.selectedElementId).toBeNull();
    });

    it('should reorder slides', () => {
      usePPTStore.getState().addSlide();
      usePPTStore.getState().addSlide();
      const [first, second] = usePPTStore.getState().slides;

      usePPTStore.getState().reorderSlides([second.id, first.id]);

      const store = usePPTStore.getState();
      expect(store.slides[0].id).toBe(second.id);
      expect(store.slides[1].id).toBe(first.id);
    });
  });

  describe('Element Selection', () => {
    it('should select element', () => {
      usePPTStore.getState().addSlide();

      usePPTStore.getState().selectElement('element-1');

      const store = usePPTStore.getState();
      expect(store.selectedElementId).toBe('element-1');
    });

    it('should get selected element', () => {
      usePPTStore.getState().addSlide();
      const elementId = 'element-1';

      // 修改当前幻灯片添加元素
      usePPTStore.getState().updateSlideData(usePPTStore.getState().currentSlideId!, {
        version: '1.0',
        pageSize: { width: 1280, height: 720 },
        background: '#ffffff',
        elements: [
          {
            id: elementId,
            type: 'text',
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            content: 'Test',
            style: {
              fontSize: 16,
              fontWeight: 'normal',
              fill: '#000000',
              fontFamily: 'Arial',
            },
            textAlign: 'left',
          },
        ],
      });

      usePPTStore.getState().selectElement(elementId);
      const selected = usePPTStore.getState().getSelectedElement();

      expect(selected).toBeDefined();
      expect(selected?.id).toBe(elementId);
    });

    it('should return null when no element selected', () => {
      const selected = usePPTStore.getState().getSelectedElement();

      expect(selected).toBeNull();
    });
  });

  describe('AI Context', () => {
    it('should return page context when no element selected', () => {
      const context = usePPTStore.getState().getCurrentAIContext();

      expect(context.type).toBe('page');
      expect(context.elementId).toBeUndefined();
    });

    it('should return element context when element selected', () => {
      usePPTStore.getState().selectElement('element-1');

      const context = usePPTStore.getState().getCurrentAIContext();

      expect(context.type).toBe('element');
      expect(context.elementId).toBe('element-1');
    });
  });

  describe('Dirty State', () => {
    it('should mark dirty on slide changes', () => {
      usePPTStore.getState().addSlide();

      const store = usePPTStore.getState();
      expect(store.isDirty).toBe(true);
    });

    it('should mark clean explicitly', () => {
      usePPTStore.getState().markDirty();

      usePPTStore.getState().markClean();

      const store = usePPTStore.getState();
      expect(store.isDirty).toBe(false);
    });
  });
});
