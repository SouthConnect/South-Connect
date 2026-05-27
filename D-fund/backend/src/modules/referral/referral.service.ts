import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralType, ReferralStatus } from '@prisma/client';

/** Manages referral codes and tracks usage statistics. */
@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all referral codes for a user along with aggregated stats
   * (total referrals, potential earnings, and completed earnings).
   */
  async findAllForUser(userId: string) {
    const codes = await this.prisma.referralCode.findMany({
      where: { ownerId: userId },
      include: { opportunity: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const totalReferrals = codes.reduce((sum, c) => sum + c.usesCount, 0);
    const totalPotentialAmount = codes.reduce(
      (sum, c) => sum.add(c.potentialAmount ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0),
    );
    const totalEarned = codes
      .filter((c) => c.status === ReferralStatus.COMPLETED)
      .reduce(
        (sum, c) => sum.add(c.amount ?? new Prisma.Decimal(0)),
        new Prisma.Decimal(0),
      );

    return {
      codes,
      stats: {
        totalCodes: codes.length,
        totalReferrals,
        totalPotentialAmount: totalPotentialAmount.toNumber(),
        totalEarned: totalEarned.toNumber(),
      },
    };
  }

  /** Creates a new referral code for the given user, optionally linked to an opportunity. */
  async create(userId: string, opportunityId?: string, type?: ReferralType) {
    const count = await this.prisma.referralCode.count({ where: { ownerId: userId } });
    if (count >= 50) throw new BadRequestException('Limite de 50 codes de parrainage atteinte');

    if (opportunityId) {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { ownerId: true },
      });
      if (!opportunity || opportunity.ownerId !== userId) {
        throw new ForbiddenException('Vous ne pouvez créer un code que pour vos propres opportunités');
      }
    }
    const code = this.generateCode();
    return this.prisma.referralCode.create({
      data: {
        code,
        ownerId: userId,
        opportunityId: opportunityId ?? undefined,
        type: type ?? ReferralType.NEW_USER,
        status: ReferralStatus.ACTIVE,
      },
      include: { opportunity: { select: { id: true, name: true } } },
    });
  }

  /**
   * Looks up a referral code and returns it with owner and opportunity details.
   *
   * @throws NotFoundException when no code matches.
   */
  async findByCode(code: string) {
    const referral = await this.prisma.referralCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        type: true,
        status: true,
        usesCount: true,
        createdAt: true,
        owner: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });
    if (!referral) throw new NotFoundException('Referral code not found');
    return referral;
  }

  /** Generates a cryptographically random 10-character uppercase hex code. */
  private generateCode(): string {
    return randomBytes(5).toString('hex').toUpperCase();
  }
}
