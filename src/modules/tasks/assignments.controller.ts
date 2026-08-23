import { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError, UnauthorizedError } from '../../common/errors';
import { assignmentsService, AssignmentsService } from './assignments.service';

const assignBodySchema = z
  .object({
    userId: z.string().uuid('Invalid userId format'),
  })
  .strict();

export class AssignmentsController {
  constructor(private readonly service: AssignmentsService = assignmentsService) {}

  assign = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const parseResult = assignBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const result = await this.service.assignUser(
      taskId,
      parseResult.data.userId,
      req.auth.orgId
    );
    res.status(201).json(result);
  };

  unassign = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

    await this.service.unassignUser(taskId, userId, req.auth.orgId);
    res.status(204).send();
  };
}

export const assignmentsController = new AssignmentsController();
