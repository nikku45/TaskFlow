import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { authenticateToken } from '../../middleware/auth.middleware';
import { attachOrgContext } from '../../middleware/orgContext.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { projectsController } from './projects.controller';

const router = Router();

// Protect all project routes with auth + org context
router.use(authenticateToken, attachOrgContext);

router.post('/', asyncHandler(projectsController.create));
router.get('/', asyncHandler(projectsController.list));
router.get('/:id', asyncHandler(projectsController.getById));
router.patch('/:id', asyncHandler(projectsController.update));
router.delete('/:id', requireRole('org_admin'), asyncHandler(projectsController.delete));
router.get('/:id/dashboard', asyncHandler(projectsController.getDashboard));

export default router;
