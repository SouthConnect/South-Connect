import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Guard pour vérifier que l'utilisateur courant est bien:
 * - soit le candidat propriétaire de la candidature
 * - soit l'owner de l'opportunité liée
 *
 * À adapter finement par endpoint si besoin via un paramètre ou un guard dédié;
 * ici on l'utilise surtout côté owner (review).
 */
@Injectable()
export class ApplicationOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const applicationId = req.params?.id;

    if (!user || !applicationId) {
      throw new ForbiddenException('Missing user or application identifier');
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        opportunity: {
          select: { ownerId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const isCandidate = application.candidateId === user.id;
    const isOwner = application.opportunity?.ownerId === user.id;

    if (!isCandidate && !isOwner) {
      throw new ForbiddenException('You are not allowed to access this application');
    }

    return true;
  }
}

