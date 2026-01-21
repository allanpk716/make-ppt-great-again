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
    // 验证和清理路径
    const sanitizedPath = ProjectService.validateAndSanitizePath(newPath);

    const oldWorkspacePath = this.workspacePath;
    const oldRecentProjectsPath = this.recentProjectsPath;

    try {
      // 创建相对于当前工作目录的完整路径
      const fullPath = path.join(process.cwd(), sanitizedPath);

      // 尝试创建新目录结构
      await fs.mkdir(fullPath, { recursive: true });

      const newRecentProjectsPath = path.join(fullPath, 'recentProjects.json');

      // 创建或保留 recentProjects.json
      try {
        await fs.access(newRecentProjectsPath);
      } catch {
        await fs.writeFile(newRecentProjectsPath, JSON.stringify([], null, 2));
      }

      // 验证成功后才更新状态
      this.workspacePath = fullPath;
      this.recentProjectsPath = newRecentProjectsPath;

      console.log(`Workspace path updated to: ${fullPath}`);
    } catch (error) {
      // 失败时回滚到旧路径
      this.workspacePath = oldWorkspacePath;
      this.recentProjectsPath = oldRecentProjectsPath;
      console.error('Failed to set workspace path, rolled back to previous path:', error);
      throw error;
    }
  }

  private static validateAndSanitizePath(inputPath: string): string {
    // 检查空路径
    if (!inputPath || inputPath.trim() === '') {
      throw new Error('Path cannot be empty');
    }

    // 检查路径遍历攻击
    if (inputPath.includes('..') || inputPath.includes('~')) {
      throw new Error('Path cannot contain parent directory references');
    }

    // 检查绝对路径 (Windows 和 Unix)
    const isAbsolutePath = /^[a-zA-Z]:\\|^\//.test(inputPath);
    if (isAbsolutePath) {
      throw new Error('Absolute paths are not allowed');
    }

    // 检查无效字符 - 如果包含这些字符则拒绝
    if (/[<>:"|?*&]/.test(inputPath)) {
      throw new Error('Path contains invalid characters');
    }

    // 清理路径分隔符
    return inputPath.replace(/[\/\\]/g, '').trim();
  }

  async createProject(options: CreateProjectOptions): Promise<ProjectMeta> {
    // 验证项目名称
    if (!options.name || options.name.trim() === '') {
      throw new Error('Project name cannot be empty');
    }

    // 使用统一的路径验证
    const sanitizedName = ProjectService.validateAndSanitizePath(options.name);

    if (sanitizedName === '') {
      throw new Error('Project name contains invalid characters');
    }

    // 处理 location 参数
    let locationPath: string;
    if (options.location) {
      // 验证 location 是否存在且在允许范围内
      try {
        const stats = await fs.stat(options.location);
        if (!stats.isDirectory()) {
          throw new Error('Location must be a directory');
        }
        locationPath = options.location;
      } catch {
        throw new Error(`Location does not exist: ${options.location}`);
      }
    } else {
      locationPath = this.workspacePath;
    }

    const projectPath = path.join(locationPath, sanitizedName);

    // 检查项目是否已存在
    try {
      await fs.access(projectPath);
      throw new Error(`Project already exists at: ${projectPath}`);
    } catch (error) {
      // 如果是 ENOENT 错误，说明目录不存在，可以继续
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    // 创建项目目录结构
    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.join(projectPath, 'slides'), { recursive: true });
    await fs.mkdir(path.join(projectPath, 'assets'), { recursive: true });
    await fs.mkdir(path.join(projectPath, '.backups'), { recursive: true });

    // 创建项目元数据
    const now = new Date().toISOString();
    const projectMeta: ProjectMeta = {
      id: uuidv4(),
      title: sanitizedName,
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
    // 验证路径不为空
    if (!projectPath || projectPath.trim() === '') {
      throw new Error('Project path cannot be empty');
    }

    const projectJsonPath = path.join(projectPath, 'project.json');

    try {
      // 显式检查文件是否存在
      await fs.access(projectJsonPath);

      // 读取文件内容
      const content = await fs.readFile(projectJsonPath, 'utf-8');

      // 解析 JSON，处理语法错误
      let projectMeta: ProjectMeta;
      try {
        projectMeta = JSON.parse(content);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(`Invalid JSON in project.json at ${projectPath}: ${parseError.message}`);
        }
        throw parseError;
      }

      // 验证必需字段
      if (!projectMeta.id) {
        throw new Error(`Project missing required field 'id' at ${projectPath}`);
      }

      if (!projectMeta.title) {
        throw new Error(`Project missing required field 'title' at ${projectPath}`);
      }

      console.log(`Project opened: ${projectPath}`);
      return projectMeta;
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode === 'ENOENT') {
        throw new Error(`Project not found at: ${projectPath}`);
      }

      if (errorCode === 'EACCES') {
        throw new Error(`Permission denied accessing project at: ${projectPath}`);
      }

      // 重新抛出其他错误（包括我们上面自定义的错误消息）
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
          } catch (error) {
            // 记录警告而不是静默忽略
            console.warn(`Skipping invalid project directory: ${projectPath}`, error);
          }
        }
      }

      return projects;
    } catch (error) {
      console.error('Failed to list projects:', error);
      return [];
    }
  }

  async updateProject(projectPath: string, updates: Partial<ProjectMeta>): Promise<ProjectMeta> {
    // 验证路径不为空
    if (!projectPath || projectPath.trim() === '') {
      throw new Error('Project path cannot be empty');
    }

    const projectJsonPath = path.join(projectPath, 'project.json');

    try {
      // 显式检查文件是否存在
      await fs.access(projectJsonPath);

      // 读取现有内容
      const content = await fs.readFile(projectJsonPath, 'utf-8');
      let projectMeta: ProjectMeta;

      try {
        projectMeta = JSON.parse(content);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(`Invalid JSON in project.json at ${projectPath}: ${parseError.message}`);
        }
        throw parseError;
      }

      // 更新字段
      const updatedMeta: ProjectMeta = {
        ...projectMeta,
        ...updates,
        // 确保 updatedAt 被更新
        ...(updates.updatedAt ? {} : { updatedAt: new Date().toISOString() })
      };

      // 写入更新后的内容
      await fs.writeFile(projectJsonPath, JSON.stringify(updatedMeta, null, 2));

      console.log(`Project updated: ${projectPath}`);
      return updatedMeta;
    } catch (error) {
      const errorCode = (error as NodeJS.ErrnoException).code;

      if (errorCode === 'ENOENT') {
        throw new Error(`Project not found at: ${projectPath}`);
      }

      if (errorCode === 'EACCES') {
        throw new Error(`Permission denied updating project at: ${projectPath}`);
      }

      // 重新抛出其他错误
      console.error(`Failed to update project: ${projectPath}`, error);
      throw error;
    }
  }
}

export { ProjectService };
export const projectService = new ProjectService();
