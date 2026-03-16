import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { ProjectsModule } from '@modules/projects/projects.module';
import { MapElementsModule } from '@modules/map-elements/map-elements.module';
import { LotsModule } from '@modules/lots/lots.module';
import { LeadsModule } from '@modules/leads/leads.module';
import { UploadModule } from '@modules/upload/upload.module';
import { RealtorLinksModule } from '@modules/realtor-links/realtor-links.module';
import { PlantMapModule } from '@modules/plant-map/plant-map.module';
import { PanoramaModule } from '@modules/panorama/panorama.module';
import { TrackingModule } from '@modules/tracking/tracking.module';
import { CampaignsModule } from '@modules/campaigns/campaigns.module';
import { TenantsModule } from '@modules/tenants/tenants.module';
import { PaymentModule } from '@modules/payment/payment.module';
import { AiModule } from '@modules/ai/ai.module';
import { SchedulingModule } from '@modules/scheduling/scheduling.module';
import { AgenciesModule } from '@modules/agencies/agencies.module';
import { BillingModule } from '@modules/billing/billing.module';
import { DbModule } from '@infra/db/db.module';
import { RedisModule } from '@infra/redis/redis.module';
import { SystemSettingsModule } from '@modules/system-settings/system-settings.module';
import { RabbitMqModule } from '@infra/rabbitmq/rabbitmq.module';
import { SendPulseModule } from '@infra/sendpulse/sendpulse.module';
import { EmailQueueModule } from '@infra/email-queue/email-queue.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { BackupModule } from '@infra/backup/backup.module';
import { GoogleModule } from '@infra/google/google.module';
import { NearbyModule } from '@modules/nearby/nearby.module';
import { SupportModule } from '@modules/support/support.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { LeadDistributionModule } from '@modules/lead-distribution/lead-distribution.module';
import { PurchaseFlowModule } from '@modules/purchase-flow/purchase-flow.module';
import { AppController } from './app.controller';
import { TermsGuard } from './common/guards/terms.guard';
import { PanelPermissionGuard } from './common/guards/panel-permission.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: 60000,
            limit: 120
          }
        ],
        storage: new ThrottlerStorageRedisService(
          config.get<string>('REDIS_URL') || 'redis://localhost:6379'
        )
      })
    }),
    DbModule,
    RedisModule,
    RabbitMqModule,
    SendPulseModule,
    EmailQueueModule,
    AuthModule,
    UserModule,
    TenantsModule,
    ProjectsModule,
    MapElementsModule,
    LotsModule,
    LeadsModule,
    UploadModule,
    RealtorLinksModule,
    PlantMapModule,
    PanoramaModule,
    TrackingModule,
    CampaignsModule,
    PaymentModule,
    AiModule,
    SchedulingModule,
    AgenciesModule,
    SystemSettingsModule,
    BackupModule,
    GoogleModule,
    NearbyModule,
    BillingModule,
    SupportModule,
    NotificationsModule,
    LeadDistributionModule,
    PurchaseFlowModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    },
    {
      provide: APP_GUARD,
      useClass: TermsGuard
    },
    {
      provide: APP_GUARD,
      useClass: PanelPermissionGuard
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
