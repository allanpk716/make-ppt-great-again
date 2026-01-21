import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TokenManager } from '../tokenManager.js';
describe('TokenManager', () => {
    let tokenManager;
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
