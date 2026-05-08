import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpportunityStatus, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tâches planifiées qui s'exécutent en arrière-plan pour maintenir
 * la cohérence des données (expiration des opportunités, des boosts,
 * et des codes de parrainage).
 */
@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Archive les opportunités dont la date d'expiration est dépassée.
   * S'exécute toutes les nuits à 02h00 UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async archiveExpiredOpportunities() {
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
      }
    } catch (err) {
      this.logger.error('Failed to archive expired opportunities', err);
    }
  }

  /**
   * Désactive le boost des opportunités dont le boost a expiré.
   * S'exécute toutes les nuits à 02h15 UTC.
   */
  @Cron('15 2 * * *')
  async expireBoosts() {
    const now = new Date();
    try {
      const { count } = await this.prisma.opportunity.updateMany({
        where: {
          boosted: true,
          boostedUntil: { lt: now },
        },
        data: { boosted: false },
      });
      if (count > 0) {
        this.logger.log(`Expired boost on ${count} opportunities`);
      }
    } catch (err) {
      this.logger.error('Failed to expire opportunity boosts', err);
    }
  }

  /**
   * Marque comme EXPIRED les codes de parrainage ACTIVE créés il y a plus de 90 jours.
   * S'exécute toutes les nuits à 03h00 UTC.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireReferralCodes() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    try {
      const { count } = await this.prisma.referralCode.updateMany({
        where: {
          status: ReferralStatus.ACTIVE,
          createdAt: { lt: cutoff },
        },
        data: { status: ReferralStatus.EXPIRED },
      });
      if (count > 0) {
        this.logger.log(`Expired ${count} referral codes`);
      }
    } catch (err) {
      this.logger.error('Failed to expire referral codes', err);
    }
  }
}
