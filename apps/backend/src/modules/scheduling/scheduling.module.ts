import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { PublicSchedulingController } from './public-scheduling.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [SchedulingService],
  controllers: [SchedulingController, PublicSchedulingController],
  exports: [SchedulingService]
})
export class SchedulingModule {}
