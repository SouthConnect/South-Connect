import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Guard générique pour vérifier que l'utilisateur courant
 * est bien owner d'une ressource donnée.
 *
 * Ce guard suppose que:
 * - l'ID ressource est passé en paramètre de route `:id`
 * - le modèle Prisma possède un champ `ownerId`
 *
 * À utiliser sur des routes déjà protégées par JwtAuthGuard.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const resourceId = req.params?.id;

    if (!user || !resourceId) {
      throw new ForbiddenException('Missing user or resource identifier');
    }

    // Pour l’instant on ne l’utilise que pour les opportunités.
    // Si besoin, on pourra généraliser avec des métadonnées.
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: resourceId },
      select: { ownerId: true },
    });

    if (!opportunity || opportunity.ownerId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this resource');
    }

    return true;
  }
}

