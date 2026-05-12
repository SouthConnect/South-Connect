import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Fields returned for any public-facing user lookup.
 * The password hash is never included.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  bio: true,
  profilePic: true,
  phone: true,
  city: true,
  country: true,
  linkedinUrl: true,
  website: true,
  visibility: true,
  role: true,
  isBanned: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
  btoCProfile: true,
  btoBProfile: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Returns a user's public profile by ID. Returns null for deleted or not-found users. */
  findOne(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_PUBLIC_SELECT,
    });
  }

  /**
   * Returns the full user record including the password hash.
   * For internal use only (e.g. authentication); never expose to API consumers.
   */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Updates the authenticated user's editable fields and returns the updated public profile. */
  async updateMe(userId: string, dto: UpdateUserDto) {
    // If firstName or lastName changes, recompute the composite name field so
    // the sidebar, profiles list and search always display a consistent name.
    let computedName: string | undefined
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const first = dto.firstName ?? current?.firstName ?? ''
      const last  = dto.lastName  ?? current?.lastName  ?? ''
      computedName = `${first} ${last}`.trim() || undefined
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto, ...(computedName !== undefined ? { name: computedName } : {}) },
      select: USER_PUBLIC_SELECT,
    });
  }

  /** Updates the authenticated user's profile picture URL and returns the updated public profile. */
  updateProfilePic(userId: string, profilePic: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profilePic },
      select: USER_PUBLIC_SELECT,
    });
  }

  // ── Admin methods ────────────────────────────────────────────────────────────

  /**
   * Returns a paginated list of all users for admin management.
   * Results include ban status and email verification state.
   */
  adminFindAll(params: { take?: number; skip?: number; search?: string }) {
    const { take = 50, skip = 0, search } = params;
    const where = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.user.findMany({
        take: Math.min(take, 100),
        skip,
        where,
        orderBy: { createdAt: 'desc' },
        select: USER_PUBLIC_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]).then(([data, total]) => ({ data, total }));
  }

  /**
   * Updates the role of a user.
   *
   * @throws NotFoundException when the user does not exist.
   */
  async adminUpdateRole(id: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: { role }, select: USER_PUBLIC_SELECT });
  }

  /**
   * Bans or unbans a user.
   *
   * @throws NotFoundException when the user does not exist.
   */
  async adminSetBan(id: string, isBanned: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({ where: { id }, data: { isBanned }, select: USER_PUBLIC_SELECT });
  }

  /**
   * GDPR Article 20 — data portability export.
   * Returns all personal data for the requesting user as a structured JSON object.
   * Sensitive internal fields (password hash, tokens) are excluded.
   */
  async exportMyData(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true, email: true, name: true, firstName: true, lastName: true,
        bio: true, profilePic: true, phone: true, city: true, country: true,
        linkedinUrl: true, website: true, visibility: true, role: true,
        isEmailVerified: true, emailOptOut: true, createdAt: true, updatedAt: true,
        btoCProfile: true,
        btoBProfile: true,
        opportunities: {
          select: { id: true, name: true, type: true, status: true, createdAt: true },
        },
        applications: {
          select: {
            id: true, stage: true, isDraft: true,
            createdAt: true, updatedAt: true,
            opportunity: { select: { id: true, name: true } },
          },
        },
        sentMessages: {
          select: { id: true, content: true, createdAt: true },
          take: 500,
          orderBy: { createdAt: 'desc' },
        },
        savedOpportunities: {
          select: { opportunityId: true, createdAt: true },
        },
        likedOpportunities: {
          select: { opportunityId: true, createdAt: true },
        },
        notifications: {
          select: { id: true, type: true, title: true, body: true, isRead: true, createdAt: true },
          take: 200,
          orderBy: { createdAt: 'desc' },
        },
        referralCodes: {
          select: { code: true, usesCount: true, createdAt: true },
        },
        followers: {
          select: { followerId: true, createdAt: true },
        },
        following: {
          select: { followingId: true, createdAt: true },
        },
        ratings: {
          select: { rating: true, createdAt: true },
        },
        tasks: {
          select: { id: true, name: true, status: true, createdAt: true },
        },
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      data: user,
    };
  }

  /**
   * Soft-deletes a user account by setting deletedAt. The row is retained so
   * that foreign-key references (applications, messages) remain intact.
   *
   * @throws NotFoundException when the user does not exist.
   */
  async adminDelete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
