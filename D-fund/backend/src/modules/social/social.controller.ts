import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SocialService } from './social.service';

/**
 * Controller pour les fonctionnalités sociales
 * Gère les follows, likes et sauvegardes d'opportunités
 */
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  /**
   * Suivre un utilisateur
   * Requiert une authentification JWT
   * @param userId - ID de l'utilisateur à suivre
   * @param user - Utilisateur authentifié (injecté via CurrentUser)
   */
  @Post('follow/:userId')
  @UseGuards(JwtAuthGuard)
  follow(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.socialService.follow(user.id, userId);
  }

  /**
   * Ne plus suivre un utilisateur
   * Requiert une authentification JWT
   * @param userId - ID de l'utilisateur à ne plus suivre
   * @param user - Utilisateur authentifié
   */
  @Delete('follow/:userId')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.socialService.unfollow(user.id, userId);
  }

  /**
   * Liste des followers d'un utilisateur
   * Endpoint public
   * @param userId - ID de l'utilisateur
   */
  @Get('followers/:userId')
  getFollowers(@Param('userId') userId: string) {
    return this.socialService.getFollowers(userId);
  }

  /**
   * Liste des utilisateurs suivis par un utilisateur
   * Endpoint public
   * @param userId - ID de l'utilisateur
   */
  @Get('following/:userId')
  getFollowing(@Param('userId') userId: string) {
    return this.socialService.getFollowing(userId);
  }

  /**
   * Liker une opportunité
   * Requiert une authentification JWT
   * @param opportunityId - ID de l'opportunité à liker
   * @param user - Utilisateur authentifié
   */
  @Post('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  likeOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.socialService.likeOpportunity(user.id, opportunityId);
  }

  /**
   * Retirer le like d'une opportunité
   * Requiert une authentification JWT
   * @param opportunityId - ID de l'opportunité
   * @param user - Utilisateur authentifié
   */
  @Delete('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  unlikeOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.socialService.unlikeOpportunity(user.id, opportunityId);
  }

  /**
   * Sauvegarder une opportunité
   * Requiert une authentification JWT
   * @param opportunityId - ID de l'opportunité à sauvegarder
   * @param user - Utilisateur authentifié
   */
  @Post('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  saveOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.socialService.saveOpportunity(user.id, opportunityId);
  }

  /**
   * Retirer une opportunité des sauvegardes
   * Requiert une authentification JWT
   * @param opportunityId - ID de l'opportunité
   * @param user - Utilisateur authentifié
   */
  @Delete('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  unsaveOpportunity(
    @Param('opportunityId') opportunityId: string,
    @CurrentUser() user: User,
  ) {
    return this.socialService.unsaveOpportunity(user.id, opportunityId);
  }

  /**
   * Liste des opportunités sauvegardées par l'utilisateur authentifié
   * Requiert une authentification JWT
   * @param user - Utilisateur authentifié
   */
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  getSavedOpportunities(@CurrentUser() user: User) {
    return this.socialService.getSavedOpportunities(user.id);
  }
}
