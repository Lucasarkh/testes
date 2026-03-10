import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMqService } from '@infra/rabbitmq/rabbitmq.service';
import { SendPulseService } from '@infra/sendpulse/sendpulse.service';

export interface EmailJob {
  type:
    | 'welcome-tenant'
    | 'welcome-realtor'
    | 'password-reset'
    | 'invite'
    | 'two-factor'
    | 'system-notification';
  to: string;
  data: Record<string, any>;
  attempts: number;
}

const EMAIL_QUEUE = 'email-notifications';

@Injectable()
export class EmailQueueService implements OnModuleInit {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly maxRetries = 3;

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly sendPulseService: SendPulseService
  ) {}

  async onModuleInit() {
    await this.startEmailConsumer();
    this.logger.log('Email queue consumer started');
  }

  async queueEmail(
    type: EmailJob['type'],
    to: string,
    data: Record<string, any>
  ): Promise<void> {
    const job: EmailJob = {
      type,
      to,
      data,
      attempts: 0
    };

    await this.rabbitMqService.sendToQueue(EMAIL_QUEUE, job, {
      withDeadLetter: true
    });
    this.logger.debug(`Email queued: ${type} to ${to}`);
  }

  async queueWelcomeTenantEmail(
    to: string,
    userName: string,
    tenantName: string
  ): Promise<void> {
    await this.queueEmail('welcome-tenant', to, { userName, tenantName });
  }

  async queueWelcomeRealtorEmail(to: string, userName: string): Promise<void> {
    await this.queueEmail('welcome-realtor', to, { userName });
  }

  async queuePasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string
  ): Promise<void> {
    await this.queueEmail('password-reset', to, { userName, resetToken });
  }

  async queueInviteEmail(
    to: string,
    token: string,
    role: string,
    email: string
  ): Promise<void> {
    await this.queueEmail('invite', to, { token, role, email });
  }

  async queueTwoFactorEmail(
    to: string,
    userName: string,
    code: string
  ): Promise<void> {
    await this.queueEmail('two-factor', to, { userName, code });
  }

  async queueSystemNotificationEmail(
    to: string,
    userName: string,
    title: string,
    message: string
  ): Promise<void> {
    await this.queueEmail('system-notification', to, {
      userName,
      title,
      message
    });
  }

  private async startEmailConsumer(): Promise<void> {
    await this.rabbitMqService.createConsumer({
      queue: EMAIL_QUEUE,
      prefetch: 5,
      withDeadLetter: true,
      onMessage: async (payload: any) => {
        if (!this.isValidEmailJob(payload)) {
          this.logger.warn(
            'Received invalid email job payload, sending to DLQ'
          );
          throw new Error('Invalid email job format');
        }

        await this.processEmailJob(payload);
      }
    });
  }

  private isValidEmailJob(payload: any): payload is EmailJob {
    return (
      payload &&
      typeof payload.to === 'string' &&
      typeof payload.type === 'string' &&
      [
        'welcome-tenant',
        'welcome-realtor',
        'password-reset',
        'invite',
        'two-factor',
        'system-notification'
      ].includes(payload.type) &&
      payload.data &&
      typeof payload.data === 'object' &&
      typeof payload.attempts === 'number'
    );
  }

  private async processEmailJob(job: EmailJob): Promise<void> {
    try {
      await this.sendEmail(job);
      this.logger.log(`Email sent: ${job.type} to ${job.to}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to send email: ${job.type} to ${job.to}`,
        error.message
      );

      if (job.attempts + 1 < this.maxRetries) {
        const retryJob: EmailJob = { ...job, attempts: job.attempts + 1 };
        const delay = Math.pow(2, job.attempts + 1) * 1000; // 2s, 4s, 8s

        this.logger.log(
          `Scheduling retry ${retryJob.attempts}/${this.maxRetries} for email ${job.type} to ${job.to} in ${delay / 1000}s`
        );

        // Re-queue synchronously to avoid fire-and-forget issues with setTimeout
        // The delay is approximate — we await a timer then enqueue
        await new Promise((resolve) => setTimeout(resolve, delay));
        await this.rabbitMqService.sendToQueue(EMAIL_QUEUE, retryJob, {
          withDeadLetter: true
        });
      } else {
        this.logger.error(
          `Max retries (${this.maxRetries}) reached for email ${job.type} to ${job.to}. Sending to DLQ.`
        );
        throw error; // Propagate error to trigger NACK → DLQ
      }
    }
  }

  private async sendEmail(job: EmailJob): Promise<void> {
    switch (job.type) {
      case 'welcome-tenant':
        await this.sendPulseService.sendWelcomeTenantEmail(
          job.to,
          job.data.userName,
          job.data.tenantName
        );
        break;
      case 'welcome-realtor':
        await this.sendPulseService.sendWelcomeRealtorEmail(
          job.to,
          job.data.userName
        );
        break;
      case 'password-reset':
        await this.sendPulseService.sendPasswordResetEmail(
          job.to,
          job.data.userName,
          job.data.resetToken
        );
        break;
      case 'invite':
        await this.sendPulseService.sendInviteEmail(
          job.to,
          job.data.token,
          job.data.role,
          job.data.email
        );
        break;
      case 'two-factor':
        await this.sendPulseService.sendTwoFactorEmail(
          job.to,
          job.data.userName,
          job.data.code
        );
        break;
      case 'system-notification':
        await this.sendPulseService.sendSystemNotificationEmail(
          job.to,
          job.data.userName,
          job.data.title,
          job.data.message
        );
        break;
      default:
        this.logger.warn(`Unknown email job type: ${(job as any).type}`);
        throw new Error(`Unknown email job type: ${(job as any).type}`);
    }
  }
}
