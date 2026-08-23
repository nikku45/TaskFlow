import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../common/errors';

export interface AuthContext {
  userId: string;
  orgId?: string;
  role?: 'org_admin' | 'member';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Middleware verifying JWT access token from Authorization header.
 * Populates req.auth with { userId }.
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
    if (!payload || !payload.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    req.auth = {
      userId: payload.sub,
    };

    next();
  } catch (err: any) {
    if (err instanceof UnauthorizedError) {
      throw err;
    }
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Access token has expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
