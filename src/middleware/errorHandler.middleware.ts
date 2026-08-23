import { Request, Response, NextFunction } from 'express';
import { AppError } from '../common/errors';
import { logger } from '../config/logger';

/**
 * Centralized Express error-handling middleware.
 * Formats errors to the assignment-mandated shape: { error, code, details }.
 * Unhandled errors return a generic 500 without leaking stack traces or internal details.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  // Log unexpected internal errors server-side with stack trace
  logger.error({ err }, 'Unhandled internal server error');

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    details: {},
  });
}
