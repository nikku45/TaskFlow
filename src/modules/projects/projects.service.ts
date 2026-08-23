import { ForbiddenError, NotFoundError } from '../../common/errors';
import { PaginationParams, toPaginatedResponse } from '../../common/pagination';
import { projectsRepository, ProjectsRepository } from './projects.repository';
import { CreateProjectInput, UpdateProjectInput } from './projects.schema';

export class ProjectsService {
  constructor(private readonly repo: ProjectsRepository = projectsRepository) {}

  async createProject(orgId: string, input: CreateProjectInput) {
    return this.repo.create(orgId, input);
  }

  async listProjects(orgId: string, pagination: PaginationParams) {
    const [data, total] = await Promise.all([
      this.repo.findManyByOrg(orgId, pagination.skip, pagination.limit),
      this.repo.countByOrg(orgId),
    ]);

    return toPaginatedResponse(data, total, pagination.page, pagination.limit);
  }

  async getProjectById(id: string, orgId: string) {
    const project = await this.repo.findByIdAndOrg(id, orgId);
    if (!project) {
      // Per ARCHITECTURE.md §14, cross-tenant access returns 403 Forbidden
      throw new ForbiddenError('You do not have access to this project');
    }
    return project;
  }

  async updateProject(id: string, orgId: string, input: UpdateProjectInput) {
    const updated = await this.repo.update(id, orgId, input);
    if (!updated) {
      throw new ForbiddenError('You do not have access to this project');
    }
    return updated;
  }

  async deleteProject(id: string, orgId: string, role: string) {
    if (role !== 'org_admin') {
      throw new ForbiddenError('Only organization admins can delete projects');
    }

    const deleted = await this.repo.softDelete(id, orgId);
    if (!deleted) {
      throw new ForbiddenError('You do not have access to this project');
    }
  }

  async getDashboard(id: string, orgId: string) {
    const stats = await this.repo.getDashboardStats(id, orgId);
    if (!stats) {
      throw new ForbiddenError('You do not have access to this project');
    }
    return {
      projectId: id,
      taskCounts: stats.statusCounts,
      totalTasks: stats.totalTasks,
    };
  }
}

export const projectsService = new ProjectsService();
