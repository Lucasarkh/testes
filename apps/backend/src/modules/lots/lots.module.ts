import { Module } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';
import { LotsImportService } from './lots-import.service';
import { RabbitMqModule } from '@infra/rabbitmq/rabbitmq.module';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [RabbitMqModule, S3Module],
  controllers: [LotsController],
  providers: [LotsService, LotsImportService],
  exports: [LotsService, LotsImportService]
})
export class LotsModule {}
