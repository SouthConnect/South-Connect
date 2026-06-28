import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfilePicDto } from './dto/update-profile-pic.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';
import { Throttle } from '@nestjs/throttler';

class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

/**
 * Exposes CRUD operations on user accounts.
 * All routes require a valid JWT.
 * Admin-prefixed routes require the ADMIN role.
 */
@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller('users')
@Throttle({ default: {} })
export class UsersController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  // ── Self-service routes ────────────────────────────────────────────────────

  /**
   * Returns a user's public profile.
   * Only the user themselves or an admin may access this endpoint.
   *
   * @throws ForbiddenException when the requester is neither the target user nor an ADMIN.
   */
  @ApiOperation({ summary: "Return a user's public profile (self or admin only)" })
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', ParseIdPipe) id: string, @CurrentUser() requester: User) {
    if (requester.id !== id && requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Access denied');
    }
    return this.usersService.findOne(id);
  }

  /** Updates the authenticated user's editable profile fields. */
  @ApiOperation({ summary: "Update the current user's profile" })
  @Put('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  /** Updates the authenticated user's profile picture URL. */
  @ApiOperation({ summary: "Update the current user's profile picture" })
  @Put('me/profile-pic')
  @UseGuards(JwtAuthGuard)
  updateProfilePic(@CurrentUser() user: User, @Body() dto: UpdateProfilePicDto) {
    return this.usersService.updateProfilePic(user.id, dto.profilePic);
  }

  /**
   * GDPR Article 20 — data portability.
   * Returns the authenticated user's personal data as a downloadable JSON file.
   * Rate-limited to 3 requests per minute (strict) to prevent scraping.
   */
  @ApiOperation({ summary: 'Export all personal data (GDPR Article 20)' })
  @Post('me/export')
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: {} })
  async exportMyData(@CurrentUser() user: User, @Res() res: Response) {
    const payload = await this.usersService.exportMyData(user.id);
    const filename = `dfund-export-${user.id}-${Date.now()}.json`;
    res
      .setHeader('Content-Type', 'application/json')
      .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      .json(payload);
  }

  // ── Admin routes ───────────────────────────────────────────────────────────

  /** Admin: returns a paginated list of all users with optional search. */
  @ApiOperation({ summary: 'List all users (admin only)' })
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminFindAll(
    @Query('take') take?: string,
    @Query('skip') skip?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.adminFindAll({
      take: take ? parseInt(take, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      search,
    });
  }

  /** Admin: updates a user's role (USER or ADMIN). */
  @ApiOperation({ summary: "Update a user's role (admin only)" })
  @Put('admin/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUpdateRole(
    @Param('id', ParseIdPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.usersService.adminUpdateRole(id, dto.role);
    this.auditService.log(admin.id, 'CHANGE_ROLE', id, 'user', `role=${dto.role}`);
    return result;
  }

  /** Admin: bans a user account (prevents login). */
  @ApiOperation({ summary: 'Ban a user (admin only)' })
  @Put('admin/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminBan(@Param('id', ParseIdPipe) id: string, @CurrentUser() admin: User) {
    const result = await this.usersService.adminSetBan(id, true);
    this.auditService.log(admin.id, 'BAN_USER', id, 'user');
    return result;
  }

  /** Admin: lifts the ban on a user account. */
  @ApiOperation({ summary: 'Unban a user (admin only)' })
  @Put('admin/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminUnban(@Param('id', ParseIdPipe) id: string, @CurrentUser() admin: User) {
    const result = await this.usersService.adminSetBan(id, false);
    this.auditService.log(admin.id, 'UNBAN_USER', id, 'user');
    return result;
  }

  /** RGPD art. 17 — l'utilisateur supprime et anonymise son propre compte. */
  @ApiOperation({ summary: 'Delete and anonymise own account (RGPD art. 17)' })
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: {} })
  async deleteMe(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    await this.usersService.deleteMe(user.id);
    this.auditService.log(user.id, 'DELETE_OWN_ACCOUNT', user.id, 'user');
    // Invalider les cookies auth immédiatement
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true };
  }

  /** Admin: permanently deletes a user account. */
  @ApiOperation({ summary: 'Delete a user account (admin only)' })
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminDelete(@Param('id', ParseIdPipe) id: string, @CurrentUser() admin: User) {
    const result = await this.usersService.adminDelete(id);
    this.auditService.log(admin.id, 'DELETE_USER', id, 'user');
    return result;
  }
}
