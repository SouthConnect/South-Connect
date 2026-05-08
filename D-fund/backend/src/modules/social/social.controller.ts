import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SocialService } from './social.service';

/**
 * Exposes social interaction endpoints: follows, opportunity likes, and opportunity saves.
 * All mutation routes require a valid JWT.
 */
@ApiTags('social')
@ApiBearerAuth('JWT')
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  /** Returns whether the authenticated user is following the given user. */
  @Get('is-following/:userId')
  @UseGuards(JwtAuthGuard)
  isFollowing(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.socialService.isFollowing(user.id, userId);
  }

  /** Follows the given user. */
  @Post('follow/:userId')
  @UseGuards(JwtAuthGuard)
  follow(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.socialService.follow(user.id, userId);
  }

  /** Unfollows the given user. */
  @Delete('follow/:userId')
  @UseGuards(JwtAuthGuard)
  unfollow(@Param('userId') userId: string, @CurrentUser() user: User) {
    return this.socialService.unfollow(user.id, userId);
  }

  /** Returns the list of followers for the given user. Public endpoint. */
  @Get('followers/:userId')
  getFollowers(@Param('userId') userId: string) {
    return this.socialService.getFollowers(userId);
  }

  /** Returns the list of users the given user is following. Public endpoint. */
  @Get('following/:userId')
  getFollowing(@Param('userId') userId: string) {
    return this.socialService.getFollowing(userId);
  }

  /** Likes the given opportunity. */
  @Post('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  likeOpportunity(@Param('opportunityId') opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.likeOpportunity(user.id, opportunityId);
  }

  /** Removes a like from the given opportunity. */
  @Delete('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  unlikeOpportunity(@Param('opportunityId') opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.unlikeOpportunity(user.id, opportunityId);
  }

  /** Bookmarks the given opportunity. */
  @Post('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  saveOpportunity(@Param('opportunityId') opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.saveOpportunity(user.id, opportunityId);
  }

  /** Removes a bookmark from the given opportunity. */
  @Delete('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  unsaveOpportunity(@Param('opportunityId') opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.unsaveOpportunity(user.id, opportunityId);
  }

  /** Returns all opportunities bookmarked by the authenticated user. */
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  getSavedOpportunities(@CurrentUser() user: User) {
    return this.socialService.getSavedOpportunities(user.id);
  }
}
