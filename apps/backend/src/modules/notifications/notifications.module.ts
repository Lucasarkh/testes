import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailQueueModule } from '@infra/email-queue/email-queue.module';
import { WhapiModule } from '@infra/whapi/whapi.module';

@Module({
  imports: [EmailQueueModule, WhapiModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService]
})
export class NotificationsModule {}
