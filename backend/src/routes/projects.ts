import express from 'express';
import { projectService } from '../services/projectService.js';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../lib/logger.js';

interface SlideData {
  version?: string;
  pageSize?: { width: number; height: number };
  background?: string;
  elements?: unknown[];
}

interface SlideMeta {
  summary?: string;
  displayIndex?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Slide {
  id: string;
  data: SlideData;
  meta: SlideMeta;
}

const router = express.Router();

// 创建新项目
router.post('/create', async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { name, location } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Project name is required and must be a string' });
    }

    if (location !== undefined && typeof location !== 'string') {
      return res.status(400).json({ error: 'Location must be a string' });
    }

    const projectMeta = await projectService.createProject({ name, location });

    // 计算项目路径（与 createProject 中的逻辑一致）
    const sanitizedName = name
      .replace(/[<>:"|?*]/g, '')
      .replace(/\.\./g, '')
      .replace(/[\/\\]/g, '')
      .trim();

    const projectPath = location
      ? path.join(location, sanitizedName)
      : path.join(await projectService.getWorkspacePath(), sanitizedName);

    res.status(201).json({
      success: true,
      data: {
        ...projectMeta,
        path: projectPath,
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to create project', { error });

    if (message.includes('already exists')) {
      return res.status(409).json({ error: message });
    }

    res.status(500).json({ error: message || 'Failed to create project' });
  }
});

// 列出所有项目
router.get('/list', async (req, res) => {
  try {
    const projects = await projectService.listProjects();

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to list projects', { error });
    res.status(500).json({ error: message || 'Failed to list projects' });
  }
});

// 打开项目
router.get('/open', async (req, res) => {
  try {
    const { projectPath } = req.query;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required' });
    }

    // Decode and normalize
    const decodedPath = decodeURIComponent(projectPath);
    const normalizedPath = path.normalize(decodedPath);

    // Check for null byte injection
    if (normalizedPath.includes('\0')) {
      return res.status(400).json({ error: 'Invalid project path' });
    }

    const projectMeta = await projectService.openProject(normalizedPath);

    // 读取幻灯片详细数据
    const slidesDir = path.join(normalizedPath, 'slides');
    const slides: Slide[] = [];

    try {
      const entries = await fs.readdir(slidesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const slidePath = path.join(slidesDir, entry.name);
          const pageDataPath = path.join(slidePath, 'page.json');
          const metaPath = path.join(slidePath, 'meta.json');

          try {
            const [pageData, slideMeta] = await Promise.all([
              fs.readFile(pageDataPath, 'utf-8').then(JSON.parse),
              fs.readFile(metaPath, 'utf-8').then(JSON.parse),
            ]);

            slides.push({
              id: entry.name,
              data: pageData,
              meta: slideMeta,
            });
          } catch (error) {
            logger.warn(`Failed to read slide ${entry.name}`, { error });
          }
        }
      }
    } catch (error) {
      logger.warn('No slides directory or error reading slides', { error });
    }

    // 按 slideOrder 排序
    const orderedSlides = projectMeta.slideOrder
      .map((id) => slides.find((s) => s.id === id))
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        meta: projectMeta,
        slides: orderedSlides,
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to open project', { error });

    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }

    if (message.includes('Permission denied')) {
      return res.status(403).json({ error: message });
    }

    res.status(500).json({ error: message || 'Failed to open project' });
  }
});

// 获取工作空间路径
router.get('/workspace', (req, res) => {
  try {
    const workspacePath = projectService.getWorkspacePath();

    res.json({
      success: true,
      data: { path: workspacePath },
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to get workspace path', { error });
    res.status(500).json({ error: message || 'Failed to get workspace path' });
  }
});

// 更新工作空间路径
router.put('/workspace', async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { path: newPath } = req.body;

    if (!newPath || typeof newPath !== 'string') {
      return res.status(400).json({ error: 'Workspace path is required and must be a string' });
    }

    await projectService.setWorkspacePath(newPath);

    res.json({
      success: true,
      data: { path: newPath },
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to set workspace path', { error });
    res.status(500).json({ error: message || 'Failed to set workspace path' });
  }
});

// 保存项目
router.post('/save', async (req, res) => {
  try {
    // Validate request body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Request body is required' });
    }

    const { path: projectPath, title, slides } = req.body;

    if (!projectPath || typeof projectPath !== 'string') {
      return res.status(400).json({ error: 'Project path is required and must be a string' });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Project title is required and must be a string' });
    }

    if (!Array.isArray(slides)) {
      return res.status(400).json({ error: 'Slides must be an array' });
    }

    // 检查项目是否存在
    const normalizedPath = path.normalize(projectPath);
    if (normalizedPath.includes('\0')) {
      return res.status(400).json({ error: 'Invalid project path' });
    }

    try {
      await fs.access(normalizedPath);
    } catch {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 更新项目元数据
    await projectService.updateProject(normalizedPath, {
      title,
      updatedAt: new Date().toISOString(),
    });

    // 保存所有幻灯片
    const slideIds = [];
    for (const slide of slides) {
      const slidePath = path.join(normalizedPath, 'slides', slide.id);
      const pageDataPath = path.join(slidePath, 'page.json');
      const metaPath = path.join(slidePath, 'meta.json');

      await fs.mkdir(slidePath, { recursive: true });

      // 保存页面数据
      await fs.writeFile(pageDataPath, JSON.stringify(slide.data, null, 2));

      // 保存元数据
      await fs.writeFile(
        metaPath,
        JSON.stringify(
          {
            ...slide.meta,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      slideIds.push(slide.id);
    }

    // 更新项目中的幻灯片顺序
    const updatedMeta = await projectService.updateProject(normalizedPath, {
      slideOrder: slideIds,
      updatedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        message: 'Project saved successfully',
        meta: updatedMeta,
        slideCount: slides.length,
      },
    });
  } catch (error) {
    const message = (error as Error).message;
    logger.error('Failed to save project', { error });

    if (message.includes('Permission denied')) {
      return res.status(403).json({ error: message });
    }

    res.status(500).json({ error: message || 'Failed to save project' });
  }
});

export default router;
