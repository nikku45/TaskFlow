/**
 * Custom error classes for TaskFlow.
 * Each maps to an HTTP status code and a machine-readable error code.
 * The centralized error handler (errorHandler.middleware.ts) converts
 * these into the assignment-mandated { error, code, details } shape.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — invalid input, failed Zod validation, etc. */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details: Record<string, unknown> = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/** 401 — missing/invalid/expired credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

/** 403 — authenticated but not permitted (includes cross-tenant) */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 — resource not found (within the caller's org scope) */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

/** 409 — conflict (e.g. duplicate email, duplicate assignment) */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/** 429 — rate limited */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}
