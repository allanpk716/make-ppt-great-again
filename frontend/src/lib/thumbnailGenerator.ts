import { fabric } from 'fabric';
import { PageData } from '@/types/ppt';
import { FabricConverter } from './fabricConverter';

export class ThumbnailGenerator {
  private static canvas: fabric.Canvas | null = null;
  private static readonly THUMBNAIL_WIDTH = 320;
  private static readonly THUMBNAIL_HEIGHT = 180;
  private static cache = new Map<string, string>(); // 缓存缩略图
  private static readonly MAX_CACHE_SIZE = 50; // 最大缓存数量

  /**
   * 生成缓存键
   */
  private static getCacheKey(pageData: PageData): string {
    return JSON.stringify(pageData);
  }

  /**
   * 初始化离屏 Canvas
   */
  private static getCanvas(): fabric.Canvas {
    if (!this.canvas) {
      const canvasEl = document.createElement('canvas');
      canvasEl.width = this.THUMBNAIL_WIDTH;
      canvasEl.height = this.THUMBNAIL_HEIGHT;

      this.canvas = new fabric.Canvas(canvasEl, {
        width: this.THUMBNAIL_WIDTH,
        height: this.THUMBNAIL_HEIGHT,
        backgroundColor: '#ffffff',
        selection: false,
        renderOnAddRemove: false, // 性能优化：批量渲染
      });
    }
    return this.canvas;
  }

  /**
   * 清理缓存
   */
  private static cleanCache(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // 删除最早的缓存项
      const keysToDelete = Array.from(this.cache.keys()).slice(
        0,
        this.cache.size - this.MAX_CACHE_SIZE
      );
      keysToDelete.forEach((key) => this.cache.delete(key));
    }
  }

  /**
   * 从页面数据生成缩略图 URL（带缓存）
   */
  static async generateThumbnail(pageData: PageData): Promise<string> {
    // 检查缓存
    const cacheKey = this.getCacheKey(pageData);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const canvas = this.getCanvas();

    // 清空画布
    canvas.clear();
    canvas.setBackgroundColor(pageData.background, () => {});

    // 计算缩放比例
    const scaleX = this.THUMBNAIL_WIDTH / pageData.pageSize.width;
    const scaleY = this.THUMBNAIL_HEIGHT / pageData.pageSize.height;
    const scale = Math.min(scaleX, scaleY);

    // 批量添加元素，避免频繁渲染
    canvas.renderOnAddRemove = false;

    // 转换并添加元素
    pageData.elements.forEach((element) => {
      try {
        const obj = FabricConverter.elementToFabric(element);

        // 应用缩放
        obj.scale(scale);
        obj.set({
          left: element.x * scale,
          top: element.y * scale,
        });

        canvas.add(obj);
      } catch (error) {
        console.error('Failed to convert element:', error);
      }
    });

    canvas.renderOnAddRemove = true;
    canvas.renderAll();

    // 生成 Data URL
    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 0.8,
    });

    // 更新缓存
    this.cache.set(cacheKey, dataUrl);
    this.cleanCache();

    return dataUrl;
  }

  /**
   * 从 Canvas 对象直接生成缩略图（实时预览）
   */
  static generateFromCanvas(
    sourceCanvas: fabric.Canvas,
    pageSize: { width: number; height: number }
  ): string {
    const thumbnailCanvas = this.getCanvas();
    thumbnailCanvas.clear();

    // 计算缩放比例
    const scaleX = this.THUMBNAIL_WIDTH / pageSize.width;
    const scaleY = this.THUMBNAIL_HEIGHT / pageSize.height;
    const scale = Math.min(scaleX, scaleY);

    // 批量操作
    thumbnailCanvas.renderOnAddRemove = false;

    // 克隆所有对象
    const objects = sourceCanvas.getObjects();
    objects.forEach((obj: any) => {
      obj.clone((cloned: fabric.Object) => {
        cloned.scale(scale);
        cloned.set({
          left: (obj.left || 0) * scale,
          top: (obj.top || 0) * scale,
        });
        thumbnailCanvas.add(cloned);
      });
    });

    thumbnailCanvas.renderOnAddRemove = true;
    thumbnailCanvas.renderAll();

    return thumbnailCanvas.toDataURL({
      format: 'png',
      quality: 0.8,
    });
  }

  /**
   * 清理资源
   */
  static dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.cache.clear();
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    this.cache.clear();
  }
}
