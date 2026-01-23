import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOpportunityDto, ListOpportunitiesDto, UpdateOpportunityDto } from './dto';

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  findAll(params?: ListOpportunitiesDto) {
    const { take = 20, skip = 0, status, type, ownerId, search } = params || {};
    const where: Prisma.OpportunityWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { punchline: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.opportunity.findMany({
      take,
      skip,
      orderBy: { createdAt: 'desc' },
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
      },
    });
  }

  findByOwner(ownerId: string, params?: ListOpportunitiesDto) {
    return this.findAll({
      ...params,
      ownerId,
    });
  }

  findOne(id: string) {
    return this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
      },
    });
  }

  async create(ownerId: string, dto: CreateOpportunityDto) {
    return this.prisma.opportunity.create({
      data: {
        ownerId,
        name: dto.name,
        punchline: dto.punchline,
        description: dto.description,
        type: dto.type,
        status: dto.status || 'DRAFT',
        featureId: dto.featureId,
        city: dto.city,
        country: dto.country,
        region: dto.region,
        remote: dto.remote,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        applicationProcessId: dto.applicationProcessId,
        needToCheckApplicant: dto.needToCheckApplicant ?? false,
        image: dto.image,
        backgroundImage: dto.backgroundImage,
        file: dto.file,
        url: dto.url,
        tags: dto.tags ?? [],
        industries: dto.industries ?? [],
        markets: dto.markets ?? [],
        price: dto.price,
        currency: dto.currency,
        pricingUnit: dto.pricingUnit,
        pricingDetails: dto.pricingDetails,
        aiGenerated: dto.aiGenerated ?? false,
        aiPrompt: dto.aiPrompt,
        aiOutput: dto.aiOutput,
        boosted: dto.boosted ?? false,
        boostedUntil: dto.boostedUntil ? new Date(dto.boostedUntil) : undefined,
        qualified: dto.qualified ?? false,
        referralAvailable: dto.referralAvailable ?? false,
        referralAmount: dto.referralAmount,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
      },
    });
  }

  async update(id: string, ownerId: string, dto: UpdateOpportunityDto) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot update this opportunity');
    }

    return this.prisma.opportunity.update({
      where: { id },
      data: {
        name: dto.name,
        punchline: dto.punchline,
        description: dto.description,
        type: dto.type,
        status: dto.status,
        featureId: dto.featureId,
        city: dto.city,
        country: dto.country,
        region: dto.region,
        remote: dto.remote,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        expirationDate: dto.expirationDate ? new Date(dto.expirationDate) : undefined,
        applicationProcessId: dto.applicationProcessId,
        needToCheckApplicant: dto.needToCheckApplicant,
        image: dto.image,
        backgroundImage: dto.backgroundImage,
        file: dto.file,
        url: dto.url,
        tags: dto.tags,
        industries: dto.industries,
        markets: dto.markets,
        price: dto.price,
        currency: dto.currency,
        pricingUnit: dto.pricingUnit,
        pricingDetails: dto.pricingDetails,
        aiGenerated: dto.aiGenerated,
        aiPrompt: dto.aiPrompt,
        aiOutput: dto.aiOutput,
        boosted: dto.boosted,
        boostedUntil: dto.boostedUntil ? new Date(dto.boostedUntil) : undefined,
        qualified: dto.qualified,
        referralAvailable: dto.referralAvailable,
        referralAmount: dto.referralAmount,
      },
    });
  }

  async remove(id: string, ownerId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot delete this opportunity');
    }

    return this.prisma.opportunity.delete({
      where: { id },
    });
  }
}


