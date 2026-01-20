export interface ZoomState {
  level: number;           // 当前缩放级别（0.25 - 4.0）
  isAutoFit: boolean;     // 是否为"适应页面"模式
  lastManualLevel: number; // 上次手动设置的缩放级别
}

export interface ZoomContextValue {
  zoom: number;
  isAutoFit: boolean;
  setZoom: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetToFit: () => void;
  calculateFitToPage: (container: HTMLElement) => number;
}
