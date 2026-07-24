import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBtoCProfileDto, UpdateBtoBProfileDto } from './dto';

/**
 * Manages user profiles: individual (BtoC) and company (BtoB).
 */
@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns the full profile for a given user, including BtoC and BtoB sub-profiles.
   *
   * Private profiles (visibility = false) are only accessible to the owner or an admin.
   *
   * @param userId      - ID of the user whose profile is requested.
   * @param requesterId - ID of the requesting user (optional, for visibility check).
   * @param requesterRole - Role of the requesting user (optional, 'ADMIN' bypasses visibility).
   * @returns User profile or null when the user does not exist.
   * @throws NotFoundException when the profile is private and the requester is not authorised.
   */
  async findByUserId(userId: string, requesterId?: string, requesterRole?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
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
        createdAt: true,
        updatedAt: true,
        btoCProfile: true,
        btoBProfile: true,
      },
    });

    if (!user) return null;

    if (!user.visibility && user.id !== requesterId && requesterRole !== 'ADMIN') {
      throw new NotFoundException('Profile not found');
    }

    // Strip PII pour les requêtes publiques — seuls owner et admin voient email + phone
    if (requesterId !== userId && requesterRole !== 'ADMIN') {
      const { email: _email, phone: _phone, ...publicProfile } = user;
      return publicProfile;
    }

    return user;
  }

  /**
   * Returns a paginated list of individual (BtoC) talent profiles, sorted by creation date.
   *
   * @param take - Maximum number of records to return (capped by the caller).
   * @param skip - Number of records to skip for pagination.
   */
  listTalents(take = 30, skip = 0) {
    return this.prisma.btoCProfile.findMany({
      where: { user: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, city: true, country: true, bio: true },
        },
      },
    });
  }

  /**
   * Returns a paginated list of company (BtoB) profiles, sorted by creation date.
   *
   * @param take - Maximum number of records to return (capped by the caller).
   * @param skip - Number of records to skip for pagination.
   */
  listCompanies(take = 30, skip = 0) {
    return this.prisma.btoBProfile.findMany({
      where: { user: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        user: {
          select: { id: true, name: true, profilePic: true, city: true, country: true },
        },
      },
    });
  }

  /**
   * Creates or updates an individual (BtoC) profile.
   * Uses upsert so users who signed up before the automatic profile creation
   * was introduced can still save their profile without receiving a 404.
   */
  async updateBtoCProfile(userId: string, dto: UpdateBtoCProfileDto) {
    const data = {
      description: dto.description,
      tags: dto.tags ?? [],
      industries: dto.industries ?? [],
      marketFocus: dto.marketFocus ?? [],
      languages: dto.languages ?? [],
      businessSkills: dto.businessSkills ?? [],
      techSkills: dto.techSkills ?? [],
      seniorityLevel: dto.seniorityLevel,
      lookingForOpportunities: dto.lookingForOpportunities,
      remote: dto.remote,
      countries: dto.countries ?? [],
      regions: dto.regions ?? [],
      opportunityTypes: dto.opportunityTypes ?? [],
    };

    return this.prisma.btoCProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: {
        user: { select: { id: true, name: true, email: true, profilePic: true } },
      },
    });
  }

  /**
   * Creates or updates a company (BtoB) profile.
   * Uses upsert so users who signed up before the automatic profile creation
   * was introduced can still save their company profile without receiving a 404.
   */
  async updateBtoBProfile(userId: string, dto: UpdateBtoBProfileDto) {
    const data = {
      companyName: dto.companyName ?? '',
      logo: dto.logo,
      headerImage: dto.headerImage,
      punchline: dto.punchline,
      description: dto.description,
      longDescription: dto.longDescription,
      website: dto.website,
      linkedinUrl: dto.linkedinUrl,
      city: dto.city,
      country: dto.country,
      foundationDate: dto.foundationDate ? new Date(dto.foundationDate) : undefined,
      developmentStage: dto.developmentStage,
      industries: dto.industries ?? [],
      marketFocus: dto.marketFocus ?? [],
    };

    return this.prisma.btoBProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
      include: {
        user: { select: { id: true, name: true, email: true, profilePic: true } },
      },
    });
  }

  /**
   * Returns a paginated list of all publicly visible users, including their BtoC/BtoB
   * sub-profiles when they exist.
   *
   * @param take - Maximum number of records to return (capped by the caller).
   * @param skip - Number of records to skip for pagination.
   */
  listMembers(take = 30, skip = 0, search?: string) {
    const q = search?.trim();
    return this.prisma.user.findMany({
      where: {
        visibility: true,
        deletedAt: null,
        ...(q && q.length >= 2
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { bio: { contains: q, mode: 'insensitive' } },
                { btoBProfile: { companyName: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        name: true,
        bio: true,
        profilePic: true,
        city: true,
        country: true,
        createdAt: true,
        btoCProfile: {
          select: { tags: true, industries: true, seniorityLevel: true, followersCount: true },
        },
        btoBProfile: {
          select: { companyName: true, punchline: true, logo: true, followersCount: true },
        },
      },
    });
  }
}
