import { Body, Controller, ForbiddenException, Get, Param, Put, UseGuards } from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';
import { UpdateBtoCProfileDto, UpdateBtoBProfileDto } from './dto';

/**
 * Controller pour la gestion des profils utilisateurs
 * Expose les endpoints pour consulter et mettre à jour les profils BtoC et BtoB
 */
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * Récupère le profil complet d'un utilisateur
   * Endpoint public, accessible sans authentification
   * @param userId - Identifiant de l'utilisateur
   */
  @Get(':userId')
  findByUserId(@Param('userId') userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  /**
   * Liste tous les profils talents
   * Endpoint public
   */
  @Get('lists/talents')
  listTalents() {
    return this.profilesService.listTalents();
  }

  /**
   * Liste tous les profils entreprises
   * Endpoint public
   */
  @Get('lists/companies')
  listCompanies() {
    return this.profilesService.listCompanies();
  }

  /**
   * Met à jour un profil talent (BtoC)
   * Requiert une authentification JWT
   * Vérifie que l'utilisateur authentifié est le propriétaire du profil
   * @param userId - Identifiant de l'utilisateur propriétaire du profil
   * @param user - Utilisateur authentifié (injecté via CurrentUser)
   * @param dto - Données de mise à jour
   * @throws ForbiddenException si l'utilisateur tente de modifier un autre profil
   */
  @Put('bto-c/:userId')
  @UseGuards(JwtAuthGuard)
  updateBtoCProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBtoCProfileDto,
  ) {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.profilesService.updateBtoCProfile(userId, dto);
  }

  /**
   * Met à jour un profil entreprise (BtoB)
   * Requiert une authentification JWT
   * Vérifie que l'utilisateur authentifié est le propriétaire du profil
   * @param userId - Identifiant de l'utilisateur propriétaire du profil
   * @param user - Utilisateur authentifié (injecté via CurrentUser)
   * @param dto - Données de mise à jour
   * @throws ForbiddenException si l'utilisateur tente de modifier un autre profil
   */
  @Put('bto-b/:userId')
  @UseGuards(JwtAuthGuard)
  updateBtoBProfile(
    @Param('userId') userId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBtoBProfileDto,
  ) {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.profilesService.updateBtoBProfile(userId, dto);
  }
}


