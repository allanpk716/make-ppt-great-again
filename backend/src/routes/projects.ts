import express from 'express';
import { projectService } from '../services/projectService.js';
import fs from 'fs/promises';
import path from 'path';

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

    res.status(201).json({
      success: true,
      data: projectMeta
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to create project:', error);

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
      data: projects
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to list projects:', error);
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
              fs.readFile(metaPath, 'utf-8').then(JSON.parse)
            ]);

            slides.push({
              id: entry.name,
              data: pageData,
              meta: slideMeta
            });
          } catch (error) {
            console.warn(`Failed to read slide ${entry.name}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('No slides directory or error reading slides:', error);
    }

    // 按 slideOrder 排序
    const orderedSlides = projectMeta.slideOrder
      .map(id => slides.find(s => s.id === id))
      .filter(Boolean);

    res.json({
      success: true,
      data: {
        meta: projectMeta,
        slides: orderedSlides
      }
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to open project:', error);

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
      data: { path: workspacePath }
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to get workspace path:', error);
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
      data: { path: newPath }
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error('Failed to set workspace path:', error);
    res.status(500).json({ error: message || 'Failed to set workspace path' });
  }
});

export default router;
