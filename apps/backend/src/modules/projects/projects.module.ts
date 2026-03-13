import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PublicProjectsController } from './public-projects.controller';
import { NearbyModule } from '@modules/nearby/nearby.module';
import { S3Module } from '@infra/s3/s3.module';

@Module({
  imports: [NearbyModule, S3Module],
  controllers: [ProjectsController, PublicProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
