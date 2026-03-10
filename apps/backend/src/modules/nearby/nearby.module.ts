import { Module } from '@nestjs/common';
import { NearbyService } from './nearby.service';
import { NearbyController } from './nearby.controller';
import { PublicNearbyController } from './public-nearby.controller';

@Module({
  controllers: [NearbyController, PublicNearbyController],
  providers: [NearbyService],
  exports: [NearbyService]
})
export class NearbyModule {}
