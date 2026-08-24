import { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/**
 * Shared Redis connection options for BullMQ queue producers and workers.
 * Parses REDIS_URL or uses host/port defaults.
 */
function parseRedisOptions(): ConnectionOptions {
  if (env.REDIS_URL) {
    try {
      const parsed = new URL(env.REDIS_URL);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    } catch {
      // Fallback
    }
  }

  return {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,
  };
}

export const redisConnectionOptions: ConnectionOptions = parseRedisOptions();
