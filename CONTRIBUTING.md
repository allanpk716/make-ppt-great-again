# 贡献指南

感谢对 Make PPT Great Again 项目的关注！我们欢迎各种形式的贡献。

## 目录

- [开发流程](#开发流程)
- [提交消息规范](#提交消息规范)
- [代码规范](#代码规范)
- [测试要求](#测试要求)
- [安全准则](#安全准则)
- [问题报告](#问题报告)
- [功能建议](#功能建议)

## 开发流程

### 1. Fork 和克隆

```bash
# Fork 本仓库到你的 GitHub 账号
# 然后克隆你的 fork
git clone https://github.com/YOUR_USERNAME/make-ppt-great-again.git
cd make-ppt-great-again

# 添加上游远程仓库
git remote add upstream https://github.com/allanpk716/make-ppt-great-again.git
```

### 2. 创建功能分支

```bash
# 从 main 分支创建新分支
git checkout main
git pull upstream main
git checkout -b feature/amazing-feature
```

### 3. 开发和测试

```bash
# 安装依赖
npm install
cd frontend && npm install
cd ../backend && npm install

# 运行开发服务器
npm run dev

# 运行测试
npm test

# 运行 lint
npm run lint
```

### 4. 提交更改

使用符合规范的提交消息 (参见 [提交消息规范](#提交消息规范))：

```bash
git add .
git commit -m "feat(sidebar): add slide drag-and-drop reordering"
```

### 5. 推送和创建 Pull Request

```bash
# 推送到你的 fork
git push origin feature/amazing-feature

# 在 GitHub 上创建 Pull Request
```

## 提交消息规范

我们使用约定式提交 (Conventional Commits) 格式：

### 格式

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### 类型 (type)

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整 (不影响代码功能)
- `refactor`: 重构 (既不是新功能也不是修复)
- `test`: 测试相关
- `chore`: 构建/工具更新
- `perf`: 性能优化
- `ci`: CI/CD 相关

### 范围 (scope)

常用范围：
- `frontend`: 前端相关
- `backend`: 后端相关
- `auth`: 认证相关
- `ui`: UI 组件
- `store`: 状态管理
- `api`: API 端点
- `test`: 测试
- `docs`: 文档

### 示例

```bash
# 新功能
git commit -m "feat(sidebar): add slide drag-and-drop reordering"

# Bug 修复
git commit -m "fix(auth): resolve token expiration issue"

# 文档更新
git commit -m "docs(readme): update installation instructions"

# 重构
git commit -m "refactor(store): simplify state management logic"

# 测试
git commit -m "test(store): add PPTStore unit tests"

# 性能优化
git commit -m "perf(storage): use IndexedDB for large datasets"
```

## 代码规范

### TypeScript

#### 基本规则

- 启用严格模式 (`strict: true`)
- 避免使用 `any` 类型，使用 `unknown` 代替
- 为所有函数添加返回类型
- 为组件 props 定义接口

#### 示例

```typescript
// ✅ 好
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled = false }: ButtonProps): JSX.Element {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
}

// ❌ 差
function Button(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

#### 类型导入

优先使用类型导入：

```typescript
// ✅ 好
import type { ButtonProps } from './Button';
import { SomeClass } from './SomeClass';

// ❌ 差
import { ButtonProps } from './Button';
```

### React

#### 组件规范

- 使用函数组件和 Hooks
- 组件使用 PascalCase 命名
- 自定义 Hook 使用 `use` 前缀
- 避免过度嵌套 (最多 3-4 层)

```typescript
// ✅ 好
function SlideList(): JSX.Element {
  const slides = usePPTStore((state) => state.slides);

  return (
    <div className="slide-list">
      {slides.map((slide) => (
        <SlideItem key={slide.id} slide={slide} />
      ))}
    </div>
  );
}

// ❌ 差 - 过度嵌套
function SlideList() {
  return (
    <div>
      <div>
        <div>
          <div>{/* 太多层 */}</div>
        </div>
      </div>
    </div>
  );
}
```

#### Hooks 使用

```typescript
// ✅ 好 - 自定义 Hook
function useSlideSelection(slideId: string) {
  const [selected, setSelected] = useState(false);

  // ... 逻辑

  return { selected, setSelected };
}

// ❌ 差 - 违反 Hooks 规则
if (condition) {
  const [state, setState] = useState(); // 不要在条件语句中使用 Hooks
}
```

### 样式规范

#### 命名

- 组件文件: PascalCase (如 `SlideList.tsx`)
- 工具函数: camelCase (如 `formatDate.ts`)
- 常量: UPPER_SNAKE_CASE (如 `MAX_SLIDES`)
- 类型/接口: PascalCase (如 `SlideData`)

#### 格式化

项目使用 Prettier 进行代码格式化，配置见 `.prettierrc.json`：

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

提交前运行：

```bash
npm run format
npm run lint:fix
```

#### ESLint 规则

项目使用 ESLint 进行代码检查。主要规则：

- `no-unused-vars`: 禁止未使用的变量
- `@typescript-eslint/no-explicit-any`: 警告使用 `any`
- `react/react-in-jsx-scope`: 关闭 (React 17+ 不需要)
- `prettier/prettier`: 使用 Prettier 格式

运行检查：

```bash
npm run lint
```

## 测试要求

### 单元测试

- **核心业务逻辑必须有测试**
- 测试覆盖率目标: 70%+
- 使用有意义的测试描述

#### 前端测试 (Vitest)

```typescript
// ✅ 好的测试
describe('PPTStore', () => {
  it('should add slide to store', () => {
    const store = usePPTStore.getState();
    store.addSlide();

    expect(store.slides).toHaveLength(1);
    expect(store.isDirty).toBe(true);
  });
});
```

#### 后端测试 (Jest)

```typescript
// ✅ 好的测试
describe('TokenManager', () => {
  it('should generate valid JWT token', () => {
    const token = tokenManager.generateToken({ userId: 'user-1' });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });
});
```

### 集成测试

- API 端点需要集成测试
- 使用 supertest 测试 HTTP 端点
- 测试成功和失败场景

```typescript
describe('POST /api/auth/login', () => {
  it('should return token for valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'password' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

### 运行测试

```bash
# 所有测试
npm test

# 前端测试
cd frontend && npm test

# 后端测试
cd backend && npm test

# 测试覆盖率
npm run test:coverage
```

## 安全准则

### 永不提交敏感信息

❌ **禁止提交**：
- 密钥和密码
- API 令牌
- 用户凭证
- `.env` 文件

✅ **使用环境变量**：
```typescript
// ✅ 好
const secret = process.env.JWT_SECRET;

// ❌ 差
const secret = 'my-secret-key';
```

### 输入验证

- 验证所有用户输入
- 防止路径遍历攻击
- 清理和转义输出

```typescript
// ✅ 好 - 验证路径
function sanitizePath(inputPath: string): string {
  if (inputPath.includes('..')) {
    throw new Error('Invalid path');
  }
  return inputPath;
}

// ❌ 差 - 直接使用用户输入
fs.readFile(userInput, (err, data) => {
  // 危险！
});
```

### 最小权限原则

- 只授予必要的权限
- 使用只读操作如果不需要写入
- 限制文件访问范围

### 依赖安全

定期审计依赖：

```bash
cd frontend && npm audit
cd backend && npm audit
```

## 问题报告

报告 bug 时请包含：

1. **问题描述**
   - 清晰简洁的标题
   - 详细的复现步骤

2. **预期行为**
   - 你期望发生什么

3. **实际行为**
   - 实际发生了什么
   - 错误消息或堆栈跟踪

4. **环境信息**
   - 操作系统版本
   - Node.js 版本 (`node -v`)
   - npm 版本 (`npm -v`)
   - 浏览器版本 (如适用)

5. **其他信息**
   - 相关日志
   - 截图
   - 复现代码

### 问题报告模板

```markdown
### 问题描述
简要描述问题

### 复现步骤
1. 步骤一
2. 步骤二
3. 步骤三

### 预期行为
描述你期望的行为

### 实际行为
描述实际发生的行为

### 环境信息
- OS: Windows 11
- Node.js: v18.17.0
- Browser: Chrome 120

### 附加信息
- 错误日志
- 截图
```

## 功能建议

### 建议新功能前

1. **检查是否有类似建议**
   - 搜索已有的 Issues
   - 查看项目 Roadmap

2. **清晰描述用例**
   - 这个功能解决什么问题
   - 为什么它很重要
   - 谁会受益

3. **考虑实现复杂度**
   - 技术可行性
   - 所需工作量
   - 对现有代码的影响

4. **讨论替代方案**
   - 有其他方式实现吗
   - 是否需要新的依赖
   - 是否符合项目目标

### 功能建议模板

```markdown
### 功能描述
简要描述建议的功能

### 用例和价值
- 这个功能解决什么问题
- 谁会使用它
- 为什么它很重要

### 实现建议
- 可能的实现方式
- 需要的依赖
- 对现有代码的影响

### 替代方案
是否有其他方式实现相同目标
```

## 代码审查

### 提交 PR 前

- [ ] 所有测试通过 (`npm test`)
- [ ] 代码通过 lint (`npm run lint`)
- [ ] 代码已格式化 (`npm run format`)
- [ ] 更新了相关文档
- [ ] 添加了必要的测试
- [ ] 提交消息符合规范

### 审查期间

- 保持开放心态
- 解释你的设计决策
- 愿意接受反馈
- 及时响应评论

## 行为准则

- 尊重所有贡献者
- 欢迎不同观点
- 使用包容性语言
- 专注于解决问题而非个人

## 获取帮助

如果你有任何问题：

1. 查看 [项目文档](./docs/)
2. 搜索 [已有 Issues](https://github.com/allanpk716/make-ppt-great-again/issues)
3. 创建新 Issue 或 Discussion
4. 查看 [CLAUDE.md](./CLAUDE.md) 了解开发环境配置

感谢你的贡献！
