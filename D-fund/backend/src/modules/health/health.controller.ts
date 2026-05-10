import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async check() {
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ]);
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }
}
