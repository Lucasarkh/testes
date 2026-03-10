import { Module } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { DbModule } from '@/infra/db/db.module';

@Module({
  imports: [DbModule],
  controllers: [AgenciesController],
  providers: [AgenciesService],
  exports: [AgenciesService]
})
export class AgenciesModule {}
