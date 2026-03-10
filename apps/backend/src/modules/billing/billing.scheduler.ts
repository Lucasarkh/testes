import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingService } from './billing.service';

/**
 * Scheduled tasks for the billing module.
 * Runs every hour to check if any tenants in GRACE_PERIOD have expired.
 */
@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(private readonly billingService: BillingService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleGracePeriodCheck() {
    this.logger.debug('Running grace period check...');
    try {
      await this.billingService.checkGracePeriods();
    } catch (error) {
      this.logger.error(
        `Grace period check failed: ${error.message}`,
        error.stack
      );
    }
  }
}
