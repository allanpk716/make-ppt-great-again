import bcrypt from 'bcrypt';
import { logger } from '../lib/logger.js';

// 用户数据接口
interface UserData {
  username: string;
  passwordHash: string;
}

// 简单的内存用户存储 (生产环境应使用数据库)
const users = new Map<string, UserData>();

export class UserService {
  /**
   * 创建新用户
   * @param username 用户名
   * @param password 密码
   * @throws Error 如果用户已存在
   */
  static async createUser(username: string, password: string): Promise<void> {
    if (users.has(username)) {
      throw new Error('User already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    users.set(username, { username, passwordHash });
  }

  /**
   * 验证用户凭证
   * @param username 用户名
   * @param password 密码
   * @returns 如果凭证有效返回 true，否则返回 false
   */
  static async validateUser(username: string, password: string): Promise<boolean> {
    const user = users.get(username);
    if (!user) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }

  /**
   * 检查用户是否存在
   * @param username 用户名
   * @returns 如果用户存在返回 true，否则返回 false
   */
  static userExists(username: string): boolean {
    return users.has(username);
  }

  /**
   * 清空所有用户（主要用于测试）
   */
  static clearAllUsers(): void {
    users.clear();
  }
}

// 初始化默认测试用户
UserService.createUser('test-user', 'test-password').catch((error) =>
  logger.error('Failed to create default test user', { error })
);
