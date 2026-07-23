import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Handles social interactions: follows, opportunity likes, and opportunity saves.
 *
 * Follower/following counts on BtoC and BtoB profiles are kept in sync
 * transactionally alongside the relation records.
 */
@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Returns whether the given follower is currently following the given user. */
  async isFollowing(followerId: string, followingId: string) {
    const record = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return { following: !!record };
  }

  /**
   * Creates a follow relationship between two users and increments the followee's
   * follower count (on whichever profile type exists).
   *
   * A fire-and-forget in-app notification is sent to the followee.
   *
   * @throws BadRequestException when a user attempts to follow themselves.
   * @throws NotFoundException when the target user does not exist.
   * @throws ConflictException when the relationship already exists.
   */
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const following = await this.prisma.user.findFirst({ where: { id: followingId, deletedAt: null } });
    if (!following) throw new NotFoundException('User to follow not found');

    try {
      await this.prisma.$transaction(async (tx) => {
        // Re-check inside the transaction to eliminate the TOCTOU window
        const existing = await tx.follow.findUnique({
          where: { followerId_followingId: { followerId, followingId } },
        });
        if (existing) throw new ConflictException('Already following this user');

        await tx.follow.create({ data: { followerId, followingId } });

        await Promise.all([
          tx.btoCProfile.updateMany({
            where: { userId: followingId },
            data: { followersCount: { increment: 1 } },
          }),
          tx.btoBProfile.updateMany({
            where: { userId: followingId },
            data: { followersCount: { increment: 1 } },
          }),
        ]);
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Already following this user');
      }
      throw err;
    }

    // Fire-and-forget: does not block the response
    const follower = await this.prisma.user.findUnique({ where: { id: followerId } });

    this.notifications
      .createInApp(
        followingId,
        'NEW_FOLLOWER',
        `${follower?.name ?? 'Un utilisateur'} a commencé à vous suivre`,
        undefined,
        `/profiles/${followerId}`,
      )
      .catch((err) => this.logger.warn(`Failed to send new-follower in-app notification: ${err?.message}`));

    if (follower) {
      this.notifications
        .sendNewFollowerEmail(follower, following)
        .catch((err) => this.logger.warn(`Failed to send new-follower email: ${err?.message}`));
    }

    return { message: 'User followed successfully' };
  }

  /** Removes a follow relationship and decrements the followee's follower count. Idempotent. */
  async unfollow(followerId: string, followingId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.follow.deleteMany({ where: { followerId, followingId } });
      if (deleted.count === 0) return; // already unfollowed — nothing to decrement

      await Promise.all([
        tx.btoCProfile.updateMany({
          where: { userId: followingId },
          data: { followersCount: { decrement: 1 } },
        }),
        tx.btoBProfile.updateMany({
          where: { userId: followingId },
          data: { followersCount: { decrement: 1 } },
        }),
      ]);
    });

    return { message: 'User unfollowed successfully' };
  }

  /** Returns the list of users following the given user, sorted by most recent. */
  async getFollowers(userId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 200);
    const cappedSkip = Math.max(skip, 0);
    const followers = await this.prisma.follow.findMany({
      where: { followingId: userId, follower: { deletedAt: null } },
      include: {
        follower: { select: { id: true, name: true, profilePic: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: cappedTake,
      skip: cappedSkip,
    });
    return followers.map((f) => f.follower);
  }

  /** Returns the list of users the given user is following, sorted by most recent. */
  async getFollowing(userId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 200);
    const cappedSkip = Math.max(skip, 0);
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId, following: { deletedAt: null } },
      include: {
        following: { select: { id: true, name: true, profilePic: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: cappedTake,
      skip: cappedSkip,
    });
    return following.map((f) => f.following);
  }

  /**
   * Likes an opportunity and increments its like counter atomically.
   *
   * @throws NotFoundException when the opportunity does not exist.
   * @throws ConflictException when the user has already liked the opportunity.
   */
  async likeOpportunity(userId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    // Skip the pre-check — rely on the DB unique constraint caught inside the transaction.
    // This eliminates the TOCTOU window between check and write.
    try {
      await this.prisma.$transaction([
        this.prisma.likedOpportunity.create({ data: { userId, opportunityId } }),
        this.prisma.opportunity.update({
          where: { id: opportunityId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Opportunity already liked');
      }
      throw err;
    }

    return { message: 'Opportunity liked successfully' };
  }

  /**
   * Removes a like from an opportunity and decrements its like counter atomically.
   * Idempotent: if the like does not exist, returns silently (no 404).
   * Uses deleteMany inside the transaction to eliminate the TOCTOU window
   * between a pre-check and the actual delete (fixes P2025 on concurrent unlike).
   */
  async unlikeOpportunity(userId: string, opportunityId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.likedOpportunity.deleteMany({
        where: { userId, opportunityId },
      });
      if (deleted.count === 0) return; // already unliked — idempotent, nothing to decrement

      // Guard against counter going negative due to historical data drift
      await tx.opportunity.updateMany({
        where: { id: opportunityId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
    });

    return { message: 'Opportunity unliked successfully' };
  }

  /**
   * Bookmarks an opportunity and increments its save counter atomically.
   *
   * @throws NotFoundException when the opportunity does not exist.
   * @throws ConflictException when the opportunity is already bookmarked by this user.
   */
  async saveOpportunity(userId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opportunity) throw new NotFoundException('Opportunity not found');

    try {
      await this.prisma.$transaction([
        this.prisma.savedOpportunity.create({ data: { userId, opportunityId } }),
        this.prisma.opportunity.update({
          where: { id: opportunityId },
          data: { savedCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Opportunity already saved');
      }
      throw err;
    }

    return { message: 'Opportunity saved successfully' };
  }

  /**
   * Removes an opportunity bookmark and decrements its save counter atomically.
   * Idempotent: if the bookmark does not exist, returns silently (no 404).
   * Uses deleteMany inside the transaction to eliminate the TOCTOU window
   * between a pre-check and the actual delete (fixes P2025 on concurrent unsave).
   */
  async unsaveOpportunity(userId: string, opportunityId: string) {
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.savedOpportunity.deleteMany({
        where: { userId, opportunityId },
      });
      if (deleted.count === 0) return; // already unsaved — idempotent

      await tx.opportunity.updateMany({
        where: { id: opportunityId, savedCount: { gt: 0 } },
        data: { savedCount: { decrement: 1 } },
      });
    });

    return { message: 'Opportunity unsaved successfully' };
  }

  /**
   * Likes a public discussion.
   * Uses the Rating model (itemId = 'discussion:<id>') for per-user deduplication
   * without requiring a new DB model or migration.
   *
   * @throws NotFoundException when the discussion does not exist.
   * @throws ConflictException when the user has already liked this discussion.
   */
  async likeDiscussion(userId: string, discussionId: string) {
    const discussion = await this.prisma.publicDiscussion.findUnique({ where: { id: discussionId } });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const ratingKey = `discussion:${discussionId}`;
    try {
      await this.prisma.$transaction([
        this.prisma.rating.create({ data: { itemId: ratingKey, userId, rating: 1 } }),
        this.prisma.publicDiscussion.update({ where: { id: discussionId }, data: { likesCount: { increment: 1 } } }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Discussion already liked');
      }
      throw err;
    }
    return { message: 'Discussion liked' };
  }

  /**
   * Removes the authenticated user's like from a public discussion.
   * Idempotent: if the like does not exist, returns silently (no 404).
   */
  async unlikeDiscussion(userId: string, discussionId: string) {
    const ratingKey = `discussion:${discussionId}`;
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.rating.deleteMany({
        where: { itemId: ratingKey, userId },
      });
      if (deleted.count === 0) return;

      await tx.publicDiscussion.updateMany({
        where: { id: discussionId, likesCount: { gt: 0 } },
        data: { likesCount: { decrement: 1 } },
      });
    });
    return { message: 'Discussion unliked' };
  }

  /** Returns whether the given user has liked a public discussion. */
  async isDiscussionLiked(userId: string, discussionId: string) {
    const ratingKey = `discussion:${discussionId}`;
    const record = await this.prisma.rating.findUnique({
      where: { itemId_userId: { itemId: ratingKey, userId } },
    });
    return { liked: !!record };
  }

  /** Returns opportunities bookmarked by the given user, sorted by most recently saved. */
  async getSavedOpportunities(userId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    const saved = await this.prisma.savedOpportunity.findMany({
      where: { userId },
      include: {
        opportunity: {
          include: { owner: { select: { id: true, name: true, profilePic: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: cappedTake,
      skip: cappedSkip,
    });
    return saved.map((s) => s.opportunity);
  }
}
