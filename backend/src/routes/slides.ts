import express from 'express';
import { SessionManager } from '../services/sessionManager.js';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// 获取幻灯片数据
router.get('/:projectId/slides/:slideId', async (req, res) => {
  try {
    const { projectId, slideId } = req.params;
    const slidePath = path.join(
      SessionManager.getProjectsBasePath(),
      projectId,
      'slides',
      slideId,
      'page.json'
    );

    const data = await fs.readFile(slidePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(404).json({ error: 'Slide not found' });
  }
});

// 更新幻灯片数据
router.put('/:projectId/slides/:slideId', async (req, res) => {
  try {
    const { projectId, slideId } = req.params;
    const pageData = req.body;

    const slidePath = path.join(
      SessionManager.getProjectsBasePath(),
      projectId,
      'slides',
      slideId,
      'page.json'
    );

    await fs.writeFile(slidePath, JSON.stringify(pageData, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slide' });
  }
});

// 创建新幻灯片
router.post('/:projectId/slides', async (req, res) => {
  try {
    const { projectId } = req.params;
    const slideId = req.body.slideId || Math.random().toString(36).substring(2, 9);

    const slidePath = path.join(
      SessionManager.getProjectsBasePath(),
      projectId,
      'slides',
      slideId
    );

    await fs.mkdir(slidePath, { recursive: true });

    // 创建空白页
    const pageData = {
      version: '1.0',
      pageSize: { width: 1280, height: 720 },
      background: '#ffffff',
      elements: []
    };

    await fs.writeFile(
      path.join(slidePath, 'page.json'),
      JSON.stringify(pageData, null, 2)
    );

    // 创建元数据
    const meta = {
      summary: '空白页',
      displayIndex: req.body.displayIndex || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      path.join(slidePath, 'meta.json'),
      JSON.stringify(meta, null, 2)
    );

    res.json({ slideId, data: pageData, meta });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create slide' });
  }
});

export default router;
