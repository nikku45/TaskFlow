import { Request, Response } from 'express';
import { UnauthorizedError } from '../../common/errors';
import { jobsService, JobsService } from './jobs.service';

export class JobsController {
  constructor(private readonly service: JobsService = jobsService) {}

  getJobStatus = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth || !req.auth.orgId) {
      throw new UnauthorizedError('Organization context required');
    }

    const jobId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const status = await this.service.getJobStatus(jobId, req.auth.orgId);
    res.status(200).json(status);
  };
}

export const jobsController = new JobsController();
