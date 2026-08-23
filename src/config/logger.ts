import pino from 'pino';
import { env } from './env';

/**
 * Pino logger instance.
 * Log level driven by env.LOG_LEVEL (validated at startup).
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino/file',
          options: { destination: 1 }, // stdout
        }
      : undefined,
  // Redact sensitive fields from logs
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'refreshToken', 'accessToken'],
    censor: '[REDACTED]',
  },
});
