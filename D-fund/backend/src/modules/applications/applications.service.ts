import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ApplicationStage, OpportunityStatus, ReferralStatus } from '@prisma/client';
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
  async findByOpportunityForOwner(
    opportunityId: string,
    ownerId: string,
    take = 50,
    skip = 0,
  ) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      select: { ownerId: true },
    });

    if (!opportunity || opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You are not allowed to access these applications');
    }

    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);

    return this.prisma.application.findMany({
      where: { opportunityId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: cappedTake,
      skip: cappedSkip,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            profilePic: true,
            city: true,
            country: true,
            bio: true,
            // email masqué ici — révélé uniquement en OWNER_REVIEW+ via la logique post-fetch
          },
        },
      },
    });
  }

  /** Returns applications submitted by the given user, with opportunity details. */
  findForUser(userId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    return this.prisma.application.findMany({
      where: { candidateId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: cappedTake,
      skip: cappedSkip,
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
   * If the candidate previously withdrew (soft-deleted), restores that record
   * rather than creating a duplicate, so the DB unique constraint is respected.
   *
   * @throws ConflictException when an active (non-withdrawn) application already exists.
   */
  async create(candidateId: string, dto: CreateApplicationDto) {
    const existing = await this.prisma.application.findFirst({
      where: { opportunityId: dto.opportunityId, candidateId },
    });

    if (existing) {
      if (!existing.deletedAt) {
        throw new ConflictException('Application already exists');
      }
      // User previously withdrew — restore and reset the record
      return this.prisma.application.update({
        where: { id: existing.id },
        data: {
          deletedAt: null,
          stage: ApplicationStage.DRAFT,
          isDraft: true,
          isClosed: false,
          submissionDate: null,
          reviewDate: null,
          reviewFeedback: null,
          feedbackTitle: null,
          title: dto.title ?? existing.title,
          goalLetter: dto.goalLetter ?? existing.goalLetter,
          referralCodeUsed: dto.referralCodeUsed ?? null,
        },
      });
    }

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

    const opp = application.opportunity;
    if (opp.status !== OpportunityStatus.ACTIVE) {
      throw new BadRequestException('This opportunity is no longer accepting applications');
    }
    if (opp.expirationDate && opp.expirationDate < new Date()) {
      throw new BadRequestException('The deadline for this opportunity has passed');
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
      // Vérifier que le code est bien lié à cette opportunité (empêche l'utilisation cross-opportunité)
      if (referral.opportunityId && referral.opportunityId !== application.opportunityId) {
        throw new BadRequestException('This referral code is not valid for this opportunity');
      }
    }

    // Atomic update: le filtre stage:DRAFT dans le WHERE garantit qu'aucune double soumission
    // simultanée ne passe (race condition fix).
    let updatedCount: { count: number };
    try {
      updatedCount = await this.prisma.application.updateMany({
        where: { id, candidateId, stage: ApplicationStage.DRAFT },
        data: {
          stage: ApplicationStage.SUBMITTED,
          isDraft: false,
          submissionDate: new Date(),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Cette candidature a déjà été soumise.');
      }
      throw err;
    }
    if (updatedCount.count === 0) {
      throw new BadRequestException('Only draft applications can be submitted');
    }

    const updated = await this.prisma.application.findUniqueOrThrow({ where: { id } });
    if (!updated) throw new NotFoundException('Application not found after update');

    // Counters dénormalisés — dans une transaction groupée pour éviter la divergence.
    // Non-bloquant (pas d'await) : le cron nightly resynce si ça échoue.
    this.prisma.$transaction([
      this.prisma.opportunity.updateMany({
        where: { id: application.opportunityId },
        data: { applicationsCount: { increment: 1 } },
      }),
      ...(application.referralCodeUsed
        ? [this.prisma.referralCode.updateMany({
            where: { code: application.referralCodeUsed },
            data: { usesCount: { increment: 1 } },
          })]
        : []),
    ]).catch((err) => this.logger.error('Counter sync failed — will resync at nightly cron', err));

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
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
      include: { opportunity: true, candidate: true },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (!application.opportunity) throw new NotFoundException('Opportunity not found');
    if (application.opportunity.ownerId !== ownerId) {
      throw new ForbiddenException('You cannot review this application');
    }

    const VALID_TRANSITIONS: Partial<Record<ApplicationStage, ApplicationStage[]>> = {
      [ApplicationStage.SUBMITTED]: [ApplicationStage.OWNER_REVIEW, ApplicationStage.ARCHIVED],
      [ApplicationStage.OWNER_REVIEW]: [ApplicationStage.SUCCESS, ApplicationStage.ARCHIVED],
      [ApplicationStage.READY_TO_SUBMIT]: [ApplicationStage.SUCCESS, ApplicationStage.ARCHIVED],
    };
    const allowedTargets = VALID_TRANSITIONS[application.stage];
    if (!allowedTargets || !allowedTargets.includes(dto.stage as ApplicationStage)) {
      throw new BadRequestException(
        `Cannot transition from ${application.stage} to ${dto.stage}`,
      );
    }

    const updateData = {
      stage: dto.stage as ApplicationStage,
      reviewDate: new Date(),
      reviewFeedback: dto.reviewFeedback,
      feedbackTitle: dto.feedbackTitle,
      isClosed: dto.stage === 'SUCCESS' || dto.stage === 'ARCHIVED',
    };

    const result = await this.prisma.application.updateMany({
      where: { id, deletedAt: null },
      data: updateData,
    });

    if (result.count === 0) {
      throw new NotFoundException('Application was withdrawn or deleted concurrently');
    }

    const updated = await this.prisma.application.findUniqueOrThrow({ where: { id } });

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

  /**
   * Allows a candidate to withdraw their own application before it enters owner review.
   * Uses soft-delete so the record and counters remain auditable.
   *
   * @throws NotFoundException  when the application does not exist or is already withdrawn.
   * @throws ForbiddenException when the requester is not the applicant.
   * @throws BadRequestException when the application has already been reviewed.
   */
  async withdraw(id: string, candidateId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id, deletedAt: null },
    });

    if (!application) throw new NotFoundException('Application not found');
    if (application.candidateId !== candidateId) {
      throw new ForbiddenException('You cannot withdraw this application');
    }
    const nonWithdrawableStages: ApplicationStage[] = [
      ApplicationStage.OWNER_REVIEW,
      ApplicationStage.SUCCESS,
      ApplicationStage.ARCHIVED,
    ];
    if (nonWithdrawableStages.includes(application.stage)) {
      throw new BadRequestException('Application cannot be withdrawn at this stage');
    }

    // Only decrement counter if the application was already submitted (counted)
    const wasCounted = application.stage !== ApplicationStage.DRAFT;

    // Atomic soft-delete: deletedAt: null dans le filtre garantit qu'un double retrait simultané
    // ne décrémentera le compteur qu'une seule fois (race condition fix).
    const updateResult = await this.prisma.application.updateMany({
      where: { id, candidateId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (updateResult.count === 0) {
      // Soit déjà retiré, soit pas le bon owner
      const existing = await this.prisma.application.findFirst({ where: { id } });
      if (!existing) throw new NotFoundException('Application not found');
      if (existing.candidateId !== candidateId) throw new ForbiddenException('You cannot withdraw this application');
      throw new ConflictException('Application already withdrawn');
    }

    if (wasCounted) {
      this.prisma.opportunity.updateMany({
        where: { id: application.opportunityId },
        data: { applicationsCount: { decrement: 1 } },
      }).catch((err) => this.logger.error('Counter decrement failed on withdraw', err));
    }

    return { message: 'Application withdrawn successfully' };
  }
}
