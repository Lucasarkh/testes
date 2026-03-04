import { Module, Global } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingScheduler } from './billing.scheduler';
import {
  BillingAdminController,
  BillingController,
  BillingWebhookController,
} from './billing.controller';
import { BillingGuard, FeatureGuard } from './guards/feature.guard';
import { DbModule } from '@infra/db/db.module';

@Global()
@Module({
  imports: [DbModule],
  controllers: [
    BillingAdminController,
    BillingController,
    BillingWebhookController,
  ],
  providers: [BillingService, BillingScheduler, BillingGuard],
  exports: [BillingService, BillingGuard, FeatureGuard],
})
export class BillingModule {}
