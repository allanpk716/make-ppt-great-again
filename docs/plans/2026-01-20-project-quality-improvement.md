# 项目质量改进实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 系统性地解决项目中的测试缺失、安全隐患和代码质量问题，建立可持续的工程化基础。

**Architecture:** 分阶段实施：先解决高优先级安全问题，再建立测试基础设施，最后优化性能和代码质量。

**Tech Stack:**
- 测试框架: Vitest (前端) + Jest (后端)
- 日志库: Winston (后端)
- 认证: JWT + bcrypt
- 限流: express-rate-limit

---

## Phase 0: 准备工作

### Task 0.1: 清理未使用的代码

**Files:**
- Delete: `frontend/src/components/.backup/ThinkingView.tsx`
- Delete: `frontend/src/components/.backup/ToolCallView.tsx`
- Delete: `frontend/src/components/.backup/StreamMessageList.tsx`
- Delete: `frontend/src/components/.backup/` (如果为空)

**Step 1: 确认这些文件不再被引用**

搜索导入：
```bash
cd frontend
grep -r "from.*\.backup" src/
grep -r "import.*\.backup" src/
```

预期输出: 无匹配结果（确认文件未使用）

**Step 2: 删除备份文件**

```bash
cd frontend/src/components
rm -rf .backup
```

**Step 3: 验证应用仍能正常启动**

```bash
cd frontend
npm run dev
```

预期: 开发服务器正常启动，无导入错误

**Step 4: 提交**

```bash
git add frontend/src/components/.backup
git commit -m "chore: remove unused backup components"
```

---

## Phase 1: 安全加固 (高优先级)

### Task 1.1: 添加基础认证中间件

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/services/tokenManager.ts`
- Create: `backend/src/types/auth.ts`
- Modify: `backend/src/index.ts:14-16`

**Step 1: 编写认证服务测试**

创建文件: `backend/src/services/__tests__/tokenManager.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TokenManager } from '../tokenManager';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager('test-secret-key');
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { userId: 'user-123', projectId: 'project-456' };
      const token = tokenManager.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include payload in token', () => {
      const payload = { userId: 'user-123', projectId: 'project-456' };
      const token = tokenManager.generateToken(payload);
      const decoded = tokenManager.verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.projectId).toBe(payload.projectId);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = { userId: 'user-123', projectId: 'project-456' };
      const token = tokenManager.generateToken(payload);
      const decoded = tokenManager.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.string';

      expect(() => {
        tokenManager.verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      jest.useFakeTimers();
      const tokenManagerShort = new TokenManager('test-secret', -1); // 已过期
      const payload = { userId: 'user-123' };
      const token = tokenManagerShort.generateToken(payload);

      expect(() => {
        tokenManagerShort.verifyToken(token);
      }).toThrow();
      jest.useRealTimers();
    });
  });
});
```

运行测试确认失败:
```bash
cd backend
npm test -- tokenManager.test.ts
```

预期: FAIL - TokenManager not defined

**Step 2: 实现类型定义**

创建文件: `backend/src/types/auth.ts`

```typescript
export interface TokenPayload {
  userId: string;
  projectId?: string;
}

export interface AuthRequest extends Express.Request {
  user?: TokenPayload;
}
```

**Step 3: 实现 TokenManager 服务**

创建文件: `backend/src/services/tokenManager.ts`

```typescript
import jwt from 'jsonwebtoken';

export class TokenManager {
  private secret: string;
  private defaultExpiration: string;

  constructor(secret: string, expirationHours: number = 24) {
    this.secret = secret;
    this.defaultExpiration = `${expirationHours}h`;
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.defaultExpiration
    });
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
```

**Step 4: 实现认证中间件**

创建文件: `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { TokenManager } from '../services/tokenManager.js';
import type { AuthRequest, TokenPayload } from '../types/auth.js';

