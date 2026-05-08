import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Exposes rating operations.
 * Public stats (GET) are readable without authentication.
 * Write operations (POST, DELETE) require a valid JWT.
 */
@ApiTags('ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  /** Returns aggregate rating stats for an item (avg, total, rounded). */
  @ApiOperation({ summary: 'Get rating statistics for an item' })
  @Get(':itemId/stats')
  @UseGuards(JwtOptionalGuard)
  getStats(@Param('itemId') itemId: string) {
    return this.ratingsService.getStats(itemId);
  }

  /** Returns the authenticated user's own rating for the given item, or null. */
  @ApiOperation({ summary: "Get the caller's own rating for an item" })
  @Get(':itemId/my')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  getMyRating(@Param('itemId') itemId: string, @CurrentUser() user: User) {
    return this.ratingsService.getMyRating(itemId, user.id);
  }

  /** Creates or updates the caller's rating for an item. */
  @ApiOperation({ summary: 'Rate an item (upsert)' })
  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  upsert(@CurrentUser() user: User, @Body() dto: CreateRatingDto) {
    return this.ratingsService.upsert(user.id, dto);
  }

  /** Removes the caller's rating for an item. */
  @ApiOperation({ summary: "Delete the caller's rating for an item" })
  @Delete(':itemId')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  remove(@Param('itemId') itemId: string, @CurrentUser() user: User) {
    return this.ratingsService.remove(itemId, user.id);
  }
}
