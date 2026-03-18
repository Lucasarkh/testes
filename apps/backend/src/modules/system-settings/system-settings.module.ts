import { Module } from '@nestjs/common';
import { WhapiModule } from '@infra/whapi/whapi.module';
import { SystemSettingsService } from './system-settings.service';
import {
  PublicSettingsController,
  AdminSettingsController
} from './system-settings.controller';

@Module({
  imports: [WhapiModule],
  providers: [SystemSettingsService],
  controllers: [PublicSettingsController, AdminSettingsController],
  exports: [SystemSettingsService]
})
export class SystemSettingsModule {}
