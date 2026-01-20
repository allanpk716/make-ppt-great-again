// frontend/src/types/project.ts
export interface RecentProject {
  path: string;
  title: string;
  lastOpened: string;
  thumbnail?: string;
}

export interface ProjectSettings {
  autoBackupInterval: number; // 分钟
  theme: 'light' | 'dark';
}

export interface ProjectMeta {
  id: string;
  title: string;
  version: string;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
  lastAutoBackup: string;
  slideCount: number;
  slideOrder: string[];
  appVersion: string;
}
