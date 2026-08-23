import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictError, ForbiddenError } from '../../src/common/errors';
import { AssignmentsService } from '../../src/modules/tasks/assignments.service';

// Mock dependencies
vi.mock('../../src/database/prisma', () => ({
  prisma: {
    task: { findFirst: vi.fn() },
    orgMember: { findFirst: vi.fn() },
    taskAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../src/queues/email.queue', () => ({
  enqueueAssignmentEmail: vi.fn(),
}));

import { prisma } from '../../src/database/prisma';
import { enqueueAssignmentEmail } from '../../src/queues/email.queue';

describe('Task Assignment Logic (Unit)', () => {
  let service: AssignmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AssignmentsService();
  });

  it('should reject assignment if target user does not belong to caller org', async () => {
    // Task exists in org-A
    (prisma.task.findFirst as any).mockResolvedValue({ id: 'task-1' });
    // Target user is NOT in org-A
    (prisma.orgMember.findFirst as any).mockResolvedValue(null);

    await expect(
      service.assignUser('task-1', 'user-other-org', 'org-A')
    ).rejects.toThrow(ForbiddenError);
  });

  it('should throw ConflictError (409) if user is already assigned to the task', async () => {
    (prisma.task.findFirst as any).mockResolvedValue({ id: 'task-1' });
    (prisma.orgMember.findFirst as any).mockResolvedValue({ userId: 'user-1', orgId: 'org-A' });
    // User already assigned
    (prisma.taskAssignment.findUnique as any).mockResolvedValue({ id: 'assign-1' });

    await expect(
      service.assignUser('task-1', 'user-1', 'org-A')
    ).rejects.toThrow(ConflictError);
  });

  it('should persist assignment and mark enqueue_failed if queue enqueueing throws an error', async () => {
    (prisma.task.findFirst as any).mockResolvedValue({ id: 'task-1' });
    (prisma.orgMember.findFirst as any).mockResolvedValue({ userId: 'user-1', orgId: 'org-A' });
    (prisma.taskAssignment.findUnique as any).mockResolvedValue(null);
    (prisma.taskAssignment.create as any).mockResolvedValue({
      id: 'assign-1',
      taskId: 'task-1',
      userId: 'user-1',
      notificationStatus: 'pending',
    });

    // Queue enqueueing throws error (e.g. Redis unavailable)
    (enqueueAssignmentEmail as any).mockRejectedValue(new Error('Redis connection down'));

    const result = await service.assignUser('task-1', 'user-1', 'org-A');

    expect(result.assignment.id).toBe('assign-1');
    expect(result.jobId).toBeNull();
    // Fault tolerance check: verify update called with enqueue_failed without throwing
    expect(prisma.taskAssignment.update).toHaveBeenCalledWith({
      where: { id: 'assign-1' },
      data: { notificationStatus: 'enqueue_failed' },
    });
  });
});
