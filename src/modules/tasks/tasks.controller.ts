import { Request, Response } from 'express';
import { parsePagination } from '../../common/pagination';
import { ValidationError, UnauthorizedError } from '../../common/errors';
import { tasksService, TasksService } from './tasks.service';
import {
  createTaskSchema,
  updateTaskSchema,
  taskFilterQuerySchema,
} from './tasks.schema';

export class TasksController {
  constructor(private readonly service: TasksService = tasksService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const projectId = Array.isArray(req.params.projectId)
      ? req.params.projectId[0]
      : req.params.projectId;

    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const task = await this.service.createTask(
      projectId,
      req.auth.orgId,
      parseResult.data
    );
    res.status(201).json(task);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const projectId = req.params.projectId
      ? Array.isArray(req.params.projectId)
        ? req.params.projectId[0]
        : req.params.projectId
      : undefined;

    const queryResult = taskFilterQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      throw new ValidationError(
        'Invalid query parameters',
        queryResult.error.flatten().fieldErrors
      );
    }

    const pagination = parsePagination(req.query);
    const result = await this.service.listTasks(
      req.auth.orgId,
      projectId,
      queryResult.data,
      pagination
    );
    res.status(200).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const task = await this.service.getTaskById(taskId, req.auth.orgId);
    res.status(200).json(task);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const updated = await this.service.updateTask(
      taskId,
      req.auth.orgId,
      parseResult.data
    );
    res.status(200).json(updated);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteTask(taskId, req.auth.orgId);
    res.status(204).send();
  };
}

export const tasksController = new TasksController();
