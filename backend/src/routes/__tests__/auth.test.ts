import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRouter from '../auth.js';
import { UserService } from '../../services/userService.js';

describe('Auth API', () => {
  let app: express.Application;

  beforeAll(async () => {
    // 确保测试用户存在
    try {
      await UserService.createUser('test-user', 'test-password');
    } catch {
      // 用户已存在，忽略错误
    }

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

    it('should require username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'test-user'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create new user and return token', async () => {
      const uniqueUsername = `new-user-${Date.now()}`;
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: uniqueUsername,
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.username).toBe(uniqueUsername);
    });

    it('should require password to be at least 6 characters', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'short-pass-user',
          password: '12345'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'test-user',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
    });
  });
});
