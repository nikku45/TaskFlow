import { prisma } from '../../database/prisma';
import { ConflictError, ForbiddenError } from '../../common/errors';
import { enqueueAssignmentEmail } from '../../queues/email.queue';
import { logger } from '../../config/logger';

export class AssignmentsService {
  async assignUser(taskId: string, targetUserId: string, orgId: string) {
    // 1. Verify task belongs to caller's org
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          orgId,
          deletedAt: null,
        },
      },
    });

    if (!task) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // 2. Verify target user belongs to caller's org (Same-organization validation)
    const targetOrgMember = await prisma.orgMember.findFirst({
      where: {
        userId: targetUserId,
        orgId,
      },
    });

    if (!targetOrgMember) {
      throw new ForbiddenError('Target user does not belong to your organization');
    }

    // 3. Check for duplicate assignment
    const existing = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('User is already assigned to this task', 'ALREADY_ASSIGNED');
    }

    // 4. Create assignment row in DB
    const assignment = await prisma.taskAssignment.create({
      data: {
        taskId,
        userId: targetUserId,
        notificationStatus: 'pending',
      },
    });

    // 5. Attempt queue enqueueing (ARCHITECTURE.md §16 transactional outbox consistency)
    let jobId: string | null = null;
    try {
      jobId = await enqueueAssignmentEmail({
        taskAssignmentId: assignment.id,
        taskId,
        assigneeId: targetUserId,
        orgId,
      });

      await prisma.taskAssignment.update({
        where: { id: assignment.id },
        data: { notificationStatus: 'enqueued' },
      });
    } catch (err: any) {
      logger.error(
        { err: err.message, assignmentId: assignment.id },
        'Enqueueing email notification job failed; persisting assignment with notificationStatus=enqueue_failed'
      );
      // Fail-safe: update status without rolling back assignment per §16
      await prisma.taskAssignment.update({
        where: { id: assignment.id },
        data: { notificationStatus: 'enqueue_failed' },
      });
    }

    return {
      assignment,
      jobId,
    };
  }

  async unassignUser(taskId: string, targetUserId: string, orgId: string): Promise<void> {
    // 1. Verify task belongs to caller's org
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        deletedAt: null,
        project: {
          orgId,
          deletedAt: null,
        },
      },
    });

    if (!task) {
      throw new ForbiddenError('You do not have access to this task');
    }

    // 2. Remove assignment
    const existing = await prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });

    if (!existing) {
      throw new ForbiddenError('Assignment not found');
    }

    await prisma.taskAssignment.delete({
      where: {
        taskId_userId: {
          taskId,
          userId: targetUserId,
        },
      },
    });
  }
}

export const assignmentsService = new AssignmentsService();
