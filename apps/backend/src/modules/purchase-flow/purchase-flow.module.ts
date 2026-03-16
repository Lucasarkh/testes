import { Module } from '@nestjs/common';
import { PurchaseFlowService } from './purchase-flow.service';
import { PurchaseFlowController } from './purchase-flow.controller';
import { PurchaseFlowCustomerController } from './purchase-flow.customer.controller';
import { EmailQueueModule } from '@infra/email-queue/email-queue.module';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [EmailQueueModule, S3Module],
  providers: [PurchaseFlowService],
  controllers: [PurchaseFlowController, PurchaseFlowCustomerController],
  exports: [PurchaseFlowService]
})
export class PurchaseFlowModule {}