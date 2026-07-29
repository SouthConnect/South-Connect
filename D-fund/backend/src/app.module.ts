import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { MessagesModule } from './modules/messages/messages.module';
import { SocialModule } from './modules/social/social.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StorageModule } from './modules/storage/storage.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReferralModule } from './modules/referral/referral.module';
import { SearchModule } from './modules/search/search.module';
import { HealthModule } from './modules/health/health.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { MarketsModule } from './modules/markets/markets.module';
import { FeaturesModule } from './modules/features/features.module';
import { AiModule } from './modules/ai/ai.module';
import { CronModule } from './modules/cron/cron.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    /**
     * Named throttler profiles — applied globally by ThrottlerGuard.
     * Per-route overrides reference these names via @Throttle({ <name>: {} }).
     *
     *  default   — general API traffic (100 req / min)
     *  auth      — login/register/reset (5 req / min) — brute-force protection
     *  refresh   — POST /auth/refresh only (20 req / min) — higher than `auth`
     *              because legitimate multi-tab wake-up bursts can hit 5/min
     *              without any attack involved; brute-force on refresh is
     *              already mitigated by single-use token rotation.
     *  strict    — password-reset (3 req / min)
     *  messaging — chat message creation (30 req / min)
     *
     * In the test environment all limits are set very high so E2E tests are
     * never blocked by rate limiting.
     */
    ThrottlerModule.forRootAsync({
      // P0 — storage Redis pour que le rate-limit soit global sur toutes les instances
      // (sans Redis, chaque instance a son propre compteur → bypass en multi-pod)
      useFactory: () => ({
        throttlers:
          process.env.NODE_ENV === 'test'
            ? [
                { name: 'default', ttl: 60_000, limit: 10_000 },
                { name: 'auth', ttl: 60_000, limit: 10_000 },
                { name: 'refresh', ttl: 60_000, limit: 10_000 },
                { name: 'strict', ttl: 60_000, limit: 10_000 },
                { name: 'messaging', ttl: 60_000, limit: 10_000 },
              ]
            : [
                { name: 'default', ttl: 60_000, limit: 100 },
                { name: 'auth', ttl: 60_000, limit: 5 },
                { name: 'refresh', ttl: 60_000, limit: 20 },
                { name: 'strict', ttl: 60_000, limit: 3 },
                { name: 'messaging', ttl: 60_000, limit: 30 },
              ],
        // In test mode use in-memory storage so each NestJS test app starts with
        // fresh counters — prevents Redis state from accumulating across suites.
        storage:
          process.env.NODE_ENV !== 'test' && process.env.REDIS_URL
            ? new ThrottlerStorageRedisService(process.env.REDIS_URL)
            : undefined,
      }),
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OpportunitiesModule,
    ApplicationsModule,
    ProfilesModule,
    MessagesModule,
    SocialModule,
    NotificationsModule,
    StorageModule,
    TasksModule,
    ReferralModule,
    SearchModule,
    HealthModule,
    FeedbackModule,
    RatingsModule,
    IndustriesModule,
    MarketsModule,
    FeaturesModule,
    AiModule,
    CronModule,
    AuditModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
