import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
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
    const totalPotentialAmount = codes.reduce((sum, c) => sum + (c.potentialAmount ?? 0), 0);
    const totalEarned = codes
      .filter((c) => c.status === ReferralStatus.COMPLETED)
      .reduce((sum, c) => sum + (c.amount ?? 0), 0);

    return {
      codes,
      stats: { totalCodes: codes.length, totalReferrals, totalPotentialAmount, totalEarned },
    };
  }

  /** Creates a new referral code for the given user, optionally linked to an opportunity. */
  create(userId: string, opportunityId?: string, type?: ReferralType) {
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
