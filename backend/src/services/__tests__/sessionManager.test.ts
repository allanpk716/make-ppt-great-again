/**
 * SessionManager 单元测试
 *
 * TECHNICAL DEBT NOTE:
 * 3 个 initialize 测试由于 Jest ESM 模式的 mock 限制而失败:
 * - should create projects directory
 * - should start cleanup timer on initialization
 * - should throw error when directory creation fails
 *
 * 根本原因：jest.requireMock() 在 ESM 模式下无法正确拦截 fs/promises 模块导入
 * 实际服务逻辑正确 - 已在集成测试中验证
 * TODO: 考虑迁移到 Vitest 或等待 Jest 后续版本的 ESM 改进
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionManager } from '../sessionManager';

// Mock fs module
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
}));

const fsMock = jest.requireMock('fs/promises') as { mkdir: any };

describe('SessionManager', () => {
  beforeEach(() => {
    // 清理会话和活动追踪器
    SessionManager['sessions'].clear();
    SessionManager['activityTracker'].clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // 清理所有定时器
    jest.clearAllTimers();
  });

  describe('initialize', () => {
    it('should create projects directory', async () => {
      fsMock.mkdir.mockResolvedValue(undefined);

      await SessionManager.initialize();

      expect(fsMock.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('projects'),
        { recursive: true }
      );
    });

    it('should start cleanup timer on initialization', async () => {
      fsMock.mkdir.mockResolvedValue(undefined);
      jest.useFakeTimers();

      await SessionManager.initialize();

      // Verify timer was started by advancing time
      jest.advanceTimersByTime(60000);

      expect(fsMock.mkdir).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should throw error when directory creation fails', async () => {
      const error = new Error('Permission denied');
      fsMock.mkdir.mockRejectedValue(error);

      await expect(SessionManager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('updateActivity', () => {
    it('should update activity timestamp for session', () => {
      const slideId = 'test-slide-1';

      SessionManager.updateActivity(slideId);

      const tracker = SessionManager['activityTracker'];
      expect(tracker.has(slideId)).toBe(true);
      expect(tracker.get(slideId)).toBeInstanceOf(Date);
    });

    it('should update activity for multiple sessions', () => {
      const slideIds = ['slide-1', 'slide-2', 'slide-3'];

      slideIds.forEach(id => SessionManager.updateActivity(id));

      const tracker = SessionManager['activityTracker'];
      expect(tracker.size).toBe(3);
      slideIds.forEach(id => {
        expect(tracker.has(id)).toBe(true);
      });
    });

    it('should overwrite existing activity timestamp', () => {
      const slideId = 'test-slide';

      SessionManager.updateActivity(slideId);
      const firstTimestamp = SessionManager['activityTracker'].get(slideId);

      // Wait a bit and update again
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000);
      SessionManager.updateActivity(slideId);
      jest.useRealTimers();

      const secondTimestamp = SessionManager['activityTracker'].get(slideId);

      if (secondTimestamp && firstTimestamp) {
        expect(secondTimestamp.getTime()).toBeGreaterThan(firstTimestamp.getTime());
      }
    });
  });

  describe('getOldestInactiveSession', () => {
    it('should return null when no sessions exist', () => {
      const oldest = SessionManager['getOldestInactiveSession']();

      expect(oldest).toBeNull();
    });

    it('should identify the oldest inactive session', () => {
      jest.useFakeTimers();

      // Create sessions at different times
      SessionManager.updateActivity('slide-1');
      jest.advanceTimersByTime(5000);
      SessionManager.updateActivity('slide-2');
      jest.advanceTimersByTime(5000);
      SessionManager.updateActivity('slide-3');

      const oldest = SessionManager['getOldestInactiveSession']();

      expect(oldest).toBe('slide-1');

      jest.useRealTimers();
    });

    it('should return oldest when multiple sessions exist', () => {
      jest.useFakeTimers();

      SessionManager.updateActivity('session-a');
      jest.advanceTimersByTime(1000);
      SessionManager.updateActivity('session-b');
      jest.advanceTimersByTime(2000);
      SessionManager.updateActivity('session-c');

      const oldest = SessionManager['getOldestInactiveSession']();

      expect(oldest).toBe('session-a');

      jest.useRealTimers();
    });
  });

  describe('registerClient', () => {
    it('should register WebSocket client to existing session', () => {
      const slideId = 'test-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      // Create a session
      const session = {
        slideId,
        process: { kill: jest.fn() },
        projectPath: '/test/path',
        createdAt: new Date(),
        clients: new Set(),
      };
      SessionManager['sessions'].set(slideId, session as any);

      SessionManager.registerClient(slideId, mockWs as any);

      expect(session.clients.has(mockWs)).toBe(true);
      expect(session.clients.size).toBe(1);
    });

    it('should handle multiple clients for same session', () => {
      const slideId = 'test-slide';
      const mockWs1 = { send: jest.fn(), close: jest.fn(), readyState: 1 };
      const mockWs2 = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      const session = {
        slideId,
        process: { kill: jest.fn() },
        projectPath: '/test/path',
        createdAt: new Date(),
        clients: new Set(),
      };
      SessionManager['sessions'].set(slideId, session as any);

      SessionManager.registerClient(slideId, mockWs1 as any);
      SessionManager.registerClient(slideId, mockWs2 as any);

      expect(session.clients.size).toBe(2);
      expect(session.clients.has(mockWs1)).toBe(true);
      expect(session.clients.has(mockWs2)).toBe(true);
    });

    it('should do nothing when session does not exist', () => {
      const slideId = 'non-existent-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      // Should not throw
      expect(() => {
        SessionManager.registerClient(slideId, mockWs as any);
      }).not.toThrow();
    });
  });

  describe('unregisterClient', () => {
    it('should unregister WebSocket client from session', () => {
      const slideId = 'test-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      const session = {
        slideId,
        process: { kill: jest.fn() },
        projectPath: '/test/path',
        createdAt: new Date(),
        clients: new Set([mockWs]),
      };
      SessionManager['sessions'].set(slideId, session as any);

      SessionManager.unregisterClient(slideId, mockWs as any);

      expect(session.clients.has(mockWs)).toBe(false);
      expect(session.clients.size).toBe(0);
    });

    it('should handle unregistering non-existent client', () => {
      const slideId = 'test-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      const session = {
        slideId,
        process: { kill: jest.fn() },
        projectPath: '/test/path',
        createdAt: new Date(),
        clients: new Set(),
      };
      SessionManager['sessions'].set(slideId, session as any);

      // Should not throw
      expect(() => {
        SessionManager.unregisterClient(slideId, mockWs as any);
      }).not.toThrow();
    });

    it('should handle unregistering from non-existent session', () => {
      const slideId = 'non-existent-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      // Should not throw
      expect(() => {
        SessionManager.unregisterClient(slideId, mockWs as any);
      }).not.toThrow();
    });
  });

  describe('closeSession', () => {
    it('should close session and cleanup resources', () => {
      const slideId = 'test-slide';
      const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

      const mockProcess = {
        kill: jest.fn(),
      };

      const session = {
        slideId,
        process: mockProcess,
        projectPath: '/test/path',
        createdAt: new Date(),
        clients: new Set([mockWs]),
      };
      SessionManager['sessions'].set(slideId, session as any);
      SessionManager['activityTracker'].set(slideId, new Date());

      SessionManager.closeSession(slideId);

      expect(mockProcess.kill).toHaveBeenCalled();
      expect(mockWs.close).toHaveBeenCalled();
      expect(SessionManager['sessions'].has(slideId)).toBe(false);
      expect(SessionManager['activityTracker'].has(slideId)).toBe(false);
    });

    it('should handle closing non-existent session', () => {
      const slideId = 'non-existent-slide';

      // Should not throw
      expect(() => {
        SessionManager.closeSession(slideId);
      }).not.toThrow();
    });
  });

  describe('closeAllSessions', () => {
    it('should close all active sessions', () => {
      // Create multiple sessions
      const sessions = ['slide-1', 'slide-2', 'slide-3'].map(slideId => {
        const mockProcess = {
          kill: jest.fn(),
        };
        const mockWs = { send: jest.fn(), close: jest.fn(), readyState: 1 };

        const session = {
          slideId,
          process: mockProcess,
          projectPath: `/test/${slideId}`,
          createdAt: new Date(),
          clients: new Set([mockWs]),
        };
        SessionManager['sessions'].set(slideId, session as any);
        SessionManager['activityTracker'].set(slideId, new Date());

        return session;
      });

      SessionManager.closeAllSessions();

      // Verify all sessions are closed
      expect(SessionManager['sessions'].size).toBe(0);
      expect(SessionManager['activityTracker'].size).toBe(0);

      // Verify cleanup was called for each
      sessions.forEach(session => {
        expect(session.process.kill).toHaveBeenCalled();
        session.clients.forEach((ws: any) => {
          expect(ws.close).toHaveBeenCalled();
        });
      });
    });

    it('should handle closing when no sessions exist', () => {
      // Should not throw
      expect(() => {
        SessionManager.closeAllSessions();
      }).not.toThrow();
    });
  });

  describe('getProjectsBasePath', () => {
    it('should return the projects base path', () => {
      const basePath = SessionManager.getProjectsBasePath();

      expect(basePath).toContain('projects');
      expect(typeof basePath).toBe('string');
    });
  });
});
