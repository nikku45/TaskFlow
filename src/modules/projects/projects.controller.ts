import { Request, Response } from 'express';
import { parsePagination } from '../../common/pagination';
import { ValidationError, UnauthorizedError } from '../../common/errors';
import { projectsService, ProjectsService } from './projects.service';
import { createProjectSchema, updateProjectSchema } from './projects.schema';

export class ProjectsController {
  constructor(private readonly service: ProjectsService = projectsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const project = await this.service.createProject(req.auth.orgId, parseResult.data);
    res.status(201).json(project);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const pagination = parsePagination(req.query);
    const result = await this.service.listProjects(req.auth.orgId, pagination);
    res.status(200).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = await this.service.getProjectById(projectId, req.auth.orgId);
    res.status(200).json(project);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError(
        'Validation failed',
        parseResult.error.flatten().fieldErrors
      );
    }

    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updated = await this.service.updateProject(
      projectId,
      req.auth.orgId,
      parseResult.data
    );
    res.status(200).json(updated);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId || !req.auth.role) {
      throw new UnauthorizedError('Organization context required');
    }

    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.deleteProject(projectId, req.auth.orgId, req.auth.role);
    res.status(204).send();
  };

  getDashboard = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const dashboard = await this.service.getDashboard(projectId, req.auth.orgId);
    res.status(200).json(dashboard);
  };
}

export const projectsController = new ProjectsController();
