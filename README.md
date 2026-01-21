# Make PPT Great Again

AI 原生的 PowerPoint 演示文稿生成工具，通过自然语言对话创建和编辑 PPT。

## 功能特性

- **AI 对话生成** - 通过自然语言描述生成幻灯片
- **可视化编辑** - 基于 Fabric.js 的画布编辑器
- **项目管理** - 完整的项目保存、加载、导出功能
- **实时同步** - WebSocket 实时流式传输 AI 响应
- **快捷键支持** - 常用操作键盘快捷键
- **会话管理** - 多会话并发处理和会话恢复
- **安全认证** - JWT 身份验证和请求限流
- **结构化日志** - Winston 日志系统

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Fabric.js (画布编辑)
- Zustand (状态管理)
- assistant-ui (聊天界面)

### 后端
- Express + TypeScript
- WebSocket (实时通信)
- Winston (日志)
- JWT + bcrypt (认证)
- express-rate-limit (限流)

### 测试
- Vitest (前端测试)
- Jest (后端测试)
- React Testing Library

### 代码质量
- ESLint + Prettier
- GitHub Actions CI/CD
- 测试覆盖率目标: 70%+

## 快速开始

### 前置要求

- Node.js 18+
- Claude Code CLI
- npm 或 yarn

### 安装

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd frontend && npm install

# 安装后端依赖
cd ../backend && npm install
```

### 开发

```bash
# 同时启动前端和后端 (推荐)
npm run dev

# 或分别启动
npm run dev:frontend  # http://localhost:5173
npm run dev:backend   # http://localhost:3001
```

### 测试

```bash
# 运行所有测试
npm test

# 前端测试
cd frontend && npm test

# 前端测试 UI
cd frontend && npm run test:ui

# 前端测试覆盖率
cd frontend && npm run test:coverage

# 后端测试
cd backend && npm test

# 后端测试监听模式
cd backend && npm run test:watch

# 后端测试覆盖率
cd backend && npm run test:coverage
```

### 构建

```bash
# 构建前端和后端
npm run build

# 单独构建
npm run build:frontend
npm run build:backend
```

### 代码质量

```bash
# 运行 ESLint 检查
npm run lint

# 自动修复 ESLint 问题
npm run lint:fix

# 使用 Prettier 格式化代码
npm run format
```

## 项目结构

```
make-ppt-great-again/
├── frontend/                  # React 前端应用
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── assistant-ui/  # assistant-ui 集成组件
│   │   │   ├── ui/           # 基础 UI 组件
│   │   │   └── ...
│   │   ├── stores/           # Zustand 状态管理
│   │   │   └── pptStore.ts   # PPT 核心状态
│   │   ├── lib/              # 工具函数和存储适配器
│   │   │   └── storage.ts    # IndexedDB 存储
│   │   ├── types/            # TypeScript 类型定义
│   │   └── __tests__/        # 前端测试
│   ├── vitest.config.ts      # Vitest 配置
│   └── package.json
├── backend/                   # Express 后端服务
│   ├── src/
│   │   ├── routes/           # API 路由
│   │   ├── services/         # 业务逻辑
│   │   │   ├── projectService.ts    # 项目管理
│   │   │   ├── sessionManager.ts    # 会话管理
│   │   │   └── tokenManager.ts      # JWT 令牌
│   │   ├── middleware/       # 中间件
│   │   │   ├── auth.ts       # 认证中间件
│   │   │   ├── wsHandler.ts  # WebSocket 处理
│   │   │   └── rateLimit.ts  # 限流中间件
│   │   ├── lib/              # 工具库
│   │   │   └── logger.ts     # Winston 日志
│   │   ├── types/            # TypeScript 类型
│   │   └── __tests__/        # 后端测试
│   ├── jest.config.js        # Jest 配置
│   └── package.json
├── docs/                      # 项目文档
│   ├── plans/                # 项目计划
│   ├── assistant-ui-integration.md
│   └── ...
├── .github/workflows/         # GitHub Actions
│   └── ci.yml                # CI 配置
├── .prettierrc.json          # Prettier 配置
└── package.json              # 根 package.json
```

## 环境变量

### 后端环境变量

创建 `backend/.env` 文件：

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

参见 `backend/.env.example` 获取完整示例。

## 安全说明

⚠️ **重要**: 本项目使用 `--dangerously-skip-permissions` 标志运行 Claude Code CLI，仅用于开发环境。

生产部署前请确保：

1. **身份验证和授权**
   - 启用 JWT 认证中间件
   - 实施用户角色和权限管理
   - 定期轮换密钥

2. **CORS 策略**
   - 配置正确的白名单域名
   - 限制允许的 HTTP 方法和请求头

3. **环境变量**
   - 使用 `.env` 文件管理敏感配置
   - 永不提交 `.env` 文件到版本控制
   - 使用强密码和随机密钥

4. **请求限流**
   - API 端点已配置限流 (100 请求/15 分钟)
   - 认证端点使用更严格限制 (5 请求/15 分钟)

5. **输入验证**
   - 所有用户输入已验证
   - 路径遍历攻击防护已启用
   - 无 SQL 注入风险 (使用 JSON 文件存储)

## CI/CD

项目使用 GitHub Actions 进行持续集成：

- **前端测试**: Vitest 单元测试 + 构建
- **后端测试**: Jest 单元测试 + 构建
- **代码质量**: ESLint 静态分析
- **安全审计**: npm audit 依赖检查

所有 Pull Request 都会自动运行这些检查。

## 故障排除

### 常见问题

1. **端口已被占用**
   - 修改 `backend/.env` 中的 `PORT`
   - 或终止占用进程: `npx kill-port 3001`

2. **WebSocket 连接失败**
   - 检查后端是否运行
   - 验证 CORS 配置
   - 查看浏览器控制台错误

3. **测试失败**
   - 确保所有依赖已安装: `npm install`
   - 清理缓存: `rm -rf node_modules package-lock.json && npm install`

## 开发指南

详细的开发指南请参阅:

- [CONTRIBUTING.md](./CONTRIBUTING.md) - 贡献指南和代码规范
- [docs/assistant-ui-integration.md](./docs/assistant-ui-integration.md) - assistant-ui 集成文档
- [CLAUDE.md](./CLAUDE.md) - Claude Code 协作规则

## 许可证

MIT

## 致谢

- [assistant-ui](https://github.com/assistant-ui/assistant-ui) - React 聊天界面组件库
- [Fabric.js](http://fabricjs.com/) - 强大的 HTML5 canvas 库
- [Zustand](https://zustand-demo.pmnd.rs/) - 轻量级状态管理
