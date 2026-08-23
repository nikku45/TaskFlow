import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';
import { authController } from './auth.controller';

const router = Router();

// Apply auth endpoint rate limiting (10 req/min/IP per assignment)
router.use(authRateLimiter);

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', authenticateToken, asyncHandler(authController.logout));

export default router;