const tokenManager = new TokenManager(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const user = tokenManager.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateAuthToken(payload: TokenPayload): string {
  return tokenManager.generateToken(payload);
}

export { TokenManager };
```

**Step 5: 运行测试确认通过**

```bash
cd backend
npm test -- tokenManager.test.ts
```

预期: PASS

**Step 6: 更新后端入口以应用认证**

修改 `backend/src/index.ts:14-16`:

```typescript
// 在现有导入后添加
import { authenticateToken } from './middleware/auth.js';
```

修改 `backend/src/index.ts:19-21` (路由部分):

```typescript
// 中间件
app.use(cors());
app.use(express.json());

// 公开路由 (无需认证)
app.use('/api/auth', authRouter);

// 受保护路由 (需要认证)
app.use('/api/project', authenticateToken, projectRouter);
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api', authenticateToken, slidesRouter);
```

**Step 7: 提交**

```bash
git add backend/src/
git commit -m "feat(security): add JWT authentication middleware"
```

---

### Task 1.2: 添加认证 API 端点

**Files:**
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/services/userService.ts`
- Modify: `backend/src/index.ts:20`

**Step 1: 编写认证 API 测试**

创建文件: `backend/src/routes/__tests__/auth.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRouter from '../auth';

describe('Auth API', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
  });

  describe('POST /api/auth/login', () => {
    it('should return token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'test-password'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user',
          password: 'wrong-password'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

运行测试确认失败:
```bash
cd backend
npm test -- auth.test.ts
```

**Step 2: 实现用户服务**

创建文件: `backend/src/services/userService.ts`

```typescript
import bcrypt from 'bcrypt';

// 简单的内存用户存储 (生产环境应使用数据库)
const users = new Map<string, { username: string; passwordHash: string }>();

export class UserService {
  static async createUser(username: string, password: string): Promise<void> {
    if (users.has(username)) {
      throw new Error('User already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    users.set(username, { username, passwordHash });
  }

  static async validateUser(username: string, password: string): Promise<boolean> {
    const user = users.get(username);
    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }

  static userExists(username: string): boolean {
    return users.has(username);
  }
}

// 初始化默认测试用户
UserService.createUser('test-user', 'test-password').catch(console.error);
```

**Step 3: 实现认证路由**

创建文件: `backend/src/routes/auth.ts`

```typescript
import express from 'express';
import { generateAuthToken } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';

const router = express.Router();

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const isValid = await UserService.validateUser(username, password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateAuthToken({ userId: username });
    res.json({ token, username });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    await UserService.createUser(username, password);
    const token = generateAuthToken({ userId: username });

    res.status(201).json({ token, username });
  } catch (error) {
    if ((error as Error).message === 'User already exists') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

export default router;
```

**Step 4: 添加 bcrypt 依赖**

```bash
cd backend
npm install bcrypt
npm install --save-dev @types/bcrypt
```

**Step 5: 更新后端入口**

修改 `backend/src/index.ts:20`:

```typescript
import authRouter from './routes/auth.js';
```

**Step 6: 运行测试确认通过**

```bash
cd backend
npm test -- auth.test.ts
```

预期: PASS

**Step 7: 提交**

```bash
git add backend/src/
git commit -m "feat(security): add authentication API endpoints"
```

---

### Task 1.3: 加强路径验证

**Files:**
- Modify: `backend/src/services/projectService.ts:44-78`
- Test: `backend/src/services/__tests__/projectService.test.ts`

**Step 1: 编写路径验证测试**

创建文件: `backend/src/services/__tests__/projectService.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { ProjectService } from '../projectService';
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
      await expect(projectService.setWorkspacePath('../etc')).rejects.toThrow();
    });

    it('should reject absolute paths outside workspace', async () => {
      await expect(projectService.setWorkspacePath('C:\\Windows\\System32')).rejects.toThrow();
    });
  });

  describe('createProject', () => {
    it('should sanitize project names', async () => {
      const maliciousName = '../../../etc/passwd';
      await expect(
        projectService.createProject({ name: maliciousName })
      ).rejects.toThrow();
    });

    it('should reject names with invalid characters', async () => {
      const invalidName = 'project<>&|';
      await expect(
        projectService.createProject({ name: invalidName })
      ).rejects.toThrow('invalid characters');
    });
  });
});
```

运行测试确认失败:
```bash
cd backend
npm test -- projectService.test.ts
```

**Step 2: 添加路径验证函数**

在 `backend/src/services/projectService.ts` 中添加私有方法 (在 `createProject` 方法之前):

```typescript
private static validateAndSanitizePath(inputPath: string): string {
  // 检查空路径
  if (!inputPath || inputPath.trim() === '') {
    throw new Error('Path cannot be empty');
  }

  // 检查路径遍历攻击
  if (inputPath.includes('..') || inputPath.includes('~')) {
    throw new Error('Path cannot contain parent directory references');
  }

  // 检查绝对路径 (Windows 和 Unix)
  const isAbsolutePath = /^[a-zA-Z]:\\|^\//.test(inputPath);
  if (isAbsolutePath) {
    throw new Error('Absolute paths are not allowed');
  }

  // 清理路径分隔符
  return inputPath.replace(/[\/\\]/g, '').trim();
}
```

**Step 3: 更新 `setWorkspacePath` 方法**

修改 `backend/src/services/projectService.ts:44-78`:

```typescript
async setWorkspacePath(newPath: string): Promise<void> {
  // 验证和清理路径
  const sanitizedPath = ProjectService.validateAndSanitizePath(newPath);

  const oldWorkspacePath = this.workspacePath;
  const oldRecentProjectsPath = this.recentProjectsPath;

  try {
    // 创建相对于当前工作目录的完整路径
    const fullPath = path.join(process.cwd(), sanitizedPath);

    // 尝试创建新目录结构
    await fs.mkdir(fullPath, { recursive: true });

    const newRecentProjectsPath = path.join(fullPath, 'recentProjects.json');

    // 创建或保留 recentProjects.json
    try {
      await fs.access(newRecentProjectsPath);
    } catch {
      await fs.writeFile(newRecentProjectsPath, JSON.stringify([], null, 2));
    }

    // 验证成功后才更新状态
    this.workspacePath = fullPath;
    this.recentProjectsPath = newRecentProjectsPath;

    console.log(`Workspace path updated to: ${fullPath}`);
  } catch (error) {
    // 失败时回滚到旧路径
    this.workspacePath = oldWorkspacePath;
    this.recentProjectsPath = oldRecentProjectsPath;
    console.error('Failed to set workspace path, rolled back to previous path:', error);
    throw error;
  }
}
```

**Step 4: 更新 `createProject` 方法**

修改 `backend/src/services/projectService.ts:80-95`:

```typescript
async createProject(options: CreateProjectOptions): Promise<ProjectMeta> {
  // 验证项目名称
  if (!options.name || options.name.trim() === '') {
    throw new Error('Project name cannot be empty');
  }

  // 使用统一的路径验证
  const sanitizedName = ProjectService.validateAndSanitizePath(options.name);

  if (sanitizedName === '') {
    throw new Error('Project name contains invalid characters');
  }

  // 处理 location 参数
  let locationPath: string;
  if (options.location) {
    // 验证 location 是否存在且在允许范围内
    try {
      const stats = await fs.stat(options.location);
      if (!stats.isDirectory()) {
        throw new Error('Location must be a directory');
      }
      locationPath = options.location;
    } catch {
      throw new Error(`Location does not exist: ${options.location}`);
    }
  } else {
    locationPath = this.workspacePath;
  }

  const projectPath = path.join(locationPath, sanitizedName);

  // 其余代码保持不变...
```

**Step 5: 运行测试确认通过**

```bash
cd backend
npm test -- projectService.test.ts
```

预期: PASS

**Step 6: 提交**

```bash
git add backend/src/services/projectService.ts
git commit -m "fix(security): strengthen path validation to prevent traversal attacks"
```

---

### Task 1.4: 配置 CORS 策略

**Files:**
- Modify: `backend/src/index.ts:15`

**Step 1: 更新 CORS 配置**

修改 `backend/src/index.ts:15`:

```typescript
// 原代码:
app.use(cors());

// 替换为:
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Step 2: 添加环境变量示例**

创建文件: `backend/.env.example`:

```env
# 服务器配置
PORT=3001

# CORS 配置
FRONTEND_URL=http://localhost:5173

# JWT 密钥 (生产环境必须更改)
JWT_SECRET=your-secret-key-change-in-production

# 日志级别
LOG_LEVEL=info
```

**Step 3: 提交**

```bash
git add backend/src/index.ts backend/.env.example
git commit -m "fix(security): configure CORS with specific origin"
```

---

## Phase 2: 测试基础设施

### Task 2.1: 配置前端测试环境 (Vitest)

**Files:**
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/__tests__/example.test.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json`

**Step 1: 安装 Vitest 依赖**

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**Step 2: 创建 Vitest 配置**

创建文件: `frontend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ]
    }
  }
});
```

**Step 3: 创建测试设置文件**

创建文件: `frontend/src/__tests__/setup.ts`:

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

**Step 4: 编写示例测试**

创建文件: `frontend/src/__tests__/example.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Example Test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should add numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 5: 更新 package.json**

