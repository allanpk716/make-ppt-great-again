import { describe, it, expect, beforeEach } from '@jest/globals';
import { ProjectService } from '../projectService.js';
import fs from 'fs/promises';

describe('ProjectService - Path Security', () => {
  let projectService: ProjectService;

  beforeEach(() => {
    projectService = new ProjectService();
  });

  describe('setWorkspacePath', () => {
    it('should reject empty paths', async () => {
      await expect(projectService.setWorkspacePath('')).rejects.toThrow('cannot be empty');
    });

    it('should reject paths with parent directory references', async () => {
      await expect(projectService.setWorkspacePath('../etc')).rejects.toThrow('parent directory');
    });

    it('should reject absolute paths outside workspace', async () => {
      await expect(projectService.setWorkspacePath('C:\\Windows\\System32')).rejects.toThrow(
        'Absolute paths'
      );
    });

    it('should reject paths with tilde', async () => {
      await expect(projectService.setWorkspacePath('~')).rejects.toThrow('parent directory');
    });
  });

  describe('createProject', () => {
    it('should sanitize project names with path traversal', async () => {
      const maliciousName = '../../../etc/passwd';
      await expect(projectService.createProject({ name: maliciousName })).rejects.toThrow(
        'parent directory'
      );
    });

    it('should reject names with invalid characters', async () => {
      const invalidName = 'project<>&|';
      await expect(projectService.createProject({ name: invalidName })).rejects.toThrow(
        'invalid characters'
      );
    });

    it('should reject empty project names', async () => {
      await expect(projectService.createProject({ name: '' })).rejects.toThrow('cannot be empty');
    });
  });
});
