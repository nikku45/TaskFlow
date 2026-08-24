import { Job } from 'bullmq';
import { ForbiddenError, NotFoundError } from '../../common/errors';
import { emailQueue, EmailJobPayload } from '../../queues/email.queue';

export type AssignmentJobStatus = 'pending' | 'active' | 'completed' | 'failed';

export class JobsService {
  async getJobStatus(jobId: string, orgId: string) {
    const job = await Job.fromId<EmailJobPayload>(emailQueue as any, jobId);
    if (!job) {
      throw new NotFoundError('Job not found', 'JOB_NOT_FOUND');
    }

    // Security check: verify job belongs to caller's organization
    if (job.data && job.data.orgId && job.data.orgId !== orgId) {
      throw new ForbiddenError('You do not have access to this job');
    }

    const state = await job.getState();
    let status: AssignmentJobStatus = 'pending';

    switch (state) {
      case 'active':
        status = 'active';
        break;
      case 'completed':
        status = 'completed';
        break;
      case 'failed':
        status = 'failed';
        break;
      case 'waiting':
      case 'delayed':
      case 'prioritized':
      case 'waiting-children':
      default:
        status = 'pending';
        break;
    }

    return {
      id: String(job.id),
      status,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      timestamp: job.timestamp,
    };
  }
}

export const jobsService = new JobsService();