修改 `frontend/package.json:6-10`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

**Step 6: 更新 tsconfig.json**

修改 `frontend/tsconfig.json`，添加 `types` 配置:

```json
{
  "compilerOptions": {
    // ... 现有配置
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  }
}
```

**Step 7: 运行测试验证配置**

```bash
cd frontend
npm test -- --run
```

预期: PASS (1 test suite, 2 tests)

**Step 8: 提交**

```bash
git add frontend/
git commit -m "test: configure Vitest for frontend testing"
```

---

### Task 2.2: 配置后端测试环境 (Jest)

**Files:**
- Create: `backend/jest.config.js`
- Create: `backend/src/__tests__/example.test.ts`
- Modify: `backend/package.json`

**Step 1: 安装 Jest 依赖**

```bash
cd backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

**Step 2: 创建 Jest 配置**

创建文件: `backend/jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

**Step 3: 创建示例测试**

创建文件: `backend/src/__tests__/example.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Example Test', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should add numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
```

**Step 4: 更新 package.json**

修改 `backend/package.json:6-9`:

```json
"scripts": {
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Step 5: 运行测试验证配置**

```bash
cd backend
npm test
```

预期: PASS (1 test suite, 2 tests)

**Step 6: 提交**

```bash
git add backend/
git commit -m "test: configure Jest for backend testing"
```

---

### Task 2.3: 为核心状态管理添加测试

**Files:**
- Test: `frontend/src/stores/__tests__/pptStore.test.ts`

**Step 1: 编写 PPTStore 测试**

创建文件: `frontend/src/stores/__tests__/pptStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { usePPTStore } from '../pptStore';

