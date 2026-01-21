import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStorage } from '../storage';

describe('IndexedDBStorage', () => {
  let storage: IndexedDBStorage;

  beforeEach(async () => {
    // 使用唯一的测试数据库名称以避免冲突
    storage = new IndexedDBStorage(`test-db-${Date.now()}`);
    await storage.clear();
  });

  afterEach(async () => {
    try {
      await storage.clear();
    } catch (_error) {
      // 忽略清理错误
    }
  });

  it('should save and retrieve data', async () => {
    const key = 'test-key';
    const data = { slides: [], title: 'Test' };

    await storage.setItem(key, JSON.stringify(data));
    const retrieved = await storage.getItem(key);

    expect(retrieved).not.toBeNull();
    expect(JSON.parse(retrieved!)).toEqual(data);
  });

  it('should handle large datasets', async () => {
    const largeData = {
      slides: Array(1000)
        .fill(null)
        .map((_, i) => ({
          id: `slide-${i}`,
          displayIndex: i,
          data: {
            version: '1.0',
            pageSize: { width: 1280, height: 720 },
            background: '#fff',
            elements: [],
          },
          meta: {
            summary: `Slide ${i}`,
            displayIndex: i,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })),
      title: 'Large Project',
    };

    await storage.setItem('large', JSON.stringify(largeData));
    const retrieved = await storage.getItem('large');

    expect(retrieved).not.toBeNull();
    const parsedData = JSON.parse(retrieved!);
    expect(parsedData.slides).toHaveLength(1000);
  });

  it('should remove item', async () => {
    await storage.setItem('temp', JSON.stringify({ data: 'test' }));
    await storage.removeItem('temp');

    const retrieved = await storage.getItem('temp');
    expect(retrieved).toBeNull();
  });

  it('should clear all items', async () => {
    await storage.setItem('key1', JSON.stringify({ value: 1 }));
    await storage.setItem('key2', JSON.stringify({ value: 2 }));

    await storage.clear();

    const result1 = await storage.getItem('key1');
    const result2 = await storage.getItem('key2');
    expect(result1).toBeNull();
    expect(result2).toBeNull();
  });

  it('should return null for non-existent key', async () => {
    const result = await storage.getItem('non-existent');
    expect(result).toBeNull();
  });

  it('should handle string values correctly', async () => {
    const stringValue = 'simple-string-value';
    await storage.setItem('string-key', stringValue);

    const retrieved = await storage.getItem('string-key');
    expect(retrieved).toBe(stringValue);
  });
});
