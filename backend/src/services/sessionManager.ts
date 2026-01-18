import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { WebSocket } from 'ws';

interface CLISession {
  slideId: string;
  process: ChildProcess;
  projectPath: string;
  createdAt: Date;
  clients: Set<WebSocket>;
}

export class SessionManager {
  private static sessions = new Map<string, CLISession>();
  private static projectsBasePath = path.join(process.cwd(), 'projects');
  private static activityTracker = new Map<string, Date>();
  private static readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30分钟
  private static readonly MAX_CONCURRENT_SESSIONS = 5;

  /**
   * 初始化项目目录
   */
  static async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.projectsBasePath, { recursive: true });
      this.startCleanupTimer();
    } catch (error) {
      console.error('Failed to initialize projects directory:', error);
      throw error;
    }
  }

  /**
   * 获取或创建会话
   */
  static async getOrCreateSession(projectId: string, slideId: string): Promise<CLISession> {
    // 检查是否已存在
    const existing = this.sessions.get(slideId);
    if (existing && existing.process.exitCode === null) {
      this.updateActivity(slideId);
      return existing;
    }

    // 检查并发限制
    if (this.sessions.size >= this.MAX_CONCURRENT_SESSIONS) {
      // 清理最久未活动的会话
      const oldestSlide = this.getOldestInactiveSession();
      if (oldestSlide) {
        this.closeSession(oldestSlide);
      }
    }

    // 创建新会话
    const projectPath = path.join(this.projectsBasePath, projectId, 'slides', slideId);
    await fs.mkdir(projectPath, { recursive: true });

    // 启动 Claude Code CLI with stream-json
    const cliProcess = spawn('claude', [
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      '--project', projectPath
    ], {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const session: CLISession = {
      slideId,
      process: cliProcess,
      projectPath,
      createdAt: new Date(),
      clients: new Set()
    };

    this.sessions.set(slideId, session);
    this.updateActivity(slideId);
    this.setupStdoutHandler(session);
    this.setupProcessHandlers(session);

    return session;
  }

  /**
   * 设置 stdout 处理器（透传 stream-json）
   */
  private static setupStdoutHandler(session: CLISession): void {
    session.process.stdout.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          // 验证是否为有效 JSON
          const json = JSON.parse(line);
          // 透传到所有连接的客户端
          this.broadcastToSession(session.slideId, {
            type: 'stream',
            slideId: session.slideId,
            data: json
          });
        } catch {
          // 非JSON行作为原始文本转发
          this.broadcastToSession(session.slideId, {
            type: 'raw',
            slideId: session.slideId,
            text: line
          });
        }
      }
    });

    // 处理 stderr
    session.process.stderr.on('data', (chunk: Buffer) => {
      console.error(`CLI stderr [${session.slideId}]:`, chunk.toString());
    });
  }

  /**
   * 设置进程事件处理
   */
  private static setupProcessHandlers(session: CLISession): void {
    session.process.on('exit', (code) => {
      console.log(`CLI session ${session.slideId} exited with code ${code}`);
      this.broadcastToSession(session.slideId, {
        type: 'done',
        slideId: session.slideId
      });
      this.sessions.delete(session.slideId);
      this.activityTracker.delete(session.slideId);
    });

    session.process.on('error', (error) => {
      console.error(`CLI session ${session.slideId} error:`, error);
      this.broadcastToSession(session.slideId, {
        type: 'error',
        slideId: session.slideId,
        error: error.message
      });
    });
  }

  /**
   * 发送消息到 CLI
   */
  static async sendMessage(projectId: string, slideId: string, message: string): Promise<void> {
    try {
      const session = await this.getOrCreateSession(projectId, slideId);

      // 发送消息到 CLI stdin
      session.process.stdin.write(message + '\n');
      this.updateActivity(slideId);
    } catch (error) {
      console.error(`Failed to send message to ${slideId}:`, error);
      throw error;
    }
  }

  /**
   * 注册 WebSocket 客户端
   */
  static registerClient(slideId: string, ws: WebSocket): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.clients.add(ws);
    }
  }

  /**
   * 注销 WebSocket 客户端
   */
  static unregisterClient(slideId: string, ws: WebSocket): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.clients.delete(ws);
    }
  }

  /**
   * 广播消息到会话的所有客户端
   */
  private static broadcastToSession(slideId: string, message: any): void {
    const session = this.sessions.get(slideId);
    if (!session) return;

    const data = JSON.stringify(message);
    session.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  /**
   * 更新活跃时间
   */
  static updateActivity(slideId: string): void {
    this.activityTracker.set(slideId, new Date());
  }

  /**
   * 获取最久未活动的会话
   */
  private static getOldestInactiveSession(): string | null {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [slideId, lastActive] of this.activityTracker) {
      if (lastActive.getTime() < oldestTime) {
        oldest = slideId;
        oldestTime = lastActive.getTime();
      }
    }

    return oldest;
  }

  /**
   * 关闭会话
   */
  static closeSession(slideId: string): void {
    const session = this.sessions.get(slideId);
    if (session) {
      session.process.kill();
      session.clients.forEach(ws => ws.close());
      this.sessions.delete(slideId);
      this.activityTracker.delete(slideId);
    }
  }

  /**
   * 关闭所有会话
   */
  static closeAllSessions(): void {
    this.sessions.forEach((session, slideId) => {
      this.closeSession(slideId);
    });
  }

  /**
   * 启动清理定时器
   */
  private static startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [slideId, lastActive] of this.activityTracker) {
        if (now - lastActive.getTime() > this.INACTIVITY_TIMEOUT) {
          console.log(`Closing inactive session: ${slideId}`);
          this.closeSession(slideId);
        }
      }
    }, 60000); // 每分钟检查
  }

  /**
   * 获取项目基础路径
   */
  static get projectsBasePath(): string {
    return this.projectsBasePath;
  }
}