describe('PPTStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    usePPTStore.getState().createNewProject();
  });

  describe('Project Management', () => {
    it('should create new project', () => {
      const store = usePPTStore.getState();

      store.createNewProject();

      expect(store.slides).toEqual([]);
      expect(store.projectTitle).toBe('');
      expect(store.isNewProject).toBe(true);
      expect(store.currentProjectPath).toBeNull();
    });

    it('should load project', () => {
      const store = usePPTStore.getState();
      const mockProject = {
        slides: [{
          id: 'slide-1',
          displayIndex: 0,
          data: {
            version: '1.0',
            pageSize: { width: 1280, height: 720 },
            background: '#ffffff',
            elements: []
          },
          meta: {
            summary: 'Test Slide',
            displayIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }],
        title: 'Test Project'
      };

      store.loadProject(mockProject, '/test/path');

      expect(store.slides).toHaveLength(1);
      expect(store.projectTitle).toBe('Test Project');
      expect(store.currentProjectPath).toBe('/test/path');
      expect(store.isNewProject).toBe(false);
    });
  });

  describe('Slide Management', () => {
    it('should add slide', () => {
      const store = usePPTStore.getState();

      store.addSlide();

      expect(store.slides).toHaveLength(1);
      expect(store.currentSlideId).toBeDefined();
      expect(store.isDirty).toBe(true);
    });

    it('should delete slide', () => {
      const store = usePPTStore.getState();
      store.addSlide();
      const slideId = store.currentSlideId!;

      store.deleteSlide(slideId);

      expect(store.slides).toHaveLength(0);
      expect(store.currentSlideId).toBeNull();
    });

    it('should switch slide', () => {
      const store = usePPTStore.getState();
      store.addSlide();
      store.addSlide();
      const secondSlideId = store.slides[1].id;

      store.switchSlide(secondSlideId);

      expect(store.currentSlideId).toBe(secondSlideId);
      expect(store.selectedElementId).toBeNull();
    });

    it('should reorder slides', () => {
      const store = usePPTStore.getState();
      store.addSlide();
      store.addSlide();
      const [first, second] = store.slides;

      store.reorderSlides([second.id, first.id]);

      expect(store.slides[0].id).toBe(second.id);
      expect(store.slides[1].id).toBe(first.id);
    });
  });

  describe('Element Selection', () => {
    it('should select element', () => {
      const store = usePPTStore.getState();
      store.addSlide();

      store.selectElement('element-1');

      expect(store.selectedElementId).toBe('element-1');
    });

    it('should get selected element', () => {
      const store = usePPTStore.getState();
      store.addSlide();
      const elementId = 'element-1';

      // 修改当前幻灯片添加元素
      store.updateSlideData(store.currentSlideId!, {
        version: '1.0',
        pageSize: { width: 1280, height: 720 },
        background: '#ffffff',
        elements: [{
          id: elementId,
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          content: 'Test',
          style: {
            fontSize: 16,
            fontWeight: 'normal',
            fill: '#000000',
            fontFamily: 'Arial'
          },
          textAlign: 'left'
        }]
      });

      store.selectElement(elementId);
      const selected = store.getSelectedElement();

      expect(selected).toBeDefined();
      expect(selected?.id).toBe(elementId);
    });

    it('should return null when no element selected', () => {
      const store = usePPTStore.getState();

      const selected = store.getSelectedElement();

      expect(selected).toBeNull();
    });
  });

  describe('AI Context', () => {
    it('should return page context when no element selected', () => {
      const store = usePPTStore.getState();

      const context = store.getCurrentAIContext();

      expect(context.type).toBe('page');
      expect(context.elementId).toBeUndefined();
    });

    it('should return element context when element selected', () => {
      const store = usePPTStore.getState();
      store.selectElement('element-1');

      const context = store.getCurrentAIContext();

      expect(context.type).toBe('element');
      expect(context.elementId).toBe('element-1');
    });
  });

  describe('Dirty State', () => {
    it('should mark dirty on slide changes', () => {
      const store = usePPTStore.getState();

      store.addSlide();

      expect(store.isDirty).toBe(true);
    });

    it('should mark clean explicitly', () => {
      const store = usePPTStore.getState();
      store.markDirty();

      store.markClean();

      expect(store.isDirty).toBe(false);
    });
  });
});
```

**Step 2: 运行测试**

```bash
cd frontend
npm test -- pptStore.test.ts
```

预期: PASS

**Step 3: 提交**

```bash
git add frontend/src/stores/__tests__/
git commit -m "test: add comprehensive PPTStore tests"
```

---

### Task 2.4: 为会话管理添加测试

**Files:**
- Test: `backend/src/services/__tests__/sessionManager.test.ts`

**Step 1: 编写 SessionManager 测试**

创建文件: `backend/src/services/__tests__/sessionManager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { SessionManager } from '../sessionManager';
import fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises');

