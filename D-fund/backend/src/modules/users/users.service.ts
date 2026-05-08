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

  /** Returns a user's public profile by ID. Returns null when not found. */
  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_SELECT });
  }

  /**
   * Returns the full user record including the password hash.
   * For internal use only (e.g. authentication); never expose to API consumers.
   */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Updates the authenticated user's editable fields and returns the updated public profile. */
  updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto, select: USER_PUBLIC_SELECT });
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
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : undefined;

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
   * Permanently deletes a user account and all associated data (cascade).
   *
   * @throws NotFoundException when the user does not exist.
   */
  async adminDelete(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
