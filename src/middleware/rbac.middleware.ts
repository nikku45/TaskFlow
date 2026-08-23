import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../common/errors';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Enforces that req.auth.role matches one of the allowed roles for the organization.
 */
export function requireRole(...allowedRoles: Array<'org_admin' | 'member'>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !req.auth.role) {
      throw new ForbiddenError('Organization role context missing');
    }

    if (!allowedRoles.includes(req.auth.role)) {
      throw new ForbiddenError('Operation requires higher organization privileges');
    }

    next();
  };
}
