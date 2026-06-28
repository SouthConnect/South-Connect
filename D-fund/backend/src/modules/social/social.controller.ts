import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { SocialService } from './social.service';

/**
 * Exposes social interaction endpoints: follows, opportunity likes, and opportunity saves.
 * All mutation routes require a valid JWT.
 */
@ApiTags('social')
@ApiBearerAuth('JWT')
@Controller('social')
@Throttle({ default: {} })
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  /** Returns whether the authenticated user is following the given user. */
  @Get('is-following/:userId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  isFollowing(@Param('userId', ParseIdPipe) userId: string, @CurrentUser() user: User) {
    return this.socialService.isFollowing(user.id, userId);
  }

  /** Follows the given user. Email verification not required — basic social action. */
  @Post('follow/:userId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  follow(@Param('userId', ParseIdPipe) userId: string, @CurrentUser() user: User) {
    return this.socialService.follow(user.id, userId);
  }

  /** Unfollows the given user. */
  @Delete('follow/:userId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  unfollow(@Param('userId', ParseIdPipe) userId: string, @CurrentUser() user: User) {
    return this.socialService.unfollow(user.id, userId);
  }

  /** Returns the list of followers for the given user. Public endpoint. */
  @Get('followers/:userId')
  getFollowers(@Param('userId', ParseIdPipe) userId: string) {
    return this.socialService.getFollowers(userId);
  }

  /** Returns the list of users the given user is following. Public endpoint. */
  @Get('following/:userId')
  getFollowing(@Param('userId', ParseIdPipe) userId: string) {
    return this.socialService.getFollowing(userId);
  }

  /** Likes the given opportunity. */
  @Post('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  likeOpportunity(@Param('opportunityId', ParseIdPipe) opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.likeOpportunity(user.id, opportunityId);
  }

  /** Removes a like from the given opportunity. */
  @Delete('like/:opportunityId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  unlikeOpportunity(@Param('opportunityId', ParseIdPipe) opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.unlikeOpportunity(user.id, opportunityId);
  }

  /** Bookmarks the given opportunity. */
  @Post('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  saveOpportunity(@Param('opportunityId', ParseIdPipe) opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.saveOpportunity(user.id, opportunityId);
  }

  /** Removes a bookmark from the given opportunity. */
  @Delete('save/:opportunityId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  unsaveOpportunity(@Param('opportunityId', ParseIdPipe) opportunityId: string, @CurrentUser() user: User) {
    return this.socialService.unsaveOpportunity(user.id, opportunityId);
  }

  /** Returns all opportunities bookmarked by the authenticated user. */
  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  getSavedOpportunities(@CurrentUser() user: User) {
    return this.socialService.getSavedOpportunities(user.id);
  }

  /** Likes a public discussion (increments its likesCount). */
  @Post('discussion/like/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  likeDiscussion(@Param('discussionId', ParseIdPipe) discussionId: string, @CurrentUser() user: User) {
    return this.socialService.likeDiscussion(user.id, discussionId);
  }

  /** Removes a like from a public discussion. */
  @Delete('discussion/like/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  unlikeDiscussion(@Param('discussionId', ParseIdPipe) discussionId: string, @CurrentUser() user: User) {
    return this.socialService.unlikeDiscussion(user.id, discussionId);
  }

  /** Returns whether the authenticated user has liked a public discussion. */
  @Get('discussion/is-liked/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  isDiscussionLiked(@Param('discussionId', ParseIdPipe) discussionId: string, @CurrentUser() user: User) {
    return this.socialService.isDiscussionLiked(user.id, discussionId);
  }
}
