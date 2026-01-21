import type { Request } from 'express';

export interface TokenPayload {
  userId: string;
  projectId?: string;
}

export interface AuthRequest extends Request {
  user?: TokenPayload;
}