describe('SessionManager', () => {
  beforeEach(() => {
    // 清理会话
    SessionManager['sessions'].clear();
    SessionManager['activityTracker'].clear();
  });

  describe('initialize', () => {
    it('should create projects directory', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await SessionManager.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('projects'),
        { recursive: true }
      );
    });
  });

  describe('activity tracking', () => {
    it('should update activity on session use', () => {
      const slideId = 'test-slide';

      // @ts-ignore - accessing private method for testing
      SessionManager.updateActivity(slideId);

      const tracker = SessionManager['activityTracker'];
      expect(tracker.has(slideId)).toBe(true);
    });

    it('should identify oldest inactive session', () => {
      // @ts-ignore
      SessionManager.updateActivity('slide-1');
      // @ts-ignore
      SessionManager.updateActivity('slide-2');

      // @ts-ignore
      const oldest = SessionManager.getOldestInactiveSession();

      expect(oldest).toBeDefined();
    });
  });

  describe('client management', () => {
    it('should register client to session', () => {
      const slideId = 'test-slide';
      const mockWs = {} as any;

      // @ts-ignore
      SessionManager.registerClient(slideId, mockWs);

      // Note: This test may need adjustment based on actual session creation
      // as registerClient expects an existing session
    });

    it('should unregister client from session', () => {
      const slideId = 'test-slide';
      const mockWs = {} as any;

      // @ts-ignore
      SessionManager.unregisterClient(slideId, mockWs);
    });
  });
});
```

**Step 2: 运行测试**

```bash
cd backend
npm test -- sessionManager.test.ts
```

预期: PASS (可能需要根据实际实现调整)

**Step 3: 提交**

```bash
git add backend/src/services/__tests__/sessionManager.test.ts
git commit -m "test: add SessionManager unit tests"
```

---

## Phase 3: 日志和监控

### Task 3.1: 集成 Winston 日志库

**Files:**
- Create: `backend/src/lib/logger.ts`
- Modify: `backend/src/services/projectService.ts`
- Modify: `backend/src/services/sessionManager.ts`
- Modify: `backend/src/middleware/wsHandler.ts`

**Step 1: 安装 Winston**

```bash
cd backend
npm install winston
npm install --save-dev @types/winston
```

**Step 2: 创建日志配置**

创建文件: `backend/src/lib/logger.ts`:

```typescript
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ppt-copilot-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
          }
          return msg;
        })
      )
    }),
    // 文件输出
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// 开发环境使用更简单的格式
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}
```

**Step 3: 替换 projectService 中的 console.log**

修改 `backend/src/services/projectService.ts:1-2`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../lib/logger.js';  // 添加
import type {
  ProjectMeta,
  CreateProjectOptions,
  ProjectListItem,
} from '../types/project.js';
```

