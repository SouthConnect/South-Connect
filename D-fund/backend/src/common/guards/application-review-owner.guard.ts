import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Guard pour la route de review d'une candidature : seul le owner de
 * l'opportunité liée peut reviewer (contrairement à ApplicationOwnerGuard,
 * qui autorise aussi le candidat pour les routes update/submit).
 */
@Injectable()
export class ApplicationReviewOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const applicationId = req.params?.id;

    if (!user || !applicationId) {
      throw new ForbiddenException('Missing user or application identifier');
    }

    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: {
        opportunity: {
          select: { ownerId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.opportunity?.ownerId !== user.id) {
      throw new ForbiddenException('You cannot review this application');
    }

    return true;
  }
}
