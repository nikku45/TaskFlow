import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/prisma';
import { ForbiddenError, UnauthorizedError } from '../common/errors';

/**
 * Organization Context Middleware.
 * Reads the caller's org_members row live from the DB after authentication.
 * Sets req.auth.orgId and req.auth.role.
 * THIS IS THE ONLY PLACE orgId IS EVER SET ON THE REQUEST.
 * Client-supplied org_id is NEVER trusted per ARCHITECTURE.md §14.
 */
export async function attachOrgContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.auth || !req.auth.userId) {
    throw new UnauthorizedError('Authentication required before organization context resolution');
  }

  // Look up user's active org membership live from PostgreSQL
  const membership = await prisma.orgMember.findFirst({
    where: { userId: req.auth.userId },
  });

  if (!membership) {
    throw new ForbiddenError('User does not belong to any organization');
  }

  req.auth.orgId = membership.orgId;
  req.auth.role = membership.role as 'org_admin' | 'member';

  next();
}
