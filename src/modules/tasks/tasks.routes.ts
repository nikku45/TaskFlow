import { Router } from 'express';
import { asyncHandler } from '../../common/asyncHandler';
import { authenticateToken } from '../../middleware/auth.middleware';
import { attachOrgContext } from '../../middleware/orgContext.middleware';
import { tasksController } from './tasks.controller';

// Router for nested /projects/:projectId/tasks routes
export const projectTasksRouter = Router({ mergeParams: true });
projectTasksRouter.use(authenticateToken, attachOrgContext);
projectTasksRouter.post('/', asyncHandler(tasksController.create));
projectTasksRouter.get('/', asyncHandler(tasksController.list));

// Router for flat /tasks routes
export const tasksRouter = Router();
tasksRouter.use(authenticateToken, attachOrgContext);
tasksRouter.get('/', asyncHandler(tasksController.list));
tasksRouter.get('/:id', asyncHandler(tasksController.getById));
tasksRouter.patch('/:id', asyncHandler(tasksController.update));
tasksRouter.delete('/:id', asyncHandler(tasksController.delete));

export default tasksRouter;
