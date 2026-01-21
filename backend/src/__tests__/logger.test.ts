import { describe, it, expect, beforeAll } from '@jest/globals';
import { logger } from '../lib/logger.js';
import fs from 'fs/promises';

describe('Logger', () => {
  beforeAll(async () => {
    // 确保 logs 目录存在
    try {
      await fs.mkdir('logs', { recursive: true });
    } catch {
      // 目录可能已存在
    }
  });

  it('should log info messages', () => {
    expect(() => {
      logger.info('Test info message', { test: 'data' });
    }).not.toThrow();
  });

  it('should log error messages', () => {
    expect(() => {
      logger.error('Test error message', { error: new Error('test') });
    }).not.toThrow();
  });

  it('should log warning messages', () => {
    expect(() => {
      logger.warn('Test warning message');
    }).not.toThrow();
  });

  it('should log debug messages', () => {
    expect(() => {
      logger.debug('Test debug message');
    }).not.toThrow();
  });
});
