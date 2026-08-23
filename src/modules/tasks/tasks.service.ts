import { ForbiddenError } from '../../common/errors';
import { PaginationParams, toPaginatedResponse } from '../../common/pagination';
import { projectsRepository, ProjectsRepository } from '../projects/projects.repository';
import { tasksRepository, TasksRepository } from './tasks.repository';
import { CreateTaskInput, UpdateTaskInput, TaskFilterQuery } from './tasks.schema';

export class TasksService {
  constructor(
    private readonly tasksRepo: TasksRepository = tasksRepository,
    private readonly projectsRepo: ProjectsRepository = projectsRepository
  ) {}

  async createTask(projectId: string, orgId: string, input: CreateTaskInput) {
    // Verify parent project belongs to caller's org
    const project = await this.projectsRepo.findByIdAndOrg(projectId, orgId);
    if (!project) {
      throw new ForbiddenError('You do not have access to this project');
    }

    return this.tasksRepo.create(projectId, input);
  }

  async listTasks(
    orgId: string,
    projectId: string | undefined,
    filters: TaskFilterQuery,
    pagination: PaginationParams
  ) {
    // If projectId provided, verify it belongs to caller's org first
    if (projectId) {
      const project = await this.projectsRepo.findByIdAndOrg(projectId, orgId);
      if (!project) {
        throw new ForbiddenError('You do not have access to this project');
      }
    }

    const [data, total] = await Promise.all([
      this.tasksRepo.findManyInOrg(orgId, projectId, filters, pagination.skip, pagination.limit),
      this.tasksRepo.countInOrg(orgId, projectId, filters),
    ]);

    return toPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  async getTaskById(id: string, orgId: string) {
    const task = await this.tasksRepo.findByIdInOrg(id, orgId);
    if (!task) {
      throw new ForbiddenError('You do not have access to this task');
    }
    return task;
  }

  async updateTask(id: string, orgId: string, input: UpdateTaskInput) {
    const updated = await this.tasksRepo.update(id, orgId, input);
    if (!updated) {
      throw new ForbiddenError('You do not have access to this task');
    }
    return updated;
  }

  async deleteTask(id: string, orgId: string) {
    const deleted = await this.tasksRepo.softDelete(id, orgId);
    if (!deleted) {
      throw new ForbiddenError('You do not have access to this task');
    }
  }
}

export const tasksService = new TasksService();
