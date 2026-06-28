import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

/**
 * Exposes in-app notification management for the authenticated user.
 * All routes require a valid JWT.
 *
 * Email verification is bypassed for the whole controller — users must be
 * able to see and dismiss notifications (including the "verify your email"
 * notification itself) regardless of verification status.
 */
@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@SkipEmailVerification()
@Throttle({ default: {} })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Returns cursor-paginated notifications for the authenticated user, most recent first. */
  @Get()
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  findAll(
    @CurrentUser() user: User,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedTake = Math.min(Math.max(parseInt(take ?? '50', 10) || 50, 1), 100);
    return this.notificationsService.findAll(user.id, parsedTake, cursor);
  }

  /** Returns the count of unread notifications for the authenticated user. */
  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  /** Marks a single notification as read. Only acts on notifications owned by the requester. */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@CurrentUser() user: User, @Param('id', ParseIdPipe) id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  /** Marks all unread notifications as read for the authenticated user. */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllRead(user.id);
  }

  // ─── Notification preferences ─────────────────────────────────────────────────

  /** Returns the notification preferences for the authenticated user. Creates defaults on first call. */
  @ApiOperation({ summary: "Get the user's notification preferences" })
  @Get('preferences')
  getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  /** Partially updates notification preferences for the authenticated user. */
  @ApiOperation({ summary: "Update the user's notification preferences" })
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  updatePreferences(@CurrentUser() user: User, @Body() body: UpdateNotificationPreferencesDto) {
    return this.notificationsService.updatePreferences(user.id, body);
  }
}
