import { prisma } from '../../database/prisma';
import { Project, TaskStatus } from '@prisma/client';
import { CreateProjectInput, UpdateProjectInput } from './projects.schema';

export class ProjectsRepository {
  async create(orgId: string, input: CreateProjectInput): Promise<Project> {
    return prisma.project.create({
      data: {
        orgId,
        name: input.name,
        description: input.description,
      },
    });
  }

  async findManyByOrg(
    orgId: string,
    skip: number,
    limit: number
  ): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByOrg(orgId: string): Promise<number> {
    return prisma.project.count({
      where: {
        orgId,
        deletedAt: null,
      },
    });
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: {
        id,
        orgId,
        deletedAt: null,
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateProjectInput
  ): Promise<Project | null> {
    const existing = await this.findByIdAndOrg(id, orgId);
    if (!existing) return null;

    return prisma.project.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
      },
    });
  }

  async softDelete(id: string, orgId: string): Promise<boolean> {
    const existing = await this.findByIdAndOrg(id, orgId);
    if (!existing) return false;

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }

  async getDashboardStats(
    projectId: string,
    orgId: string
  ): Promise<{ statusCounts: Record<string, number>; totalTasks: number } | null> {
    const project = await this.findByIdAndOrg(projectId, orgId);
    if (!project) return null;

    const grouped = await prisma.task.groupBy({
      by: ['status'],
      where: {
        projectId,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const statusCounts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    let totalTasks = 0;

    for (const item of grouped) {
      statusCounts[item.status] = item._count.id;
      totalTasks += item._count.id;
    }

    return { statusCounts, totalTasks };
  }
}

export const projectsRepository = new ProjectsRepository();
