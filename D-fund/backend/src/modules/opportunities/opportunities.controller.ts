import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOptionalGuard } from '../auth/guards/jwt-optional.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { OpportunitiesService } from './opportunities.service';
import { AuditService } from '../audit/audit.service';
import {
  AdminUpdateStatusDto,
  CreateOpportunityDto,
  ListOpportunitiesDto,
  UpdateOpportunityDto,
} from './dto';

/**
 * Exposes CRUD endpoints for opportunities.
 *
 * Public read routes use the optional-JWT guard so that authenticated users
 * receive personalised social state (isLiked, isSaved) while unauthenticated
 * requests still work for public opportunities.
 *
 * Admin routes are protected by JwtAuthGuard + RolesGuard and require the
 * ADMIN role.
 */
@ApiTags('opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    private readonly auditService: AuditService,
  ) {}

  /** Returns a paginated list of non-draft opportunities for the public feed. */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findAll(@Query() query: ListOpportunitiesDto) {
    return this.opportunitiesService.findAll(query);
  }

  /** Admin: returns platform-wide statistics (users, opportunities, applications). */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminGetStats() {
    return this.opportunitiesService.adminGetStats();
  }

  /** Admin: returns all opportunities regardless of status. */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminFindAll(@Query() query: ListOpportunitiesDto) {
    return this.opportunitiesService.adminFindAll(query);
  }

  /** Admin: updates the status of an opportunity and notifies the owner. */
  @Put('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateStatus(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: AdminUpdateStatusDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.opportunitiesService.adminUpdateStatus(id, dto.status);
    const action =
      dto.status === 'ACTIVE'
        ? 'APPROVE_OPPORTUNITY'
        : dto.status === 'ARCHIVED'
        ? 'ARCHIVE_OPPORTUNITY'
        : 'REJECT_OPPORTUNITY';
    this.auditService.log(admin.id, action, id, 'opportunity', `status=${dto.status}`);
    return result;
  }

  /** Returns opportunities created by the given user. Drafts are only visible to the owner. */
  @Get('user/:userId')
  @UseGuards(JwtOptionalGuard)
  findByOwner(
    @Param('userId') userId: string,
    @Query() query: ListOpportunitiesDto,
    @CurrentUser() requester?: User,
  ) {
    return this.opportunitiesService.findByOwner(userId, query, requester?.id);
  }

  /** Creates a new opportunity. Defaults to DRAFT status. Rate-limited to 5 per 30s to prevent double-submit. */
  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 30_000 } })
  create(@CurrentUser() user: User, @Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(user.id, dto);
  }

  /** Updates an opportunity. Only the owner may call this endpoint. */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: User, @Body() dto: UpdateOpportunityDto) {
    return this.opportunitiesService.update(id, user.id, dto);
  }

  /** Deletes an opportunity. Only the owner may call this endpoint. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIdPipe) id: string, @CurrentUser() user: User) {
    return this.opportunitiesService.remove(id, user.id);
  }

  /** Returns a single opportunity. Includes like/save state when the requester is authenticated. */
  @Get(':id')
  @UseGuards(JwtOptionalGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findOne(
    @Param('id', ParseIdPipe) id: string,
    @Req() req: Request,
    @CurrentUser() requester?: User,
  ) {
    // Viewer key for view dedup: prefer userId (stable), fall back to IP
    const xff = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(xff) ? xff[0] : xff?.split(',')[0]) ?? req.ip ?? 'unknown';
    const viewerKey = requester?.id ?? ip;
    return this.opportunitiesService.findOne(id, requester?.id, viewerKey);
  }

  /** Records a share action for an opportunity (increments sharedCount). */
  @Post(':id/share')
  @UseGuards(JwtOptionalGuard)
  share(@Param('id', ParseIdPipe) id: string) {
    return this.opportunitiesService.incrementShares(id);
  }
}
