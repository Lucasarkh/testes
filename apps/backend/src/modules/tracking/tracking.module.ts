import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [NotificationsModule, S3Module],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService]
})
export class TrackingModule {}
