import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralType, ReferralStatus } from '@prisma/client';

@Injectable()
export class ReferralService {
  constructor(private readonly prisma: PrismaService) {}

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
      stats: {
        totalCodes: codes.length,
        totalReferrals,
        totalPotentialAmount,
        totalEarned,
      },
    };
  }

  async create(userId: string, opportunityId?: string, type?: ReferralType) {
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

  async findByCode(code: string) {
    const referral = await this.prisma.referralCode.findUnique({
      where: { code },
      include: {
        owner: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
      },
    });
    if (!referral) throw new NotFoundException('Referral code not found');
    return referral;
  }

  private generateCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}
