import { env } from './config/env';
import { logger } from './config/logger';
import { app } from './app';

const server = app.listen(env.PORT, () => {
  logger.info(`TaskFlow API listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
