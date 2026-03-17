import { Module } from '@nestjs/common';
import { RealtorLinksService } from './realtor-links.service';
import { RealtorLinksController } from './realtor-links.controller';
import { PublicRealtorLinksController } from './public-realtor-links.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [NotificationsModule, S3Module],
  controllers: [RealtorLinksController, PublicRealtorLinksController],
  providers: [RealtorLinksService],
  exports: [RealtorLinksService]
})
export class RealtorLinksModule {}