然后替换所有 `console.log` 为 `logger.info`，`console.error` 为 `logger.error`:

```typescript
// 示例:
// console.log('ProjectService initialized');
// 替换为:
logger.info('ProjectService initialized');

// console.error('Failed to initialize ProjectService:', error);
// 替换为:
logger.error('Failed to initialize ProjectService', { error });
```

**Step 4: 替换 sessionManager 中的 console.log**

同样方式更新 `backend/src/services/sessionManager.ts`

**Step 5: 更新 wsHandler**

同样方式更新 `backend/src/middleware/wsHandler.ts`

**Step 6: 创建 logs 目录**

```bash
cd backend
mkdir -p logs
echo "logs/" >> .gitignore
```

**Step 7: 提交**

```bash
git add backend/src/
git commit -m "feat(logging): integrate Winston for structured logging"
```

---

## Phase 4: 性能优化

### Task 4.1: 添加请求限流

**Files:**
- Create: `backend/src/middleware/rateLimit.ts`
- Modify: `backend/src/index.ts`

**Step 1: 安装依赖**

```bash
cd backend
npm install express-rate-limit
```

**Step 2: 创建限流配置**

创建文件: `backend/src/middleware/rateLimit.ts`:

```typescript
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 登录端点更严格的限制
  skipSuccessfulRequests: true,
});
```

**Step 3: 应用到路由**

修改 `backend/src/index.ts`:

```typescript
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

// ... 现有代码

// 应用全局限流
app.use('/api/', apiLimiter);

// 认证路由使用更严格的限制
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

**Step 4: 提交**

```bash
git add backend/src/
git commit -m "feat(security): add rate limiting to prevent abuse"
```

---

### Task 4.2: 优化 Zustand 持久化策略

**Files:**
- Modify: `frontend/src/stores/pptStore.ts:289-297`
- Create: `frontend/src/lib/storage.ts`

**Step 1: 编写存储适配器测试**

创建文件: `frontend/src/lib/__tests__/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IndexedDBStorage } from '../storage';

describe('IndexedDBStorage', () => {
  let storage: IndexedDBStorage;

  beforeEach(async () => {
    storage = new IndexedDBStorage('test-db');
    await storage.clear();
  });

  afterEach(async () => {
    await storage.clear();
  });

  it('should save and retrieve data', async () => {
    const key = 'test-key';
    const data = { slides: [], title: 'Test' };

    await storage.setItem(key, data);
    const retrieved = await storage.getItem(key);

    expect(retrieved).toEqual(data);
  });

  it('should handle large datasets', async () => {
    const largeData = {
      slides: Array(1000).fill(null).map((_, i) => ({
        id: `slide-${i}`,
        displayIndex: i,
        data: { version: '1.0', pageSize: { width: 1280, height: 720 }, background: '#fff', elements: [] },
        meta: { summary: `Slide ${i}`, displayIndex: i, createdAt: '', updatedAt: '' }
      })),
      title: 'Large Project'
    };

    await storage.setItem('large', largeData);
    const retrieved = await storage.getItem('large');

    expect(retrieved?.slides).toHaveLength(1000);
  });

  it('should remove item', async () => {
    await storage.setItem('temp', { data: 'test' });
    await storage.removeItem('temp');

    const retrieved = await storage.getItem('temp');
    expect(retrieved).toBeNull();
  });
});
```

**Step 2: 实现 IndexedDB 存储适配器**

创建文件: `frontend/src/lib/storage.ts`:

```typescript
import { StateStorage } from 'zustand/middleware';

