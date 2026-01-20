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

export interface CreateProjectOptions {
  name: string;
  location?: string;
}

export interface ProjectListItem {
  path: string;
  title: string;
  lastModified: string;
  slideCount: number;
}
