import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler.middleware';
import { authenticateToken } from './middleware/auth.middleware';
import { attachOrgContext } from './middleware/orgContext.middleware';
import authRoutes from './modules/auth/auth.routes';
import projectsRoutes from './modules/projects/projects.routes';
import tasksRouter, { projectTasksRouter } from './modules/tasks/tasks.routes';
import jobsRoutes from './modules/jobs/jobs.routes';

/**
 * Builds and configures the Express application instance.
 */
export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use(`${env.API_BASE_PATH}/auth`, authRoutes);
  app.use(`${env.API_BASE_PATH}/projects`, projectsRoutes);
  app.use(`${env.API_BASE_PATH}/projects/:projectId/tasks`, projectTasksRouter);
  app.use(`${env.API_BASE_PATH}/tasks`, tasksRouter);
  app.use(`${env.API_BASE_PATH}/jobs`, jobsRoutes);

  // Diagnostic route (Phase 6 requirement for middleware verification)
  app.get(
    '/_debug/whoami',
    authenticateToken,
    attachOrgContext,
    (req: Request, res: Response) => {
      res.status(200).json({ auth: req.auth });
    }
  );

  // Centralized Error Handler (must be mounted last)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
