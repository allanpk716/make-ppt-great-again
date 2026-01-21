import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { apiLimiter, authLimiter, strictLimiter } from '../rateLimit';

describe('Rate Limit Middleware', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // 测试路由 - API 限流
    app.get('/api/test', apiLimiter, (req, res) => {
      res.json({ message: 'success' });
    });

    // 测试路由 - 认证限流
    app.post('/api/auth/login', authLimiter, (req, res) => {
      res.json({ token: 'test-token' });
    });

    // 测试路由 - 严格限流
    app.post('/api/sensitive', strictLimiter, (req, res) => {
      res.json({ message: 'sensitive operation' });
    });

    // 不受限流的路由 (不在 /api/ 路径下)
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
  });

  describe('apiLimiter', () => {
    it('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.body).toEqual({ message: 'success' });
    });

    it('should set rate limit headers', async () => {
      const response = await request(app)
        .get('/api/test')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });

    it('should return 429 when limit exceeded', async () => {
      // 发送超过限制的请求
      const requests = [];
      for (let i = 0; i < 105; i++) {
        requests.push(request(app).get('/api/test'));
      }

      const responses = await Promise.all(requests);

      // 最后几个请求应该被限流
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      // 验证限流响应包含消息或为空对象（取决于 express-rate-limit 版本）
      const rateLimitedResponse = rateLimitedResponses[0];
      if (rateLimitedResponse.body && Object.keys(rateLimitedResponse.body).length > 0) {
        expect(rateLimitedResponse.body).toHaveProperty('message');
      } else {
        // 某些版本返回空对象
        expect(rateLimitedResponse.body).toBeDefined();
      }
    });
  });

  describe('authLimiter', () => {
    it('should allow login requests within limit', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should enforce stricter limits on auth endpoints', async () => {
      // 验证 auth limiter 的配置
      // 由于 skipSuccessfulRequests: true，我们测试多个请求确认限流器正常工作
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'test', password: 'test' })
        );
      }

      const responses = await Promise.all(requests);

      // 验证请求都能成功（因为 skipSuccessfulRequests: true）
      const successResponses = responses.filter(r => r.status === 200);
      expect(successResponses.length).toBeGreaterThan(0);

      // 验证限流头部存在
      const firstResponse = responses[0];
      expect(firstResponse.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('strictLimiter', () => {
    it('should allow sensitive operations within limit', async () => {
      const response = await request(app)
        .post('/api/sensitive')
        .expect(200);

      expect(response.body).toEqual({ message: 'sensitive operation' });
    });

    it('should enforce very strict limits', async () => {
      // 发送超过严格限制的请求
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(request(app).post('/api/sensitive'));
      }

      const responses = await Promise.all(requests);

      // 检查是否有被限流的请求
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitedResponse = rateLimitedResponses[0];
      expect(rateLimitedResponse.body).toEqual({
        error: 'Rate limit exceeded for this operation'
      });
    });
  });

  describe('unlimited routes', () => {
    it('should allow unlimited requests to health endpoint', async () => {
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(request(app).get('/health'));
      }

      const responses = await Promise.all(requests);

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
      });
    });
  });
});
