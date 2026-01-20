import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  ProjectMeta,
  CreateProjectOptions,
  ProjectListItem,
} from '../types/project.js';

class ProjectService {
  private workspacePath: string;
  private recentProjectsPath: string;

  constructor() {
    // 默认工作空间路径为用户主目录下的 PPTWorkspace
    this.workspacePath = path.join(process.env.USERPROFILE || '', 'PPTWorkspace');
    this.recentProjectsPath = path.join(this.workspacePath, 'recentProjects.json');
  }

  async initialize(): Promise<void> {
    try {
      // 创建工作空间目录
      await fs.mkdir(this.workspacePath, { recursive: true });

      // 如果 recentProjects.json 不存在，创建空文件
      try {
        await fs.access(this.recentProjectsPath);
      } catch {
        await fs.writeFile(this.recentProjectsPath, JSON.stringify([], null, 2));
      }

      console.log('ProjectService initialized');
      console.log(`Workspace path: ${this.workspacePath}`);
    } catch (error) {
      console.error('Failed to initialize ProjectService:', error);
      throw error;
    }
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  async setWorkspacePath(newPath: string): Promise<void> {
    this.workspacePath = newPath;
    this.recentProjectsPath = path.join(newPath, 'recentProjects.json');

    // 重新初始化目录结构
    await fs.mkdir(newPath, { recursive: true });

    try {
      await fs.access(this.recentProjectsPath);
    } catch {
      await fs.writeFile(this.recentProjectsPath, JSON.stringify([], null, 2));
    }
  }

  async createProject(options: CreateProjectOptions): Promise<ProjectMeta> {
    const projectId = uuidv4();
    const projectPath = options.location
      ? path.join(options.location, options.name)
      : path.join(this.workspacePath, options.name);

    // 创建项目目录结构
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'slides'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'assets'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.backups'), { recursive: true });

    // 创建项目元数据
    const now = new Date().toISOString();
    const projectMeta: ProjectMeta = {
      id: projectId,
      title: options.name,
      version: '1.0.0',
      schemaVersion: '1.0.0',
      createdAt: now,
      updatedAt: now,
      lastAutoBackup: now,
      slideCount: 0,
      slideOrder: [],
      appVersion: '0.1.0',
    };

    // 写入 project.json
    await fs.writeFile(
      path.join(projectPath, 'project.json'),
      JSON.stringify(projectMeta, null, 2),
    );

    console.log(`Project created: ${projectPath}`);
    return projectMeta;
  }

  async openProject(projectPath: string): Promise<ProjectMeta> {
    const projectJsonPath = path.join(projectPath, 'project.json');

    try {
      const content = await fs.readFile(projectJsonPath, 'utf-8');
      const projectMeta: ProjectMeta = JSON.parse(content);
      console.log(`Project opened: ${projectPath}`);
      return projectMeta;
    } catch (error) {
      console.error(`Failed to open project: ${projectPath}`, error);
      throw error;
    }
  }

  async listProjects(): Promise<ProjectListItem[]> {
    try {
      const entries = await fs.readdir(this.workspacePath, { withFileTypes: true });
      const projects: ProjectListItem[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(this.workspacePath, entry.name);
          const projectJsonPath = path.join(projectPath, 'project.json');

          try {
            const stats = await fs.stat(projectPath);
            const content = await fs.readFile(projectJsonPath, 'utf-8');
            const projectMeta: ProjectMeta = JSON.parse(content);

            projects.push({
              path: projectPath,
              title: projectMeta.title,
              lastModified: stats.mtime.toISOString(),
              slideCount: projectMeta.slideCount,
            });
          } catch {
            // 跳过无效的项目目录
            continue;
          }
        }
      }

      return projects;
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }
}

export const projectService = new ProjectService();
