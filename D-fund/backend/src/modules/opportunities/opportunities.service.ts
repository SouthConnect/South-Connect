import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OpportunityStatus, Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { assertSameUser } from '../../common/authorization';
import { CreateOpportunityDto, ListOpportunitiesDto, SortEnum, UpdateOpportunityDto } from './dto';

const ADMIN_STATS_CACHE_KEY = 'admin:stats';
const ADMIN_STATS_TTL_SECONDS = 60;
const FEED_CACHE_PREFIX = 'opp:feed:v1';
const FEED_CACHE_TTL_SECONDS = 45;

/**
 * Manages opportunity lifecycle: creation, retrieval, update, deletion, and admin moderation.
 *
 * The public feed excludes DRAFT opportunities. Draft visibility is enforced per-owner:
 * only the owner (or an admin) may see their own drafts.
 */
@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  private async invalidateStatsCache() {
    if (this.redis)
      await this.redis
        .del(ADMIN_STATS_CACHE_KEY)
        .catch((err) => this.logger.warn(`Redis stats cache invalidation failed: ${err?.message}`));
  }

  private async invalidateFeedCache() {
    if (!this.redis) return;
    try {
      const keys: string[] = [];
      const stream = this.redis.scanStream({ match: `${FEED_CACHE_PREFIX}:*`, count: 100 });
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (batch: string[]) => {
          keys.push(...batch);
        });
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      if (keys.length)
        await this.redis
          .del(...keys)
          .catch((err) => this.logger.warn(`Redis feed cache del failed: ${err?.message}`));
    } catch {
      // Redis indisponible — le cache expirera naturellement (TTL 45s)
    }
  }

  /**
   * Invalidates the admin stats + public feed caches.
   *
   * Public so other modules that mutate denormalized Opportunity fields they
   * don't own (e.g. SocialService updating likesCount/savedCount) can keep
   * these caches in sync too, instead of the change only surfacing once the
   * TTL naturally expires.
   */
  async invalidateCaches() {
    await Promise.all([this.invalidateStatsCache(), this.invalidateFeedCache()]);
  }

  /**
   * Returns a paginated list of opportunities for the public feed.
   *
   * - Defaults to excluding DRAFT status when no explicit status filter is provided.
   * - Supports full-text search across name, punchline, description, and tags.
   * - Supports trending sort (combined social score) or newest-first (default).
   *
   * @returns `{ data, total, hasMore }` envelope.
   */
  /** Enriches opportunity items with isLiked/isSaved flags for the given user. Single bulk query per type. */
  private async attachSocialState<T extends { id: string }>(
    items: T[],
    userId: string,
  ): Promise<(T & { isLiked: boolean; isSaved: boolean })[]> {
    const ids = items.map((i) => i.id);
    const [liked, saved] = await Promise.all([
      this.prisma.likedOpportunity.findMany({
        where: { userId, opportunityId: { in: ids } },
        select: { opportunityId: true },
      }),
      this.prisma.savedOpportunity.findMany({
        where: { userId, opportunityId: { in: ids } },
        select: { opportunityId: true },
      }),
    ]);
    const likedSet = new Set(liked.map((l) => l.opportunityId));
    const savedSet = new Set(saved.map((s) => s.opportunityId));
    return items.map((item) => ({
      ...item,
      isLiked: likedSet.has(item.id),
      isSaved: savedSet.has(item.id),
    }));
  }

  async findAll(params?: ListOpportunitiesDto, requesterId?: string) {
    const {
      take: rawTake = 20,
      skip: rawSkip = 0,
      status,
      type,
      types,
      ownerId,
      search,
      sort,
      cursor,
      country,
      remote,
      createdAfter,
    } = params || {};
    const take = Math.min(Math.max(rawTake, 1), 100);
    const where: Prisma.OpportunityWhereInput = { deletedAt: null };

    // Public feed defaults to ACTIVE only. PENDING/ARCHIVED are excluded unless explicitly requested.
    // DRAFT is never exposed (owner-only drafts go through findByOwner).
    if (status && status !== OpportunityStatus.DRAFT) {
      where.status = status;
    } else {
      where.status = OpportunityStatus.ACTIVE;
    }

    if (types) {
      // Multi-type filter: comma-separated string from the frontend category chips
      const typeList = types
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (typeList.length === 1) {
        where.type = typeList[0] as any;
      } else if (typeList.length > 1) {
        where.type = { in: typeList as any[] };
      }
    } else if (type) {
      where.type = type;
    }
    if (ownerId) where.ownerId = ownerId;
    if (country) where.country = { equals: country, mode: 'insensitive' };
    if (remote !== undefined) where.remote = remote;
    if (createdAfter) where.createdAt = { gte: new Date(createdAfter) };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { punchline: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    // id as tiebreaker ensures stable cursor pagination even when trendingScore is equal
    const orderBy: Prisma.OpportunityOrderByWithRelationInput[] =
      sort === SortEnum.TRENDING
        ? [{ trendingScore: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }];

    // Cache first-page public feed in Redis (no cursor, no owner filter)
    const isCacheable = !cursor && !ownerId && this.redis;
    let feedCacheKey: string | null = null;
    if (isCacheable) {
      feedCacheKey = `${FEED_CACHE_PREFIX}:${JSON.stringify({ take, status: status ?? 'no-draft', type: type ?? '', types: types ?? '', search: search ?? '', sort: sort ?? '', country: country ?? '', remote: remote ?? '', createdAfter: createdAfter ?? '' })}`;
      const cached = await this.redis!.get(feedCacheKey).catch(() => null);
      if (cached) {
        const base = JSON.parse(cached);
        if (requesterId) {
          const enriched = await this.attachSocialState(base.data, requesterId);
          return { ...base, data: enriched };
        }
        return base;
      }
    }

    // Cursor-based path: no COUNT query, O(log n) lookup via index
    if (cursor) {
      const raw = await this.prisma.opportunity.findMany({
        take: take + 1,
        cursor: { id: cursor },
        skip: 1,
        orderBy,
        where,
        include: {
          owner: { select: { id: true, name: true, profilePic: true } },
        },
      });

      const hasNext = raw.length > take;
      const items = hasNext ? raw.slice(0, take) : raw;
      const nextCursor = hasNext ? items[items.length - 1].id : null;
      const data = requesterId ? await this.attachSocialState(items, requesterId) : items;

      return { data, nextCursor };
    }

    // Offset-based path (first page, admin, my-opportunities): keep total + hasMore
    const skip = Math.max(rawSkip, 0);
    // Skip COUNT for public feeds — the frontend uses hasMore (computed from take+1 trick)
    // and never renders a total. Only owner/admin views need the exact count.
    const isPublicFeed = !ownerId;
    const [items, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        take: take + 1,
        skip,
        orderBy,
        where,
        include: {
          owner: { select: { id: true, name: true, profilePic: true } },
        },
      }),
      isPublicFeed ? Promise.resolve(0) : this.prisma.opportunity.count({ where }),
    ]);

    const hasNext = items.length > take;
    const pageItems = hasNext ? items.slice(0, take) : items;
    const nextCursor = hasNext ? pageItems[pageItems.length - 1].id : null;
    const hasMore = isPublicFeed ? hasNext : skip + take < total;

    const result = {
      data: pageItems,
      total: isPublicFeed ? undefined : total,
      hasMore,
      nextCursor,
    };
    if (isCacheable && feedCacheKey) {
      this.redis!.setex(feedCacheKey, FEED_CACHE_TTL_SECONDS, JSON.stringify(result)).catch((err) =>
        this.logger.warn(`Redis feed cache write failed: ${err?.message}`),
      );
    }
    if (requesterId) {
      const enriched = await this.attachSocialState(pageItems, requesterId);
      return { ...result, data: enriched };
    }
    return result;
  }

  /**
   * Returns opportunities created by a specific owner.
   * Non-owners cannot see DRAFT opportunities from other users.
   *
   * @param ownerId     - ID of the user whose opportunities to retrieve.
   * @param params      - Optional filters and pagination.
   * @param requesterId - ID of the requesting user (used for draft visibility check).
   */
  async findByOwner(ownerId: string, params?: ListOpportunitiesDto, requesterId?: string) {
    const { take: rawTake = 20, skip: rawSkip = 0, status, type, search } = params || {};
    const take = Math.min(Math.max(rawTake, 1), 100);
    const skip = Math.max(rawSkip, 0);
    const where: Prisma.OpportunityWhereInput = { ownerId, deletedAt: null };

    if (requesterId !== ownerId) {
      // Non-owners can never see DRAFT opportunities, regardless of explicit status filter
      if (status && status !== OpportunityStatus.DRAFT) {
        where.status = status;
      } else {
        where.status = { not: OpportunityStatus.DRAFT };
      }
    } else {
      // Owner may filter by any status including DRAFT
      if (status) where.status = status;
    }

    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { punchline: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        where,
        include: {
          owner: { select: { id: true, name: true, profilePic: true } },
          _count: { select: { applications: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return { data, total, hasMore: skip + take < total };
  }

  /**
   * Returns a single opportunity by ID.
   *
   * DRAFT opportunities are only visible to their owner. When a `requesterId`
   * is provided, the response also includes that user's like/save state.
   *
   * @throws NotFoundException when the opportunity does not exist or is a DRAFT
   *         accessed by a non-owner.
   */
  async findOne(id: string, requesterId?: string, viewerKey?: string) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: {
        owner: { select: { id: true, name: true, profilePic: true } },
      },
    });

    if (!opportunity) throw new NotFoundException('Opportunity not found');

    if (opportunity.status === OpportunityStatus.DRAFT && opportunity.ownerId !== requesterId) {
      throw new NotFoundException('Opportunity not found');
    }

    let isLiked = false;
    let isSaved = false;

    if (requesterId) {
      const [liked, saved] = await Promise.all([
        this.prisma.likedOpportunity.findUnique({
          where: { userId_opportunityId: { userId: requesterId, opportunityId: id } },
        }),
        this.prisma.savedOpportunity.findUnique({
          where: { userId_opportunityId: { userId: requesterId, opportunityId: id } },
        }),
      ]);
      isLiked = !!liked;
      isSaved = !!saved;
    }

    // Fire-and-forget — view tracking never blocks the response
    if (viewerKey) {
      this.incrementViewsIfNew(id, viewerKey).catch((err) => {
        this.logger.warn(`viewsCount increment failed for ${id}: ${err?.message}`);
      });
    }

    return { ...opportunity, isLiked, isSaved };
  }

  /**
   * Increments viewsCount at most once per viewer per opportunity per 24 hours.
   *
   * Uses Redis SET NX EX to atomically mark a viewer as "seen" with a 24-hour TTL.
   * If Redis is unavailable (dev / no REDIS_URL) the view is always counted —
   * the nightly recount cron is the safety net against drift.
   *
   * viewerKey is the authenticated userId when present, otherwise the client IP.
   */
  private async incrementViewsIfNew(id: string, viewerKey: string): Promise<void> {
    if (this.redis) {
      const dedupKey = `views:${id}:${viewerKey}`;
      const isNew = await this.redis.set(dedupKey, '1', 'EX', 86400, 'NX').catch(() => 'OK');
      if (isNew !== 'OK') return; // Already counted this viewer today
    }
    await this.prisma.opportunity.updateMany({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });
  }

  /**
   * Increments the share counter once per user per day.
   * Returns { success: true } whether or not the counter was actually incremented
   * so the frontend cannot tell if the user already shared today.
   */
  async incrementShares(id: string, userId: string) {
    if (this.redis) {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const key = `share:${userId}:${id}:${today}`;
      const isNew = await this.redis.set(key, '1', 'EX', 86400, 'NX').catch(() => null);
      if (isNew !== 'OK') return { success: true }; // already shared today — no double-count
    }
    await this.prisma.opportunity.updateMany({
      where: { id },
      data: { sharedCount: { increment: 1 } },
    });
    return { success: true };
  }

  /** Creates a new opportunity owned by the given user. Defaults to ACTIVE (publishes immediately like LinkedIn). */
  async create(ownerId: string, dto: CreateOpportunityDto, role?: string) {
    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }
    const isAdmin = role === 'ADMIN';
    if (!isAdmin) {
      dto.boosted = false;
      dto.boostedUntil = undefined;
      dto.qualified = false;
    }
    // Non-admins can only create as DRAFT or ACTIVE. Defaults to ACTIVE (publish immediately).
    const allowedStatuses = ['DRAFT', 'ACTIVE'];
    const initialStatus = isAdmin
      ? (dto.status ?? 'ACTIVE')
      : allowedStatuses.includes(dto.status ?? '')
        ? dto.status!
        : 'ACTIVE';

    const result = await this.prisma.opportunity.create({
      data: {
        ownerId,
        name: dto.name,
        punchline: dto.punchline,
        description: dto.description,
        type: dto.type,
        status: initialStatus,
        featureId: dto.featureId,
        city: dto.city,
        country: dto.country,
        region: dto.region,
        remote: dto.remote,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        applicationProcessId: dto.applicationProcessId,
        needToCheckApplicant: dto.needToCheckApplicant ?? false,
        image: dto.image,
        backgroundImage: dto.backgroundImage,
        file: dto.file,
        url: dto.url,
        tags: dto.tags ?? [],
        industries: dto.industries ?? [],
        markets: dto.markets ?? [],
        price: dto.price,
        currency: dto.currency,
        pricingUnit: dto.pricingUnit,
        pricingDetails: dto.pricingDetails,
        aiGenerated: dto.aiGenerated ?? false,
        aiPrompt: dto.aiPrompt,
        aiOutput: dto.aiOutput,
        boosted: dto.boosted ?? false,
        boostedUntil: dto.boostedUntil ? new Date(dto.boostedUntil) : undefined,
        qualified: dto.qualified ?? false,
        referralAvailable: dto.referralAvailable ?? false,
        referralAmount: dto.referralAmount,
      },
      include: { owner: { select: { id: true, name: true, profilePic: true } } },
    });

    // Maintain denormalized counters (fire-and-forget; nightly recount cron corrects any drift)
    this.prisma.btoCProfile
      .updateMany({ where: { userId: ownerId }, data: { opportunitiesCount: { increment: 1 } } })
      .catch((err) => this.logger.warn(`Counter increment failed (btoCProfile): ${err.message}`));
    this.prisma.btoBProfile
      .updateMany({ where: { userId: ownerId }, data: { opportunitiesCount: { increment: 1 } } })
      .catch((err) => this.logger.warn(`Counter increment failed (btoBProfile): ${err.message}`));

    await this.invalidateCaches();
    return result;
  }

  /**
   * Admin-only: updates the status of an opportunity and sends notifications to the owner.
   *
   * - ACTIVE status triggers an approval in-app notification and email.
   * - ARCHIVED or CLOSED status triggers a rejection in-app notification.
   *
   * Notifications are fire-and-forget and do not block the response.
   *
   * @throws NotFoundException when the opportunity does not exist.
   */
  async adminUpdateStatus(id: string, status: OpportunityStatus) {
    const opportunity = await this.prisma.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: { owner: { select: { id: true, name: true, email: true, firstName: true } } },
    });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    const updated = await this.prisma.opportunity.update({
      where: { id },
      data: { status },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });

    // Maintain activeOpportunitiesCount on BtoCProfile
    const wasActive = opportunity.status === OpportunityStatus.ACTIVE;
    const becomesActive = status === OpportunityStatus.ACTIVE;
    if (!wasActive && becomesActive) {
      this.prisma.btoCProfile
        .updateMany({
          where: { userId: opportunity.ownerId },
          data: { activeOpportunitiesCount: { increment: 1 } },
        })
        .catch((err) => this.logger.warn(`Active counter increment failed: ${err.message}`));
    } else if (wasActive && !becomesActive) {
      this.prisma.btoCProfile
        .updateMany({
          where: { userId: opportunity.ownerId },
          data: { activeOpportunitiesCount: { decrement: 1 } },
        })
        .catch((err) => this.logger.warn(`Active counter decrement failed: ${err.message}`));
    }

    if (status === OpportunityStatus.ACTIVE) {
      this.notifications
        .createInApp(
          opportunity.ownerId,
          'OPPORTUNITY_APPROVED',
          `Votre opportunité "${opportunity.name}" a été approuvée`,
          'Elle est maintenant visible par toute la communauté.',
          `/opportunities/${id}`,
        )
        .catch((err) =>
          this.logger.warn(`Failed to send approval in-app notification: ${err.message}`),
        );

      if (opportunity.owner?.email) {
        this.notifications
          .sendOpportunityApprovedEmail(opportunity.owner, opportunity)
          .catch((err) => this.logger.warn(`Failed to send approval email: ${err.message}`));
      }
    } else if (status === OpportunityStatus.ARCHIVED || status === OpportunityStatus.CLOSED) {
      this.notifications
        .createInApp(
          opportunity.ownerId,
          'OPPORTUNITY_REJECTED',
          `Votre opportunité "${opportunity.name}" n'a pas été approuvée`,
          "Contactez l'équipe SouthConnect pour plus d'informations.",
          `/my-opportunities`,
        )
        .catch((err) =>
          this.logger.warn(`Failed to send rejection in-app notification: ${err.message}`),
        );

      if (opportunity.owner?.email) {
        this.notifications
          .sendOpportunityRejectedEmail(opportunity.owner, opportunity)
          .catch((err) => this.logger.warn(`Failed to send rejection email: ${err.message}`));
      }
    }

    await this.invalidateCaches();
    return updated;
  }

  /**
   * Admin-only: returns platform-wide statistics.
   * Cached in Redis for 60 seconds to avoid repeated heavy aggregation queries.
   */
  async adminGetStats() {
    if (this.redis) {
      const cached = await this.redis.get(ADMIN_STATS_CACHE_KEY).catch(() => null);
      if (cached) return JSON.parse(cached);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, newUsers, opportunityByStatus, totalApplications, newApplications] =
      await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { deletedAt: null, createdAt: { gte: thirtyDaysAgo } } }),
        this.prisma.opportunity.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.application.count({ where: { deletedAt: null, isDraft: false } }),
        this.prisma.application.count({
          where: { deletedAt: null, isDraft: false, createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

    const statusMap = Object.fromEntries(
      opportunityByStatus.map((row) => [row.status, (row._count as { _all?: number })._all ?? 0]),
    );

    const stats = {
      users: {
        total: totalUsers,
        newLast30Days: newUsers,
      },
      opportunities: {
        total: Object.values(statusMap).reduce((s: number, v) => s + (v as number), 0),
        byStatus: {
          DRAFT: statusMap['DRAFT'] ?? 0,
          PENDING: statusMap['PENDING'] ?? 0,
          ACTIVE: statusMap['ACTIVE'] ?? 0,
          ARCHIVED: statusMap['ARCHIVED'] ?? 0,
          CLOSED: statusMap['CLOSED'] ?? 0,
        },
      },
      applications: {
        total: totalApplications,
        newLast30Days: newApplications,
      },
    };

    if (this.redis) {
      this.redis
        .set(ADMIN_STATS_CACHE_KEY, JSON.stringify(stats), 'EX', ADMIN_STATS_TTL_SECONDS)
        .catch((err) => this.logger.warn(`Redis admin stats cache write failed: ${err?.message}`));
    }

    return stats;
  }

  /**
   * Admin-only: returns all opportunities with optional status and search filters.
   * Includes owner information and application count.
   */
  adminFindAll(params?: ListOpportunitiesDto) {
    const { take: rawTake = 50, skip: rawSkip = 0, status, search } = params || {};
    const take = Math.min(Math.max(rawTake, 1), 100);
    const skip = Math.max(rawSkip, 0);
    const where: Prisma.OpportunityWhereInput = { deletedAt: null };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { owner: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.opportunity.findMany({
      take,
      skip,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true, profilePic: true } },
      },
    });
  }

  /**
   * Updates an opportunity. Only the owner may update their own opportunity.
   *
   * @throws NotFoundException  when the opportunity does not exist.
   * @throws ForbiddenException when the requester is not the owner.
   */
  async update(id: string, ownerId: string, dto: UpdateOpportunityDto, role?: string) {
    const opportunity = await this.prisma.opportunity.findFirst({ where: { id, deletedAt: null } });

    if (!opportunity) throw new NotFoundException('Opportunity not found');
    assertSameUser(opportunity.ownerId, ownerId, 'You cannot update this opportunity');

    const isAdmin = role === 'ADMIN';
    if (!isAdmin) {
      delete dto.boosted;
      delete dto.boostedUntil;
      delete dto.qualified;
    }

    // Owners can freely move between DRAFT, ACTIVE, ARCHIVED.
    // PENDING (legacy validation queue) and CLOSED (admin-only lifecycle) stay restricted.
    const adminOnlyStatuses: string[] = ['PENDING', 'CLOSED'];
    if (!isAdmin && dto.status && adminOnlyStatuses.includes(dto.status)) {
      throw new ForbiddenException('Only an admin can set this status');
    }

    if (dto.startDate && dto.endDate && new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const result = await this.prisma.opportunity.update({
      where: { id },
      data: {
        name: dto.name,
        punchline: dto.punchline,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        featureId: dto.featureId,
        city: dto.city,
        country: dto.country,
        region: dto.region,
        remote: dto.remote,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        applicationProcessId: dto.applicationProcessId,
        needToCheckApplicant: dto.needToCheckApplicant,
        image: dto.image,
        backgroundImage: dto.backgroundImage,
        file: dto.file,
        url: dto.url,
        tags: dto.tags,
        industries: dto.industries,
        markets: dto.markets,
        price: dto.price,
        currency: dto.currency,
        pricingUnit: dto.pricingUnit,
        pricingDetails: dto.pricingDetails,
        aiGenerated: dto.aiGenerated,
        aiPrompt: dto.aiPrompt,
        aiOutput: dto.aiOutput,
        boosted: dto.boosted,
        boostedUntil: dto.boostedUntil ? new Date(dto.boostedUntil) : undefined,
        qualified: dto.qualified,
        referralAvailable: dto.referralAvailable,
        referralAmount: dto.referralAmount,
      },
    });
    await this.invalidateCaches();
    return result;
  }

  /**
   * Deletes an opportunity. Only the owner may delete their own opportunity.
   *
   * @throws NotFoundException  when the opportunity does not exist.
   * @throws ForbiddenException when the requester is not the owner.
   */
  async remove(id: string, ownerId: string) {
    const opportunity = await this.prisma.opportunity.findFirst({ where: { id, deletedAt: null } });

    if (!opportunity) throw new NotFoundException('Opportunity not found');
    assertSameUser(opportunity.ownerId, ownerId, 'You cannot delete this opportunity');

    await this.prisma.opportunity.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // Maintain denormalized counters
    const wasActive = opportunity.status === OpportunityStatus.ACTIVE;
    this.prisma.btoCProfile
      .updateMany({
        where: { userId: ownerId },
        data: {
          opportunitiesCount: { decrement: 1 },
          ...(wasActive ? { activeOpportunitiesCount: { decrement: 1 } } : {}),
        },
      })
      .catch((err) => this.logger.warn(`Counter decrement failed (btoCProfile): ${err.message}`));
    this.prisma.btoBProfile
      .updateMany({ where: { userId: ownerId }, data: { opportunitiesCount: { decrement: 1 } } })
      .catch((err) => this.logger.warn(`Counter decrement failed (btoBProfile): ${err.message}`));

    await this.invalidateCaches();
    return { id };
  }
}
