import { fabric } from 'fabric';
import { PageData, PPTElement, TextElement, RectElement } from '@/types/ppt';

export class FabricConverter {
  /**
   * 将简化格式转换为 Fabric.js Canvas 对象
   */
  static pageToFabric(pageData: PageData, canvas: fabric.Canvas): void {
    // 清空画布
    canvas.clear();

    // 设置背景色
    canvas.setBackgroundColor(pageData.background, () => {});

    // 转换元素
    const fabricObjects = pageData.elements.map(element => this.elementToFabric(element));

    // 添加到画布
    fabricObjects.forEach(obj => {
      canvas.add(obj);
    });

    // 渲染
    canvas.renderAll();
  }

  /**
   * 将单个元素转换为 Fabric.js 对象
   */
  static elementToFabric(element: PPTElement): fabric.Object {
    if (element.type === 'text') {
      return this.textToFabric(element);
    } else if (element.type === 'rect') {
      return this.rectToFabric(element);
    }
    throw new Error(`Unsupported element type: ${(element as any).type}`);
  }

  /**
   * 文本元素转换
   */
  static textToFabric(element: TextElement): fabric.Text {
    return new fabric.Text(element.content, {
      id: element.id,
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fontSize: element.style.fontSize,
      fontWeight: element.style.fontWeight,
      fill: element.style.fill,
      fontFamily: element.style.fontFamily,
      textAlign: element.textAlign,
      selectable: true,
      hasControls: true
    });
  }

  /**
   * 矩形元素转换
   */
  static rectToFabric(element: RectElement): fabric.Rect {
    return new fabric.Rect({
      id: element.id,
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      fill: element.style.fill,
      stroke: element.style.stroke,
      strokeWidth: element.style.strokeWidth,
      rx: element.style.rx,
      ry: element.style.ry,
      selectable: true,
      hasControls: true
    });
  }

  /**
   * 将 Fabric.js Canvas 转换为简化格式
   */
  static fabricToPage(canvas: fabric.Canvas): PageData {
    const objects = canvas.getObjects();
    const elements: PPTElement[] = objects.map(obj => this.fabricToElement(obj));

    return {
      version: '1.0',
      pageSize: {
        width: canvas.width || 1280,
        height: canvas.height || 720
      },
      background: (canvas.backgroundColor as string) || '#ffffff',
      elements
    };
  }

  /**
   * 将 Fabric.js 对象转换为元素
   */
  static fabricToElement(obj: fabric.Object): PPTElement {
    const id = (obj as any).id || Math.random().toString(36).substring(2, 9);

    if (obj instanceof fabric.Text) {
      return {
        id,
        type: 'text',
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width || 100,
        height: obj.height || 20,
        content: obj.text || '',
        style: {
          fontSize: obj.fontSize || 16,
          fontWeight: (obj.fontWeight === 'bold' ? 'bold' : 'normal') as 'normal' | 'bold',
          fill: (obj.fill as string) || '#000000',
          fontFamily: obj.fontFamily || 'Arial'
        },
        textAlign: (obj.textAlign as 'left' | 'center' | 'right') || 'left'
      } as TextElement;
    }

    if (obj instanceof fabric.Rect) {
      return {
        id,
        type: 'rect',
        x: obj.left || 0,
        y: obj.top || 0,
        width: obj.width || 100,
        height: obj.height || 100,
        style: {
          fill: (obj.fill as string) || '#cccccc',
          stroke: obj.stroke as string,
          strokeWidth: obj.strokeWidth,
          rx: obj.rx,
          ry: obj.ry
        }
      } as RectElement;
    }

    // 默认返回矩形（兜底）
    return {
      id,
      type: 'rect',
      x: obj.left || 0,
      y: obj.top || 0,
      width: obj.width || 100,
      height: obj.height || 100,
      style: {
        fill: '#cccccc'
      }
    } as RectElement;
  }
}
