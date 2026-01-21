import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  enableMac?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: Record<string, () => void>,
  options: KeyboardShortcutOptions = {}
) {
  const { enableMac = false, preventDefault = true } = options;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 获取修饰键状态
      const ctrlKey = event.ctrlKey;
      const metaKey = event.metaKey; // Command 键 on Mac
      const shiftKey = event.shiftKey;
      const altKey = event.altKey;

      // 判断是否按下快捷键（Ctrl/Cmd）
      const isShortcut = enableMac ? metaKey || ctrlKey : ctrlKey;

      if (!isShortcut) return;

      // 构建快捷键键名
      const key = event.key.toLowerCase();
      let shortcutName = key;

      // 添加修饰键
      if (shiftKey) shortcutName = `shift+${key}`;
      if (altKey) shortcutName = `alt+${key}`;

      // 查找匹配的快捷键处理函数
      const handler = shortcuts[shortcutName];
      if (handler) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enableMac, preventDefault]);
}

// 预定义的常用快捷键
export const COMMON_SHORTCUTS = {
  save: 'ctrl+s',
  saveAs: 'ctrl+shift+s',
  new: 'ctrl+n',
  open: 'ctrl+o',
  undo: 'ctrl+z',
  redo: 'ctrl+shift+z',
  copy: 'ctrl+c',
  paste: 'ctrl+v',
  cut: 'ctrl+x',
  delete: 'delete',
  escape: 'escape',
} as const;

// 将键盘事件转换为快捷键名称
export const eventToShortcut = (event: KeyboardEvent): string => {
  const key = event.key.toLowerCase();
  const parts: string[] = [];

  if (event.shiftKey) parts.push('shift');
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.metaKey) parts.push('meta');

  parts.push(key);
  return parts.join('+');
};
