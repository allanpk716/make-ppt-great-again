import express, { Request, Response, NextFunction } from 'express';
import { generateAuthToken } from '../middleware/auth.js';
import { UserService } from '../services/userService.js';

const router = express.Router();

// 错误处理中间件类型
interface AsyncHandler {
  (req: Request, res: Response, next: NextFunction): Promise<void>;
}

// 异步路由处理器包装器
const asyncHandler = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 登录
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const isValid = await UserService.validateUser(username, password);

  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = generateAuthToken({ userId: username });
  res.json({ token, username });
}));

// 注册
router.post('/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    await UserService.createUser(username, password);
    const token = generateAuthToken({ userId: username });

    res.status(201).json({ token, username });
  } catch (error) {
    if ((error as Error).message === 'User already exists') {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    throw error;
  }
}));

export default router;
