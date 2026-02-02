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
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findByOpportunityForOwner(opportunityId: string, ownerId: string) {
    // Vérifie que l'opportunité appartient bien à l'owner courant
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { ownerId: true },
    });

    if (!opportunity || opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You are not allowed to access these applications');
    }

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
      include: {
        opportunity: {
          include: {
            owner: true,
          },
        },
      },
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

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        stage: ApplicationStage.SUBMITTED,
        isDraft: false,
        submissionDate: new Date(),
      },
    });

    // Notification au owner
    try {
      if (application.opportunity?.owner) {
        await this.notificationsService.sendApplicationSubmittedEmail(
          application.opportunity.owner,
          updated,
          application.opportunity,
        );
      }
    } catch {
      // Erreurs loggées dans le service, on ne bloque pas la requête
    }

    return updated;
  }

  async review(id: string, ownerId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        opportunity: true,
        candidate: true,
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

    const updated = await this.prisma.application.update({
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

    // Notifications au candidat selon le stage
    try {
      if (application.candidate && application.opportunity) {
        if (dto.stage === ApplicationStage.SUCCESS) {
          await this.notificationsService.sendApplicationAcceptedEmail(
            application.candidate,
            updated,
            application.opportunity,
          );
        } else {
          await this.notificationsService.sendApplicationReviewedEmail(
            application.candidate,
            updated,
            application.opportunity,
          );
        }
      }
    } catch {
      // Erreurs loggées dans le service, on ne bloque pas la requête
    }

    return updated;
  }
}


