import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'CHANGE_ROLE'
  | 'DELETE_USER'
  | 'APPROVE_OPPORTUNITY'
  | 'REJECT_OPPORTUNITY'
  | 'ARCHIVE_OPPORTUNITY';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(adminId: string, action: AuditAction, targetId?: string, targetType?: string, details?: string) {
    return this.prisma.adminAuditLog
      .create({
        data: { adminId, action, targetId, targetType, details },
      })
      .catch(() => undefined);
  }

  findAll(take = 50, skip = 0) {
    return this.prisma.adminAuditLog.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
