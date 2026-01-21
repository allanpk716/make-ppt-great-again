import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';

expect.extend(matchers);

// 在测试环境中使用 fake-indexeddb
if (typeof window !== 'undefined' && !window.indexedDB) {
  window.indexedDB = new FDBFactory();
}

afterEach(() => {
  cleanup();
});
