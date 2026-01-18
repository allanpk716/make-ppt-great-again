import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import projectRouter from './routes/project.js';
import slidesRouter from './routes/slides.js';
import { SessionManager } from './services/sessionManager.js';
import { setupWebSocket } from './middleware/wsHandler.js';

const app = express();
const server = createServer(app);

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/project', projectRouter);
app.use('/api', slidesRouter);

// WebSocket
setupWebSocket(server);

// 初始化
SessionManager.initialize().then(() => {
  console.log('Session Manager initialized');
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  SessionManager.closeAllSessions();
  server.close();
});