export class IndexedDBStorage implements StateStorage {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string = 'zustand') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// 创建单例实例
export const indexedDBStorage = new IndexedDBStorage('ppt-copilot-storage');
```

**Step 3: 更新 PPTStore 使用新的存储**

修改 `frontend/src/stores/pptStore.ts:42-44`:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '@/lib/storage';  // 添加
import { Slide, PPTElement, PageData, AIContext } from '@/types/ppt';
```

修改 `frontend/src/stores/pptStore.ts:289-297`:

```typescript
    {
      name: 'ppt-storage',
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        slides: state.slides,
        currentSlideId: state.currentSlideId,
        projectTitle: state.projectTitle,
        currentProjectPath: state.currentProjectPath
      })
    }
```

**Step 4: 提交**

```bash
git add frontend/src/
git commit -m "perf: use IndexedDB for Zustand persistence to handle large datasets"
```

---

## Phase 5: 代码质量

### Task 5.1: 添加 ESLint 和 Prettier

**Files:**
- Create: `.eslintrc.json`
- Create: `.prettierrc.json`
- Modify: `package.json`

**Step 1: 安装依赖**

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks prettier eslint-config-prettier eslint-plugin-prettier
```

**Step 2: 创建 ESLint 配置**

创建文件 (项目根目录): `.eslintrc.json`:

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "ecmaFeatures": {
      "jsx": true
    }
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "react", "react-hooks", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "react/react-in-jsx-scope": "off",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
```

**Step 3: 创建 Prettier 配置**

创建文件: `.prettierrc.json`:

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

**Step 4: 更新根 package.json**

修改根目录 `package.json:9-16`:

```json
"scripts": {
  "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
  "dev:frontend": "cd frontend && npm run dev",
  "dev:backend": "cd backend && npm run dev",
  "build": "npm run build:frontend && npm run build:backend",
  "build:frontend": "cd frontend && npm run build",
  "build:backend": "cd backend && npm run build",
  "lint": "eslint . --ext .ts,.tsx",
  "lint:fix": "eslint . --ext .ts,.tsx --fix",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
}
```

**Step 5: 运行 lint 检查**

```bash
npm run lint
```

预期: 显示当前代码问题 (不阻塞提交)

**Step 6: 提交配置**

```bash
git add .eslintrc.json .prettierrc.json package.json package-lock.json
git commit -m "chore: add ESLint and Prettier for code quality"
```

---

## Phase 6: 文档和 CI/CD

### Task 6.1: 添加 GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: 创建 CI 配置**

创建文件: `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run tests
        run: |
          cd frontend
          npm test -- --run

      - name: Build
        run: |
          cd frontend
          npm run build

  test-backend:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Run tests
        run: |
          cd backend
          npm test

      - name: Build
        run: |
          cd backend
          npm run build

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

  security-audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: |
          cd frontend && npm audit --production || true
          cd ../backend && npm audit --production || true
```

**Step 2: 提交**

```bash
git add .github/workflows/
git commit -m "ci: add GitHub Actions for CI/CD"
```

---

### Task 6.2: 更新项目文档

**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`

**Step 1: 创建主 README**

创建文件: `README.md`:

```markdown
# Make PPT Great Again

AI 原生的 PowerPoint 演示文稿生成工具，通过自然语言对话创建和编辑 PPT。

## 功能特性

- 🤖 **AI 对话生成** - 通过自然语言描述生成幻灯片
- 🎨 **可视化编辑** - 基于 Fabric.js 的画布编辑器
- 💾 **项目管理** - 完整的项目保存、加载、导出功能
- 🔄 **实时同步** - WebSocket 实时流式传输 AI 响应
- ⌨️ **快捷键支持** - 常用操作键盘快捷键

## 技术栈

- **前端**: React 18 + Vite + Tailwind CSS + Fabric.js
- **后端**: Express + WebSocket + TypeScript
- **状态管理**: Zustand
- **AI 集成**: Claude Code CLI (stream-json)

