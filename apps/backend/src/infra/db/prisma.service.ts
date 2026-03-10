import {
  Global,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

// In production with PgBouncer / connection pooler, append to DATABASE_URL:
// ?pgbouncer=true&connection_limit=1
// This prevents Prisma from opening more connections than the pool allows.

@Global()
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' }
      ]
    });
  }

  async onModuleInit() {
    await this.$connect();

    if (process.env.NODE_ENV === 'development') {
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 200) {
          this.logger.warn(
            `[Slow Query] ${e.duration}ms — ${e.query.slice(0, 200)}`
          );
        }
      });
    } else {
      // In production, only log queries that are critically slow (>2s)
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 2000) {
          this.logger.error(
            `[Critical Slow Query] ${e.duration}ms — ${e.query.slice(0, 200)}`
          );
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
