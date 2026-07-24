import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

/**
 * Manages ratings on items (opportunities, user profiles).
 *
 * Uses an upsert strategy so a user can call the endpoint multiple times —
 * the last value wins. After each write, the `avgRating` and `roundedRating`
 * fields on the associated BtoCProfile are recomputed if the itemId matches a
 * user ID.
 */
@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates or updates the caller's rating for a given item.
   * Returns the full statistics for the item after the update.
   */
  async upsert(userId: string, dto: CreateRatingDto) {
    if (dto.itemId === userId) {
      throw new BadRequestException('You cannot rate yourself');
    }

    // Vérifier que l'itemId correspond à un User ou une Opportunity existante
    const [targetUser, targetOpportunity] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.itemId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.opportunity.findUnique({ where: { id: dto.itemId }, select: { id: true } }),
    ]);
    if (!targetUser && !targetOpportunity) {
      throw new NotFoundException('Rated item not found');
    }

    await this.prisma.rating.upsert({
      where: { itemId_userId: { itemId: dto.itemId, userId } },
      create: { itemId: dto.itemId, userId, rating: dto.rating },
      update: { rating: dto.rating },
    });

    await this.recomputeProfileRating(dto.itemId);

    return this.getStats(dto.itemId);
  }

  /**
   * Returns aggregate statistics for a given item.
   *
   * @throws NotFoundException when no ratings exist for the item.
   */
  async getStats(itemId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { itemId },
      _avg: { rating: true },
      _count: { _all: true },
    });

    return {
      itemId,
      avgRating: agg._avg.rating ?? 0,
      roundedRating: agg._avg.rating ? Math.round(agg._avg.rating) : 0,
      totalRatings: agg._count._all,
    };
  }

  /**
   * Returns the authenticated user's own rating for a given item, or null.
   */
  getMyRating(itemId: string, userId: string) {
    return this.prisma.rating.findUnique({
      where: { itemId_userId: { itemId, userId } },
      select: { rating: true, createdAt: true, updatedAt: true },
    });
  }

  /**
   * Removes the caller's rating for a given item.
   *
   * @throws NotFoundException when the rating does not exist.
   */
  async remove(itemId: string, userId: string) {
    const existing = await this.prisma.rating.findUnique({
      where: { itemId_userId: { itemId, userId } },
    });
    if (!existing) throw new NotFoundException('Rating not found');

    await this.prisma.rating.delete({
      where: { itemId_userId: { itemId, userId } },
    });

    await this.recomputeProfileRating(itemId);

    return { success: true };
  }

  /**
   * Recomputes and persists `avgRating` + `roundedRating` on the BtoCProfile
   * when the rated item is a user ID.
   */
  private async recomputeProfileRating(itemId: string) {
    const profile = await this.prisma.btoCProfile.findUnique({ where: { userId: itemId } });
    if (!profile) return;

    const agg = await this.prisma.rating.aggregate({
      where: { itemId },
      _avg: { rating: true },
    });

    await this.prisma.btoCProfile.update({
      where: { userId: itemId },
      data: {
        avgRating: agg._avg.rating ?? null,
        roundedRating: agg._avg.rating ? Math.round(agg._avg.rating) : null,
      },
    });
  }
}
