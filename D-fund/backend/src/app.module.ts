import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { UserAwareThrottlerGuard } from './common/guards/user-aware-throttler.guard';
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
     * A SINGLE named throttler profile ('default'), deliberately.
     *
     * @nestjs/throttler evaluates EVERY named profile registered here against
     * EVERY route on EVERY request, regardless of which one a route's
     * @Throttle() decorator names — a route only opts out of a profile via
     * @SkipThrottle({ <name>: true }), which this codebase never uses. With
     * six named profiles (default/auth/oauth/refresh/strict/messaging) that
     * used to live here, EVERY endpoint was actually governed by the SMALLEST
     * of all six limits — the 3 req/min meant only for a handful of sensitive
     * routes (delete-account, password-reset...) — no matter what its own
     * @Throttle override said. That's what caused opportunities/notifications
     * to intermittently look "empty" or hang under real traffic: normal
     * navigation trivially exceeds 3 requests/min to a given endpoint once
     * you count retries, polling, and pagination.
     *
     * Fix: one profile, full stop. Every route's desired limit is now a
     * literal override — @Throttle({ default: { limit: X, ttl: 60_000 } }) —
     * on this SAME 'default' name. There is no second profile left to stack
     * with it, so this class of bug cannot recur. If a route ever needs a
     * genuinely different rate limit, change ITS OWN override; do not add
     * another named profile here unless you also audit every existing route
     * with @SkipThrottle for the new name.
     *
     * Tracking is per authenticated user (not per IP) via
     * UserAwareThrottlerGuard (common/guards/user-aware-throttler.guard.ts),
     * which verifies the access_token cookie and falls back to IP only for
     * anonymous requests — so a household or CGNAT-shared IP no longer
     * shares one budget across unrelated users. Pre-auth routes (login,
     * OAuth) have no user yet and are necessarily IP-based.
     *
     * In the test environment the limit is set very high so E2E tests are
     * never blocked by rate limiting.
     */
    ThrottlerModule.forRootAsync({
      // P0 — storage Redis pour que le rate-limit soit global sur toutes les instances
      // (sans Redis, chaque instance a son propre compteur → bypass en multi-pod)
      useFactory: () => ({
        throttlers:
          process.env.NODE_ENV === 'test'
            ? [{ name: 'default', ttl: 60_000, limit: 10_000 }]
            : [{ name: 'default', ttl: 60_000, limit: 150 }],
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
      useClass: UserAwareThrottlerGuard,
    },
  ],
})
export class AppModule {}
