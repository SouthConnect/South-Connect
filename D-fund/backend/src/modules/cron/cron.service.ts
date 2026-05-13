import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpportunityStatus, ReferralStatus } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Scheduled maintenance tasks: opportunity archival, boost expiry,
 * referral expiry, orphan draft cleanup, and nightly counter resync.
 *
 * In multi-instance deployments (Railway, Docker Swarm, k8s) every instance
 * runs the scheduler. A Redis distributed lock (SET NX EX) ensures only ONE
 * instance executes each job per schedule cycle. Without Redis the lock is
 * bypassed and a single instance is assumed (dev/test).
 */
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  /**
   * Acquires a short-lived distributed lock for the given cron job name.
   * Returns true if this instance won the lock and should execute.
   * Returns false if another instance already holds the lock.
   *
   * The lock TTL (5 min) is a hard ceiling: even if the job crashes without
   * releasing, the lock auto-expires so the next schedule cycle runs normally.
   */
  private async acquireLock(jobName: string, ttlSeconds = 300): Promise<boolean> {
    if (!this.redis) return true; // No Redis in dev/test — run on every instance
    const key = `cron:lock:${jobName}`;
    try {
      const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      // Redis error: on préfère une double-exécution occasionnelle à un job qui ne tourne jamais
      this.logger.error(`Lock acquisition failed for ${jobName} — running without lock`, err);
      Sentry.captureException(err, { tags: { cron: jobName, phase: 'lock_acquire' } });
      return true;
    }
  }

  private async releaseLock(jobName: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(`cron:lock:${jobName}`).catch(() => undefined);
  }

  /**
   * Runs `fn` only if this instance acquires the distributed lock.
   * Always releases the lock when `fn` completes (success or error).
   */
  private async withLock(jobName: string, fn: () => Promise<void>): Promise<void> {
    const acquired = await this.acquireLock(jobName);
    if (!acquired) {
      this.logger.debug(`Skipping ${jobName} — another instance holds the lock`);
      return;
    }
    try {
      await fn();
    } finally {
      await this.releaseLock(jobName);
    }
  }

  // ─── Jobs ─────────────────────────────────────────────────────────────────

  /** Archives opportunities whose expiration date has passed. Runs at 02:00 UTC. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveExpiredOpportunities() {
    await this.withLock('archiveExpiredOpportunities', async () => {
      const now = new Date();
      try {
        const { count } = await this.prisma.opportunity.updateMany({
          where: {
            expirationDate: { lt: now },
            status: { in: [OpportunityStatus.ACTIVE, OpportunityStatus.PENDING] },
          },
          data: { status: OpportunityStatus.ARCHIVED },
        });
        if (count > 0) {
          this.logger.log(`Archived ${count} expired opportunities`);
          // Stats cache reflects opportunity counts — must be invalidated after bulk archive
          if (this.redis) await this.redis.del('admin:stats').catch(() => undefined);
        }
      } catch (err) {
        this.logger.error('Failed to archive expired opportunities', err);
        Sentry.captureException(err, { tags: { cron: 'archiveExpiredOpportunities' } });
      }
    });
  }

  /** Clears the boosted flag on opportunities whose boost period expired. Runs at 02:15 UTC. */
  @Cron('15 2 * * *')
  async expireBoosts() {
    await this.withLock('expireBoosts', async () => {
      const now = new Date();
      try {
        const { count } = await this.prisma.opportunity.updateMany({
          where: { boosted: true, boostedUntil: { lt: now } },
          data: { boosted: false },
        });
        if (count > 0) this.logger.log(`Expired boost on ${count} opportunities`);
      } catch (err) {
        this.logger.error('Failed to expire opportunity boosts', err);
        Sentry.captureException(err, { tags: { cron: 'expireBoosts' } });
      }
    });
  }

  /** Marks ACTIVE referral codes older than 90 days as EXPIRED. Runs at 03:00 UTC. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireReferralCodes() {
    await this.withLock('expireReferralCodes', async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      try {
        const { count } = await this.prisma.referralCode.updateMany({
          where: { status: ReferralStatus.ACTIVE, createdAt: { lt: cutoff } },
          data: { status: ReferralStatus.EXPIRED },
        });
        if (count > 0) this.logger.log(`Expired ${count} referral codes`);
      } catch (err) {
        this.logger.error('Failed to expire referral codes', err);
        Sentry.captureException(err, { tags: { cron: 'expireReferralCodes' } });
      }
    });
  }

  /**
   * Deletes DRAFT opportunities not modified in the last 7 days.
   * 48 h was too aggressive — a user spending a weekend writing a draft
   * would silently lose their work.
   * Runs at 03:30 UTC.
   */
  @Cron('30 3 * * *')
  async cleanupOrphanDrafts() {
    await this.withLock('cleanupOrphanDrafts', async () => {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      try {
        const { count } = await this.prisma.opportunity.deleteMany({
          where: { status: OpportunityStatus.DRAFT, updatedAt: { lt: cutoff } },
        });
        if (count > 0) this.logger.log(`Deleted ${count} orphan DRAFT opportunities (>7 days)`);
      } catch (err) {
        this.logger.error('Failed to clean up orphan DRAFT opportunities', err);
        Sentry.captureException(err, { tags: { cron: 'cleanupOrphanDrafts' } });
      }
    });
  }

  /**
   * Re-syncs all denormalized counters from relational truth.
   * Fixes any drift accumulated by fire-and-forget increments, bulk deletes,
   * or partial failures. Runs at 04:00 UTC.
   *
   * Performance: N+1 queries for Industry/Feature/Discussion are replaced by
   * parallel batch fetches + single updateMany calls where possible.
   */
  @Cron('0 4 * * *')
  async recountAllCounters() {
    await this.withLock('recountAllCounters', async () => {
      try {
        await this._recountProfileCounters();
        await this._recountFollowerCounts();
        await this._recountOpportunityCounters();
        await this._recountIndustryFeatureCounters();
        await this._recountDiscussionMembersCount();
        this.logger.log('Full counter resync complete');
      } catch (err) {
        this.logger.error('Failed to resync counters', err);
        Sentry.captureException(err, { tags: { cron: 'recountAllCounters' } });
      }
    });
  }

  /**
   * Recomputes the trendingScore for all ACTIVE opportunities.
   * Formula: (likes*3 + applications*5 + saves*2 + views) / (ageInHours + 2)^1.5
   * The age dampener prevents old opportunities from dominating the trending list.
   * Runs every hour at minute 0.
   */
  @Cron('0 * * * *')
  async recomputeTrendingScores() {
    await this.withLock('recomputeTrendingScores', async () => {
      try {
        const opportunities = await this.prisma.opportunity.findMany({
          where: { status: OpportunityStatus.ACTIVE },
          select: {
            id: true,
            likesCount: true,
            applicationsCount: true,
            savedCount: true,
            viewsCount: true,
            createdAt: true,
          },
        });

        const now = Date.now();
        const BATCH = 20;

        for (let i = 0; i < opportunities.length; i += BATCH) {
          await Promise.all(
            opportunities.slice(i, i + BATCH).map(({ id, likesCount, applicationsCount, savedCount, viewsCount, createdAt }) => {
              const ageHours = (now - createdAt.getTime()) / 3_600_000;
              const score =
                (likesCount * 3 + applicationsCount * 5 + savedCount * 2 + viewsCount) /
                Math.pow(ageHours + 2, 1.5);
              return this.prisma.opportunity.update({ where: { id }, data: { trendingScore: score } });
            }),
          );
        }

        this.logger.log(`Trending scores recomputed for ${opportunities.length} active opportunities`);
      } catch (err) {
        this.logger.error('Failed to recompute trending scores', err);
        Sentry.captureException(err, { tags: { cron: 'recomputeTrendingScores' } });
      }
    });
  }

  // ─── Counter resync helpers ────────────────────────────────────────────────

  private async _recountProfileCounters() {
    const [totalGroups, activeGroups, profileUsers] = await Promise.all([
      this.prisma.opportunity.groupBy({ by: ['ownerId'], _count: { _all: true } }),
      this.prisma.opportunity.groupBy({
        by: ['ownerId'],
        where: { status: OpportunityStatus.ACTIVE },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { OR: [{ btoCProfile: { isNot: null } }, { btoBProfile: { isNot: null } }] },
        select: { id: true },
      }),
    ]);

    const totalMap  = new Map(totalGroups.map((r) => [r.ownerId, r._count._all]));
    const activeMap = new Map(activeGroups.map((r) => [r.ownerId, r._count._all]));

    await Promise.all(
      profileUsers.map(({ id }) =>
        Promise.all([
          this.prisma.btoCProfile.updateMany({
            where: { userId: id },
            data: {
              opportunitiesCount: totalMap.get(id) ?? 0,
              activeOpportunitiesCount: activeMap.get(id) ?? 0,
            },
          }),
          this.prisma.btoBProfile.updateMany({
            where: { userId: id },
            data: { opportunitiesCount: totalMap.get(id) ?? 0 },
          }),
        ]),
      ),
    );

    this.logger.debug(`Profile counters resynced for ${profileUsers.length} users`);
  }

  private async _recountFollowerCounts() {
    const followGroups = await this.prisma.follow.groupBy({
      by: ['followingId'],
      _count: { _all: true },
    });
    const followMap = new Map(followGroups.map((r) => [r.followingId, r._count._all]));

    const allUsers = await this.prisma.user.findMany({
      where: { OR: [{ btoCProfile: { isNot: null } }, { btoBProfile: { isNot: null } }] },
      select: { id: true },
    });

    for (let i = 0; i < allUsers.length; i += 20) {
      await Promise.all(
        allUsers.slice(i, i + 20).map(({ id }) =>
          Promise.all([
            this.prisma.btoCProfile.updateMany({
              where: { userId: id },
              data: { followersCount: followMap.get(id) ?? 0 },
            }),
            this.prisma.btoBProfile.updateMany({
              where: { userId: id },
              data: { followersCount: followMap.get(id) ?? 0 },
            }),
          ]),
        ),
      );
    }

    this.logger.debug(`followersCount resynced for ${allUsers.length} users`);
  }

  private async _recountOpportunityCounters() {
    const [likeGroups, saveGroups, appGroups] = await Promise.all([
      this.prisma.likedOpportunity.groupBy({ by: ['opportunityId'], _count: { _all: true } }),
      this.prisma.savedOpportunity.groupBy({ by: ['opportunityId'], _count: { _all: true } }),
      this.prisma.application.groupBy({
        by: ['opportunityId'],
        where: { isDraft: false },
        _count: { _all: true },
      }),
    ]);

    const likesMap = new Map(likeGroups.map((r) => [r.opportunityId, r._count._all]));
    const savesMap = new Map(saveGroups.map((r) => [r.opportunityId, r._count._all]));
    const appsMap  = new Map(appGroups.map((r)  => [r.opportunityId, r._count._all]));

    const allIds = [...new Set([...likesMap.keys(), ...savesMap.keys(), ...appsMap.keys()])];

    // Batch: run up to 20 updates concurrently to avoid overwhelming the pool
    for (let i = 0; i < allIds.length; i += 20) {
      await Promise.all(
        allIds.slice(i, i + 20).map((oppId) =>
          this.prisma.opportunity.updateMany({
            where: { id: oppId },
            data: {
              likesCount: likesMap.get(oppId) ?? 0,
              savedCount: savesMap.get(oppId) ?? 0,
              applicationsCount: appsMap.get(oppId) ?? 0,
            },
          }),
        ),
      );
    }

    this.logger.debug(`Opportunity counters resynced for ${allIds.length} items`);
  }

  private async _recountIndustryFeatureCounters() {
    const [allIndustries, allFeatures, featureGroups] = await Promise.all([
      this.prisma.industry.findMany({ select: { id: true, name: true } }),
      this.prisma.feature.findMany({ select: { id: true } }),
      this.prisma.opportunity.groupBy({ by: ['featureId'], _count: { _all: true } }),
    ]);

    // Industries: parallel count queries (one per industry — no raw SQL alternative with array fields)
    await Promise.all(
      allIndustries.map(async (industry) => {
        const count = await this.prisma.opportunity.count({
          where: { industries: { has: industry.name } },
        });
        await this.prisma.industry.update({ where: { id: industry.id }, data: { opportunitiesCount: count } });
      }),
    );

    // Features: one pass from groupBy
    const featureCountMap = new Map(
      featureGroups.filter((r) => r.featureId).map((r) => [r.featureId as string, r._count._all]),
    );
    await Promise.all(
      allFeatures.map(({ id }) =>
        this.prisma.feature.update({
          where: { id },
          data: { opportunitiesCount: featureCountMap.get(id) ?? 0 },
        }),
      ),
    );

    this.logger.debug(`Industry/Feature counters resynced`);
  }

  private async _recountDiscussionMembersCount() {
    const discussions = await this.prisma.publicDiscussion.findMany({ select: { id: true } });

    // Fetch all discussion like counts in one query (Rating model, itemId = 'discussion:<id>')
    const likeGroups = await this.prisma.rating.groupBy({
      by: ['itemId'],
      where: { itemId: { startsWith: 'discussion:' } },
      _count: { _all: true },
    });
    const likesMap = new Map(
      likeGroups.map((r) => [r.itemId.replace('discussion:', ''), r._count._all]),
    );

    // Batch: 20 concurrent findMany+update pairs
    for (let i = 0; i < discussions.length; i += 20) {
      await Promise.all(
        discussions.slice(i, i + 20).map(async ({ id }) => {
          const senders = await this.prisma.message.findMany({
            where: { publicDiscussionId: id },
            select: { senderId: true },
            distinct: ['senderId'],
          });
          await this.prisma.publicDiscussion.update({
            where: { id },
            data: {
              membersCount: senders.length,
              likesCount: likesMap.get(id) ?? 0,
            },
          });
        }),
      );
    }

    this.logger.debug(`Discussion membersCount + likesCount resynced for ${discussions.length} discussions`);
  }
}
