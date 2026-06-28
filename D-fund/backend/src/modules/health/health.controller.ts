import { Controller, Get, Inject, Optional, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  /** Liveness probe — le process tourne. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /**
   * Readiness probe — vérifie DB + Redis.
   * Retourne 200 uniquement si toutes les dépendances critiques répondent.
   * Un load-balancer / Kubernetes retire le pod du pool si cette route échoue.
   */
  @Get()
  @Get('ready')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async check(@Res() res: Response) {
    const checks: Record<string, 'ok' | 'error'> = {};

    // DB
    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2_000)),
      ]);
      checks.db = 'ok';
    } catch {
      checks.db = 'error';
    }

    // Redis
    if (this.redis) {
      try {
        await Promise.race([
          this.redis.ping(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1_000)),
        ]);
        checks.redis = 'ok';
      } catch {
        checks.redis = 'error';
      }
    } else {
      checks.redis = 'ok'; // Redis optionnel — pas un bloquant
    }

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'error', checks });
  }
}
