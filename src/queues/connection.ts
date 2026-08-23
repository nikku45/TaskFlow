import { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/**
 * Shared Redis connection options for BullMQ queue producers and workers.
 * Parses REDIS_URL or uses host/port defaults.
 */
export const redisConnectionOptions: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
};
