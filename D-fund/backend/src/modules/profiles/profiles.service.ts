import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBtoCProfileDto, UpdateBtoBProfileDto } from './dto';

/**
 * Service de gestion des profils utilisateurs
 * Gère les profils BtoC (talents) et BtoB (entreprises)
 */
@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Récupère le profil complet d'un utilisateur
   * Inclut les profils BtoC et BtoB s'ils existent
   * @param userId - Identifiant de l'utilisateur
   * @returns Utilisateur avec ses profils associés
   */
  async findByUserId(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        btoCProfile: true,
        btoBProfile: true,
      },
    });
  }

  /**
   * Liste tous les profils talents (BtoC)
   * Triés par date de création décroissante
   * @returns Liste des profils talents avec leurs utilisateurs associés
   */
  async listTalents() {
    return this.prisma.btoCProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      },
    });
  }

  /**
   * Liste tous les profils entreprises (BtoB)
   * Triés par date de création décroissante
   * @returns Liste des profils entreprises avec leurs utilisateurs associés
   */
  async listCompanies() {
    return this.prisma.btoBProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
      },
    });
  }

  /**
   * Met à jour un profil talent (BtoC)
   * Vérifie que le profil existe et que l'utilisateur a les permissions
   * @param userId - Identifiant de l'utilisateur propriétaire du profil
   * @param dto - Données de mise à jour
   * @returns Profil mis à jour avec informations utilisateur
   * @throws NotFoundException si le profil n'existe pas
   * @throws ForbiddenException si l'utilisateur n'a pas les permissions
   */
  async updateBtoCProfile(userId: string, dto: UpdateBtoCProfileDto) {
    const profile = await this.prisma.btoCProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('BtoC profile not found');
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException('You cannot update this profile');
    }

    return this.prisma.btoCProfile.update({
      where: { userId },
      data: {
        description: dto.description,
        tags: dto.tags,
        industries: dto.industries,
        marketFocus: dto.marketFocus,
        languages: dto.languages,
        businessSkills: dto.businessSkills,
        techSkills: dto.techSkills,
        seniorityLevel: dto.seniorityLevel,
        lookingForOpportunities: dto.lookingForOpportunities,
        remote: dto.remote,
        countries: dto.countries,
        regions: dto.regions,
        opportunityTypes: dto.opportunityTypes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
          },
        },
      },
    });
  }

  /**
   * Met à jour un profil entreprise (BtoB)
   * Vérifie que le profil existe et que l'utilisateur a les permissions
   * @param userId - Identifiant de l'utilisateur propriétaire du profil
   * @param dto - Données de mise à jour
   * @returns Profil mis à jour avec informations utilisateur
   * @throws NotFoundException si le profil n'existe pas
   * @throws ForbiddenException si l'utilisateur n'a pas les permissions
   */
  async updateBtoBProfile(userId: string, dto: UpdateBtoBProfileDto) {
    const profile = await this.prisma.btoBProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('BtoB profile not found');
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException('You cannot update this profile');
    }

    return this.prisma.btoBProfile.update({
      where: { userId },
      data: {
        companyName: dto.companyName,
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
        industries: dto.industries,
        marketFocus: dto.marketFocus,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePic: true,
          },
        },
      },
    });
  }
}


