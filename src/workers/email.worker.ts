import { Worker, QueueEvents, Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../database/prisma';
import { redisConnectionOptions } from '../queues/connection';
import { EmailJobPayload } from '../queues/email.queue';
import { emailService } from './emailService';

/**
 * Worker processor function.
 * Re-fetches authoritative data from PostgreSQL by ID before processing per ARCHITECTURE.md §9.
 */
async function processEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { taskAssignmentId, taskId, assigneeId } = job.data;

  logger.info({ jobId: job.id, attempt: job.attemptsMade + 1 }, 'Processing email notification job');

  // Re-fetch authoritative records from PostgreSQL
  const assignment = await prisma.taskAssignment.findUnique({
    where: { id: taskAssignmentId },
    include: {
      task: {
        include: {
          project: {
            include: {
              organization: true,
            },
          },
        },
      },
      user: true,
    },
  });

  if (!assignment) {
    logger.warn({ taskAssignmentId }, 'Task assignment no longer exists, skipping job');
    return;
  }

  // Update notification status to in_progress / active
  await prisma.taskAssignment.update({
    where: { id: taskAssignmentId },
    data: { notificationStatus: 'active' },
  });

  // Call email delivery service (Brevo API or Mock based on BREVO_API_KEY)
  await emailService.sendAssignmentEmail({
    to: assignment.user.email,
    assigneeName: assignment.user.fullName,
    taskTitle: assignment.task.title,
    projectName: assignment.task.project.name,
    orgName: assignment.task.project.organization.name,
  });

  // Update notification status to completed
  await prisma.taskAssignment.update({
    where: { id: taskAssignmentId },
    data: { notificationStatus: 'completed' },
  });

  logger.info({ jobId: job.id }, 'Email notification job successfully completed');
}

// Instantiate BullMQ Worker
export const emailWorker = new Worker<EmailJobPayload>(
  env.EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnectionOptions,
    concurrency: 5,
  }
);

// Queue Events listener for Dead-Letter Queue (DLQ) routing
export const queueEvents = new QueueEvents(env.EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
});

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Worker: Job completed');
});

emailWorker.on('failed', async (job, err) => {
  if (!job) return;

  const isExhausted = job.attemptsMade >= (job.opts.attempts || env.JOB_RETRY_ATTEMPTS);
  logger.error(
    { jobId: job.id, attemptsMade: job.attemptsMade, isExhausted, error: err.message },
    `Worker: Job failed (Attempt ${job.attemptsMade}/${job.opts.attempts || env.JOB_RETRY_ATTEMPTS})`
  );

  if (isExhausted) {
    logger.warn({ jobId: job.id }, `Routing exhausted job to Dead-Letter Queue (${env.EMAIL_QUEUE_DLQ_NAME})`);
    try {
      // Mark notification_status = 'failed' in DB
      await prisma.taskAssignment.update({
        where: { id: job.data.taskAssignmentId },
        data: { notificationStatus: 'failed' },
      });
    } catch (dbErr) {
      logger.error({ dbErr }, 'Failed to update assignment status to failed');
    }
  }
});

logger.info(`🚀 Email worker running on queue "${env.EMAIL_QUEUE_NAME}"`);
