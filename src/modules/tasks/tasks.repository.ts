import { prisma } from '../../database/prisma';
import { Task, TaskPriority, TaskStatus, Prisma } from '@prisma/client';
import { CreateTaskInput, UpdateTaskInput, TaskFilterQuery } from './tasks.schema';

export interface TaskWithDetails extends Task {
  assignments?: Array<{
    user: {
      id: string;
      email: string;
      fullName: string;
    };
  }>;
}

export class TasksRepository {
  async create(projectId: string, input: CreateTaskInput): Promise<Task> {
    return prisma.task.create({
      data: {
        projectId,
        title: input.title,
        description: input.description,
        status: input.status ?? TaskStatus.todo,
        priority: input.priority ?? TaskPriority.medium,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    });
  }

  private buildWhereClause(
    orgId: string,
    projectId?: string,
    filters?: TaskFilterQuery
  ): Prisma.TaskWhereInput {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      project: {
        orgId,
        deletedAt: null,
      },
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.assigneeId) {
      where.assignments = {
        some: {
          userId: filters.assigneeId,
        },
      };
    }

    if (filters?.dueDateFrom || filters?.dueDateTo) {
      where.dueDate = {};
      if (filters.dueDateFrom) {
        where.dueDate.gte = new Date(filters.dueDateFrom);
      }
      if (filters.dueDateTo) {
        where.dueDate.lte = new Date(filters.dueDateTo);
      }
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findManyInOrg(
    orgId: string,
    projectId?: string,
    filters?: TaskFilterQuery,
    skip = 0,
    limit = 20
  ): Promise<TaskWithDetails[]> {
    const where = this.buildWhereClause(orgId, projectId, filters);

    return prisma.task.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async countInOrg(
    orgId: string,
    projectId?: string,
    filters?: TaskFilterQuery
  ): Promise<number> {
    const where = this.buildWhereClause(orgId, projectId, filters);
    return prisma.task.count({ where });
  }

  async findByIdInOrg(id: string, orgId: string): Promise<TaskWithDetails | null> {
    return prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          orgId,
          deletedAt: null,
        },
      },
      include: {
        assignments: {
          select: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });
  }

  async update(
    id: string,
    orgId: string,
    input: UpdateTaskInput
  ): Promise<Task | null> {
    const existing = await this.findByIdInOrg(id, orgId);
    if (!existing) return null;

    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.dueDate !== undefined) {
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, orgId: string): Promise<boolean> {
    const existing = await this.findByIdInOrg(id, orgId);
    if (!existing) return false;

    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return true;
  }
}

export const tasksRepository = new TasksRepository();
