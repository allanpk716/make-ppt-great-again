import express from 'express';
import { VersionManager } from '../services/versionManager.js';

const router = express.Router();

// 验证版本
router.post('/validate-version', (req, res) => {
  const { version } = req.body;
  const valid = VersionManager.validateVersion(version);
  res.json({ valid, latestVersion: VersionManager.getLatestVersion() });
});

// 迁移数据
router.post('/migrate', (req, res) => {
  try {
    const migrated = VersionManager.migrate(req.body);
    res.json({ success: true, data: migrated });
  } catch (error) {
    res.status(400).json({ success: true, error: (error as Error).message });
  }
});

export default router;
