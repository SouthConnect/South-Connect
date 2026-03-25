import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
// Note: BadRequestException is kept for the DRAFT stage check
import { Prisma } from '@prisma/client';
import { ApplicationStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

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
    try {
      return await this.prisma.application.create({
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Application already exists');
      }
      throw error;
    }
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
        externalLink: dto.externalLink,
        externalLink2: dto.externalLink2,
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
        await this.notificationsService.createInApp(
          application.opportunity.owner.id,
          'APPLICATION_RECEIVED',
          `New application for "${application.opportunity.name}"`,
          `A candidate just applied to your opportunity.`,
          `/opportunities/${application.opportunity.id}/applications`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send application submitted email', error);
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

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        stage: dto.stage as ApplicationStage,
        reviewDate: new Date(),
        reviewFeedback: dto.reviewFeedback,
        feedbackTitle: dto.feedbackTitle,
        isClosed: dto.stage === 'SUCCESS' || dto.stage === 'ARCHIVED',
      },
    });

    // Notifications au candidat selon le stage
    try {
      if (application.candidate && application.opportunity) {
        if (dto.stage === 'SUCCESS') {
          await this.notificationsService.sendApplicationAcceptedEmail(
            application.candidate,
            updated,
            application.opportunity,
          );
          await this.notificationsService.createInApp(
            application.candidate.id,
            'APPLICATION_ACCEPTED',
            `Your application was accepted!`,
            `Congratulations! Your application for "${application.opportunity.name}" was accepted.`,
            `/applications/${application.id}`,
          );
        } else {
          await this.notificationsService.sendApplicationReviewedEmail(
            application.candidate,
            updated,
            application.opportunity,
          );
          await this.notificationsService.createInApp(
            application.candidate.id,
            'APPLICATION_REVIEWED',
            `Your application has been reviewed`,
            `Your application for "${application.opportunity.name}" has been reviewed.`,
            `/applications/${application.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send application review email', error);
    }

    return updated;
  }
}


