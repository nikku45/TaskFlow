import { env } from '../config/env';
import { logger } from '../config/logger';

export interface EmailParams {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  orgName: string;
}

export class EmailService {
  private forceFail = false;

  public setForceFail(fail: boolean): void {
    this.forceFail = fail;
  }

  async sendAssignmentEmail(params: EmailParams): Promise<void> {
    if (this.forceFail) {
      logger.warn({ params }, 'Simulating email delivery failure for testing');
      throw new Error('Simulated Email Provider Delivery Failure');
    }

    if (env.BREVO_API_KEY) {
      await this.sendViaBrevo(params);
    } else {
      this.sendViaMock(params);
    }
  }

  private async sendViaBrevo(params: EmailParams): Promise<void> {
    const senderEmail = env.BREVO_SENDER_EMAIL || env.MOCK_EMAIL_FROM;
    const senderName = env.BREVO_SENDER_NAME || 'TaskFlow Notification';

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: params.to,
          name: params.assigneeName,
        },
      ],
      subject: `[${params.orgName}] New Task Assigned: ${params.taskTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">Task Assignment Notification</h2>
          <p>Hello <strong>${params.assigneeName}</strong>,</p>
          <p>You have been assigned a new task in <strong>${params.projectName}</strong> under <strong>${params.orgName}</strong>.</p>
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Task Details</h3>
            <p><strong>Title:</strong> ${params.taskTitle}</p>
            <p><strong>Project:</strong> ${params.projectName}</p>
            <p><strong>Organization:</strong> ${params.orgName}</p>
          </div>
          <p>Best regards,<br>TaskFlow Team</p>
        </div>
      `,
    };

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'api-key': env.BREVO_API_KEY as string,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, 'Brevo API returned error response');
        throw new Error(`Brevo API Error (${response.status}): ${errorText}`);
      }

      const responseData = await response.json();
      logger.info(
        { to: params.to, messageId: (responseData as any)?.messageId },
        `✉️ [BREVO EMAIL SENT] Transactional email delivered to ${params.to} via Brevo API`
      );
    } catch (err: any) {
      logger.error({ err: err.message, to: params.to }, 'Failed to send transactional email via Brevo');
      throw err;
    }
  }

  private sendViaMock(params: EmailParams): void {
    logger.info(
      {
        to: params.to,
        assigneeName: params.assigneeName,
        taskTitle: params.taskTitle,
        projectName: params.projectName,
        orgName: params.orgName,
      },
      `📧 [MOCK EMAIL SENT] Notification delivered to ${params.to} for task "${params.taskTitle}" (Set BREVO_API_KEY in .env to use live Brevo API)`
    );
  }
}

export const emailService = new EmailService();
export const mockEmailService = emailService; // Alias for backward compatibility with unit test mocks
