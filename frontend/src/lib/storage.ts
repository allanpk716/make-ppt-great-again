import { StateStorage } from 'zustand/middleware';

export class IndexedDBStorage implements StateStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string, storeName: string = 'zustand') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async openDB(): Promise<IDBDatabase> {
    // 如果已经初始化，直接返回
    if (this.db) {
      return this.db;
    }

    // 如果正在初始化，等待初始化完成
    if (this.initPromise) {
      return this.initPromise;
    }

    // 开始初始化
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });

    return this.initPromise;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result ?? null);
        };

        request.onerror = () => {
          console.error('IndexedDB getItem error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to get item from IndexedDB:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('IndexedDB setItem error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to set item in IndexedDB:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('IndexedDB removeItem error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to remove item from IndexedDB:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.openDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('IndexedDB clear error:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
      throw error;
    }
  }
}

// 创建单例实例用于 PPT 存储
export const indexedDBStorage = new IndexedDBStorage('ppt-copilot-storage');
