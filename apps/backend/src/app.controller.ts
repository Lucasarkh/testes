import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '@/infra/db/prisma.service';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';

@Controller()
@SkipThrottle()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Get('health')
  async health() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // Redis check
    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'ok');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      checks,
    };
  }
}
