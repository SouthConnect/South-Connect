import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ApplicationStage, ReferralStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ReviewApplicationDto, UpdateApplicationDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Manages the full application lifecycle: creation, editing, submission, and owner review.
 *
 * Notification emails and in-app notifications are sent after submission and after review.
 * These are wrapped in try/catch blocks so delivery failures never block the primary response.
 */
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Returns all applications for an opportunity.
   * Only the opportunity owner may call this method.
   *
   * @throws ForbiddenException when the requester does not own the opportunity.
   */
  async findByOpportunityForOwner(opportunityId: string, ownerId: string) {
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
        candidate: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePic: true,
            city: true,
            country: true,
            bio: true,
          },
        },
      },
    });
  }

  /** Returns all applications submitted by the given user, with opportunity details. */
  findForUser(userId: string) {
    return this.prisma.application.findMany({
      where: { candidateId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          select: {
            id: true,
            name: true,
            punchline: true,
            type: true,
            status: true,
            image: true,
            city: true,
            country: true,
            remote: true,
            owner: { select: { id: true, name: true, profilePic: true } },
          },
        },
      },
    });
  }

  /**
   * Creates a new application in DRAFT stage.
   *
   * @throws ConflictException when the candidate has already applied to the same opportunity.
   */
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Application already exists');
      }
      throw error;
    }
  }

  /**
   * Updates a DRAFT application's fields.
   *
   * @throws NotFoundException  when the application does not exist.
   * @throws ForbiddenException when the requester is not the applicant.
   * @throws BadRequestException when the application has already been submitted.
   */
  async update(id: string, candidateId: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.application.findUnique({ where: { id } });

    if (!application) throw new NotFoundException('Application not found');
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
        attachmentUrl: dto.attachmentUrl,
      },
    });
  }

  /**
   * Submits a DRAFT application, transitioning it to the SUBMITTED stage.
   *
   * Notifies the opportunity owner via email and in-app notification (non-blocking).
   *
   * @throws NotFoundException  when the application does not exist.
   * @throws ForbiddenException when the requester is not the applicant.
   * @throws BadRequestException when the application is not in DRAFT stage.
   */
  async submit(id: string, candidateId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { opportunity: { include: { owner: true } } },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('You cannot submit this application');
    }
    if (application.stage !== ApplicationStage.DRAFT) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    // Validate referral code if provided
    if (application.referralCodeUsed) {
      const referral = await this.prisma.referralCode.findUnique({
        where: { code: application.referralCodeUsed },
      });
      if (!referral) {
        throw new BadRequestException(`Referral code "${application.referralCodeUsed}" does not exist`);
      }
      if (referral.status !== ReferralStatus.ACTIVE) {
        throw new BadRequestException('This referral code is no longer active');
      }
      if (referral.ownerId === candidateId) {
        throw new BadRequestException('You cannot use your own referral code');
      }
    }

    const updated = await this.prisma.application.update({
      where: { id },
      data: {
        stage: ApplicationStage.SUBMITTED,
        isDraft: false,
        submissionDate: new Date(),
      },
    });

    // Incrémenter usesCount dès la soumission avec un code de parrainage valide
    if (application.referralCodeUsed) {
      this.prisma.referralCode
        .updateMany({
          where: { code: application.referralCodeUsed },
          data: { usesCount: { increment: 1 } },
        })
        .catch((err) => this.logger.error('Failed to increment referral usesCount', err));
    }

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
          'A candidate just applied to your opportunity.',
          `/opportunities/${application.opportunity.id}/applications`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to send application submitted notification', error);
    }

    return updated;
  }

  /**
   * Allows the opportunity owner to review and update the stage of an application.
   *
   * Notifies the candidate depending on the outcome:
   * - SUCCESS  → accepted email + in-app notification
   * - Other    → reviewed email + in-app notification
   *
   * @throws NotFoundException  when the application does not exist.
   * @throws ForbiddenException when the requester does not own the opportunity.
   */
  async review(id: string, ownerId: string, dto: ReviewApplicationDto) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { opportunity: true, candidate: true },
    });

    if (!application) throw new NotFoundException('Application not found');
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

    // Marquer le code de parrainage comme complété quand acceptée (usesCount déjà incrémenté au submit)
    if (dto.stage === 'SUCCESS' && application.referralCodeUsed) {
      this.prisma.referralCode
        .updateMany({
          where: { code: application.referralCodeUsed, status: { not: ReferralStatus.COMPLETED } },
          data: { status: ReferralStatus.COMPLETED },
        })
        .catch((err) => this.logger.error('Failed to update referral code status', err));
    }

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
            'Your application was accepted!',
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
            'Your application has been reviewed',
            `Your application for "${application.opportunity.name}" has been reviewed.`,
            `/applications/${application.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send application review notification', error);
    }

    return updated;
  }
}
