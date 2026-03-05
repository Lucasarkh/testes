import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService]
})
export class TenantsModule {}
