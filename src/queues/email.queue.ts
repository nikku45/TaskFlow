import { Queue } from 'bullmq';
import { env } from '../config/env';
import { redisConnectionOptions } from './connection';

export interface EmailJobPayload {
  taskAssignmentId: string;
  taskId: string;
  assigneeId: string;
  orgId: string;
}

export const emailQueue = new Queue<EmailJobPayload>(env.EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: env.JOB_RETRY_ATTEMPTS, // 3 attempts per assignment brief
    backoff: {
      type: 'exponential',
      delay: env.JOB_BACKOFF_BASE_MS, // 1000ms -> 1s, 2s, 4s
    },
    removeOnComplete: false, // keep completed jobs so GET /jobs/:id works
    removeOnFail: false,
  },
});

/**
 * Enqueues an assignment notification job.
 * Returns the created BullMQ job ID.
 */
export async function enqueueAssignmentEmail(payload: EmailJobPayload): Promise<string> {
  const job = await emailQueue.add('assignment-notification', payload);
  return String(job.id);
}
