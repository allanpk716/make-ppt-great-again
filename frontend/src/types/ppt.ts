// 元素基础类型
export interface BaseElement {
  id: string;
  type: 'text' | 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

// 文本元素
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  style: {
    fontSize: number;
    fontWeight: 'normal' | 'bold';
    fill: string;
    fontFamily: string;
  };
  textAlign: 'left' | 'center' | 'right';
}

// 矩形元素
export interface RectElement extends BaseElement {
  type: 'rect';
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    rx?: number;
    ry?: number;
  };
}

// 元素联合类型
export type PPTElement = TextElement | RectElement;

// 页面数据（简化格式）
export interface PageData {
  version: string;
  pageSize: {
    width: number;
    height: number;
  };
  background: string;
  elements: PPTElement[];
}

// 页面元数据
export interface SlideMeta {
  summary: string;
  displayIndex: number;
  createdAt: string;
  updatedAt: string;
}

// 幻灯片
export interface Slide {
  id: string;
  displayIndex: number;
  data: PageData;
  meta: SlideMeta;
}

// 项目元数据
export interface ProjectMeta {
  title: string;
  createdAt: string;
  updatedAt: string;
  version: string;
}

// 项目数据
export interface Project {
  meta: ProjectMeta;
  slides: Slide[];
}

// AI 上下文类型
export type AIContext = {
  type: 'page' | 'element';
  elementId?: string;
};

// 项目包类型（用于导入导出）
export interface ProjectPackage {
  version: string;
  meta: {
    title: string;
    createdAt: string;
    exportedAt: string;
    appVersion: string;
  };
  slides: Array<{
    id: string;
    displayIndex: number;
    data: PageData;
    meta: SlideMeta;
  }>;
}
