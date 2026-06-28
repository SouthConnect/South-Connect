import { Body, Controller, ForbiddenException, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ProfilesService } from './profiles.service';
import { UpdateBtoCProfileDto, UpdateBtoBProfileDto } from './dto';

/**
 * Exposes endpoints for reading and updating user profiles (BtoC and BtoB).
 *
 * Public read endpoints use the optional-JWT guard so that authenticated users
 * receive visibility-gated responses while unauthenticated requests still work
 * for public profiles.
 */
@ApiTags('profiles')
@Controller('profiles')
@Throttle({ default: {} })
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  /**
   * Returns the full profile of a user including BtoC/BtoB sub-profiles.
   * Accessible without authentication for public profiles.
   */
  @Get(':userId')
  @UseGuards(JwtOptionalGuard)
  findByUserId(@Param('userId', ParseIdPipe) userId: string, @CurrentUser() requester?: User) {
    return this.profilesService.findByUserId(userId, requester?.id, requester?.role);
  }

  /** Returns a paginated list of individual talent profiles. */
  @Get('lists/talents')
  listTalents(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.profilesService.listTalents(Math.min(Number(take) || 30, 100), Number(skip) || 0);
  }

  /** Returns a paginated list of company profiles. */
  @Get('lists/companies')
  listCompanies(@Query('take') take?: string, @Query('skip') skip?: string) {
    return this.profilesService.listCompanies(
      Math.min(Number(take) || 30, 100),
      Number(skip) || 0,
    );
  }

  /** Returns a paginated list of all publicly visible members, with optional name/bio search. */
  @Get('lists/members')
  listMembers(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('search') search?: string,
  ) {
    return this.profilesService.listMembers(
      Math.min(Number(take) || 30, 100),
      Number(skip) || 0,
      search,
    );
  }

  /**
   * Updates the authenticated user's individual (BtoC) profile.
   *
   * @throws ForbiddenException when the requester attempts to update another user's profile.
   */
  @Put('bto-c/:userId')
  @UseGuards(JwtAuthGuard)
  updateBtoCProfile(
    @Param('userId', ParseIdPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBtoCProfileDto,
  ) {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.profilesService.updateBtoCProfile(userId, dto);
  }

  /**
   * Updates the authenticated user's company (BtoB) profile.
   *
   * @throws ForbiddenException when the requester attempts to update another user's profile.
   */
  @Put('bto-b/:userId')
  @UseGuards(JwtAuthGuard)
  updateBtoBProfile(
    @Param('userId', ParseIdPipe) userId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateBtoBProfileDto,
  ) {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.profilesService.updateBtoBProfile(userId, dto);
  }
}