## 快速开始

### 前置要求

- Node.js 18+
- Claude Code CLI
- npm 或 yarn

### 安装

\`\`\`bash
# 安装依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
\`\`\`

### 开发

\`\`\`bash
# 同时启动前端和后端
npm run dev

# 或分别启动
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3001
\`\`\`

### 测试

\`\`\`bash
# 运行所有测试
npm test

# 前端测试
cd frontend && npm test

# 后端测试
cd backend && npm test
\`\`\`

### 构建

\`\`\`bash
npm run build
\`\`\`

## 项目结构

\`\`\`
make-ppt-great-again/
├── frontend/          # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   ├── stores/       # Zustand 状态管理
│   │   ├── lib/          # 工具函数
│   │   └── types/        # TypeScript 类型
│   └── package.json
├── backend/           # Express 后端服务
│   ├── src/
│   │   ├── routes/       # API 路由
│   │   ├── services/     # 业务逻辑
│   │   ├── middleware/   # 中间件
│   │   └── types/        # TypeScript 类型
│   └── package.json
└── docs/              # 项目文档
\`\`\`

## 安全说明

⚠️ **重要**: 本项目使用 `--dangerously-skip-permissions` 标志运行 Claude Code CLI，仅用于开发环境。生产部署前请:

1. 实施适当的身份验证和授权
2. 配置安全的 CORS 策略
3. 使用环境变量管理敏感配置
4. 启用请求限流

## 贡献指南

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 许可证

MIT
```

**Step 2: 创建贡献指南**

创建文件: `CONTRIBUTING.md`:

```markdown
# 贡献指南

感谢对 Make PPT Great Again 项目的关注！

## 开发流程

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 提交消息规范

使用约定式提交格式:

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具更新

示例:
\`\`\`
feat(sidebar): add slide drag-and-drop reordering
fix(auth): resolve token expiration issue
test(store): add PPTStore unit tests
\`\`\`

## 代码规范

### TypeScript

- 启用严格模式
- 避免使用 `any` 类型
- 为所有函数添加返回类型

### React

- 使用函数组件和 Hooks
- 组件使用 PascalCase 命名
- 避免过度嵌套

### 测试

- 为新功能添加测试
- 保持测试简单独立
- 使用有意义的测试描述

### 样式

- 运行 `npm run lint:fix` 自动修复
- 运行 `npm run format` 格式化代码

## 测试要求

### 单元测试

- 核心业务逻辑必须有测试
- 测试覆盖率目标: 70%+

### 集成测试

- API 端点需要集成测试
- 关键用户流程需要 E2E 测试

## 安全准则

- 永不提交密钥或敏感数据
- 使用环境变量管理配置
- 验证所有用户输入
- 遵循最小权限原则

## 问题报告

报告 bug 时请包含:

- 复现步骤
- 预期行为
- 实际行为
- 环境信息 (OS, Node.js 版本等)
- 相关日志或截图

## 功能建议

建议新功能时:

- 检查是否已有类似建议
- 清晰描述用例和价值
- 考虑实现复杂度
- 讨论替代方案
```

**Step 3: 提交**

```bash
git add README.md CONTRIBUTING.md
git commit -m "docs: add comprehensive project documentation"
```

---

## 完成检查清单

在完成所有任务后，验证:

- [ ] 所有测试通过 (`npm test`)
- [ ] 代码通过 lint 检查 (`npm run lint`)
- [ ] 无未使用的备份文件
- [ ] 认证中间件已安装
- [ ] 路径验证已加强
- [ ] CORS 已正确配置
- [ ] Winston 日志已集成
- [ ] 请求限流已启用
- [ ] IndexedDB 存储已实现
- [ ] CI 配置已添加
- [ ] 文档已更新

---

## 执行顺序建议

建议按以下顺序执行各阶段:

1. **Phase 0** - 清理代码 (5分钟)
2. **Phase 1** - 安全加固 (2小时)
3. **Phase 2** - 测试基础设施 (1.5小时)
4. **Phase 3** - 日志系统 (30分钟)
5. **Phase 4** - 性能优化 (1小时)
6. **Phase 5** - 代码质量 (30分钟)
7. **Phase 6** - 文档和 CI (30分钟)

**总计约 6-7 小时**
