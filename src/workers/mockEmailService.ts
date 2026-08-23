import { logger } from '../config/logger';

export interface EmailParams {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  orgName: string;
}

export class MockEmailService {
  private forceFail = false;

  public setForceFail(fail: boolean): void {
    this.forceFail = fail;
  }

  async sendAssignmentEmail(params: EmailParams): Promise<void> {
    if (this.forceFail) {
      logger.warn({ params }, 'Simulating mock email delivery failure for retry testing');
      throw new Error('Simulated Email Provider Delivery Failure');
    }

    logger.info(
      {
        to: params.to,
        assigneeName: params.assigneeName,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
        orgName: params.orgName,
      },
      `📧 [MOCK EMAIL SENT] Notification delivered to ${params.to} for task "${params.taskTitle}"`
    );
  }
}

export const mockEmailService = new MockEmailService();
