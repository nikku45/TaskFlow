import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { authenticateToken } from '../../middleware/auth.middleware';
import { attachOrgContext } from '../../middleware/orgContext.middleware';
import { jobsController } from './jobs.controller';

const router = Router();

router.use(authenticateToken, attachOrgContext);
router.get('/:id', asyncHandler(jobsController.getJobStatus));

export default router;
