import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhapiService } from './whapi.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WhapiService],
  exports: [WhapiService],
})
export class WhapiModule {}
