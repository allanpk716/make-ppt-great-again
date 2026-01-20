import express from 'express';
import { projectService } from '../services/projectService.js';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// 创建新项目
router.post('/create', async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
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

    const projectMeta = await projectService.openProject(projectPath);

    // 读取幻灯片列表
    const slidesDir = path.join(projectPath, 'slides');
    let slides: string[] = [];

    try {
      const entries = await fs.readdir(slidesDir, { withFileTypes: true });
      slides = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      console.warn('No slides directory or empty:', slidesDir);
    }

    res.json({
      success: true,
      data: {
        meta: projectMeta,
        slides
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
    const { path: newPath } = req.body;

    if (!newPath) {
      return res.status(400).json({ error: 'Workspace path is required' });
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
