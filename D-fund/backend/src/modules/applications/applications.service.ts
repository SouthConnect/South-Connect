import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  findByOpportunity(opportunityId: string) {
    return this.prisma.application.findMany({
      where: { opportunityId },
      orderBy: { createdAt: 'desc' },
      include: {
        candidate: true,
      },
    });
  }

  findForUser(userId: string) {
    return this.prisma.application.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: true,
      },
    });
  }

  async create(candidateId: string, dto: CreateApplicationDto) {
    const existing = await this.prisma.application.findUnique({
      where: {
        opportunityId_candidateId: {
          opportunityId: dto.opportunityId,
          candidateId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Application already exists');
    }

    return this.prisma.application.create({
      data: {
        opportunityId: dto.opportunityId,
        candidateId,
        title: dto.title,
        goalLetter: dto.goalLetter,
        referralCodeUsed: dto.referralCodeUsed,
        stage: ApplicationStage.DRAFT,
        isDraft: true,
        isClosed: false,
      },
    });
  }

  async update(id: string, candidateId: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('You cannot update this application');
    }

    if (application.stage !== ApplicationStage.DRAFT) {
      throw new BadRequestException('Only draft applications can be updated');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        title: dto.title,
        goalLetter: dto.goalLetter,
        referralCodeUsed: dto.referralCodeUsed,
      },
    });
  }

  async submit(id: string, candidateId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('You cannot submit this application');
    }

    if (application.stage !== ApplicationStage.DRAFT) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        stage: ApplicationStage.SUBMITTED,
        isDraft: false,
        submissionDate: new Date(),
      },
    });
  }

  async review(id: string, ownerId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        opportunity: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot review this application');
    }

    const allowedStages: ApplicationStage[] = [
      ApplicationStage.OWNER_REVIEW,
      ApplicationStage.SUCCESS,
      ApplicationStage.ARCHIVED,
    ];

    if (!allowedStages.includes(dto.stage)) {
      throw new BadRequestException('Invalid review stage');
    }

    return this.prisma.application.update({
      where: { id },
      data: {
        stage: dto.stage,
        reviewDate: new Date(),
        reviewFeedback: dto.reviewFeedback,
        feedbackTitle: dto.feedbackTitle,
        isClosed:
          dto.stage === ApplicationStage.SUCCESS ||
          dto.stage === ApplicationStage.ARCHIVED,
      },
    });
  }
}


