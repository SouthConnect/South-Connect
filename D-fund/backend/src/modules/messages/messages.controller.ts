import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateDiscussionDto } from './dto/create-discussion.dto';

/**
 * Exposes HTTP endpoints for public discussion threads and private (1-to-1) messaging.
 *
 * Real-time delivery is handled separately by {@link ChatGateway}; the REST layer
 * persists messages and triggers Socket.IO broadcasts.
 */
@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** Returns all public discussion threads, optionally filtered by type. */
  @Get('public')
  findPublicDiscussions(@Query('type') type?: string) {
    return this.messagesService.findPublicDiscussions(type);
  }

  /** Creates a new public discussion thread. Requires authentication. */
  @Post('public')
  @UseGuards(JwtAuthGuard)
  createPublicDiscussion(@CurrentUser() user: User, @Body() dto: CreateDiscussionDto) {
    return this.messagesService.createPublicDiscussion(user.id, dto.title, dto.description);
  }

  /** Returns all private discussions for the authenticated user, including the last message preview. */
  @Get('private')
  @UseGuards(JwtAuthGuard)
  findPrivateDiscussions(@CurrentUser() user: User) {
    return this.messagesService.findPrivateDiscussionsForUser(user.id);
  }

  /** Returns messages for a public discussion thread. */
  @Get('public/:discussionId')
  findPublicMessages(@Param('discussionId') discussionId: string) {
    return this.messagesService.findPublicDiscussionMessages(discussionId);
  }

  /**
   * Returns messages for a private discussion.
   * Only participants of the discussion may access this endpoint.
   */
  @Get('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  findPrivateMessages(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.findPrivateDiscussionMessages(discussionId, user.id);
  }

  /** Posts a message to a public discussion. Rate-limited to 30 per minute. */
  @Post('public/:discussionId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ messaging: {} })
  createPublicMessage(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPublicMessage(discussionId, user.id, dto.content);
  }

  /** Posts a message to a private discussion. Rate-limited to 30 per minute. */
  @Post('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  @Throttle({ messaging: {} })
  createPrivateMessage(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPrivateMessage(discussionId, user.id, dto.content);
  }

  /**
   * Starts or retrieves a private discussion with the target user.
   * Idempotent: calling it twice for the same pair returns the existing discussion.
   */
  @Post('private/start/:targetUserId')
  @UseGuards(JwtAuthGuard)
  startPrivateDiscussion(
    @CurrentUser() user: User,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.messagesService.startPrivateDiscussion(user.id, targetUserId);
  }

  /** Marks all messages in a private discussion as read. Only participants may call this. */
  @Post('private/:discussionId/read')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  markAsRead(@CurrentUser() user: User, @Param('discussionId') discussionId: string) {
    return this.messagesService.markPrivateDiscussionAsRead(discussionId, user.id);
  }
}
