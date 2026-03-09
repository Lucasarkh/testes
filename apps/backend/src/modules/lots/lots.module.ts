import { Module } from '@nestjs/common';
import { LotsService } from './lots.service';
import { LotsController } from './lots.controller';
import { LotsImportService } from './lots-import.service';
import { RabbitMqModule } from '@infra/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitMqModule],
  controllers: [LotsController],
  providers: [LotsService, LotsImportService],
  exports: [LotsService, LotsImportService]
})
export class LotsModule {}
