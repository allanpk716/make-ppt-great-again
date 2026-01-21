import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import projectRouter from './routes/project.js';
import projectsRouter from './routes/projects.js';
import slidesRouter from './routes/slides.js';
import authRouter from './routes/auth.js';
import { SessionManager } from './services/sessionManager.js';
import { setupWebSocket } from './middleware/wsHandler.js';
import { projectService } from './services/projectService.js';
import { authenticateToken } from './middleware/auth.js';
const app = express();
const server = createServer(app);
// 中间件
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
// 公开路由 (无需认证)
app.use('/api/auth', authRouter);
// 受保护路由 (需要认证)
app.use('/api/project', authenticateToken, projectRouter);
app.use('/api/projects', authenticateToken, projectsRouter);
app.use('/api', authenticateToken, slidesRouter);
// WebSocket
setupWebSocket(server);
const PORT = process.env.PORT || 3001;
// 初始化并启动服务器
(async () => {
    try {
        // 等待 ProjectService 初始化完成
        await projectService.initialize();
        console.log('ProjectService initialized');
        // 等待 SessionManager 初始化完成
        await SessionManager.initialize();
        console.log('Session Manager initialized');
        // 所有初始化完成后启动服务器
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to initialize server:', error);
        process.exit(1);
    }
})();
// 优雅关闭
process.on('SIGTERM', () => {
    SessionManager.closeAllSessions();
    server.close();
});
