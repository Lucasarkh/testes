import { Module } from '@nestjs/common';
import { MapElementsService } from './map-elements.service';
import { MapElementsController } from './map-elements.controller';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [S3Module],
  controllers: [MapElementsController],
  providers: [MapElementsService],
  exports: [MapElementsService]
})
export class MapElementsModule {}
