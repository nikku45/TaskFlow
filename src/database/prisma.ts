import { PrismaClient } from '@prisma/client';

/**
 * Single exported PrismaClient instance.
 * Shared across all modules to leverage connection pooling.
 */
export const prisma = new PrismaClient();
