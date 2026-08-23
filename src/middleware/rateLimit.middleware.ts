import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { RateLimitError } from '../common/errors';

/**
 * Rate limiting middleware for authentication endpoints.
 * Mandated limit: 10 requests per 1 minute per IP.
 * Returns standard { error, code, details } 429 response on breach.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS, // 60,000 ms (1 minute)
  limit: env.AUTH_RATE_LIMIT_MAX, // 10 requests per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new RateLimitError('Too many authentication attempts, please try again later'));
  },
});
