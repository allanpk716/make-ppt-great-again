import jwt from 'jsonwebtoken';
import type { TokenPayload } from '../types/auth.js';

export class TokenManager {
  private secret: string;
  private defaultExpiration: string;

  constructor(secret: string, expirationHours: number = 24) {
    this.secret = secret;
    this.defaultExpiration = `${expirationHours}h`;
  }

  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.defaultExpiration,
    } as jwt.SignOptions);
  }

  verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload;
      return decoded;
    } catch (_error) {
      throw new Error('Invalid or expired token');
    }
  }
}
