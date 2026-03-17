import { Module } from '@nestjs/common';
import { LeadDistributionService } from './lead-distribution.service';
import { LeadDistributionController } from './lead-distribution.controller';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [S3Module],
  providers: [LeadDistributionService],
  controllers: [LeadDistributionController],
  exports: [LeadDistributionService]
})
export class LeadDistributionModule {}
