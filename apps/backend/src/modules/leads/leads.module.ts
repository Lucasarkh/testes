import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { PublicLeadsController } from './public-leads.controller';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { LeadDistributionModule } from '@modules/lead-distribution/lead-distribution.module';

@Module({
  imports: [NotificationsModule, LeadDistributionModule],
  controllers: [LeadsController, PublicLeadsController],
  providers: [LeadsService],
  exports: [LeadsService]
})
export class LeadsModule {}
