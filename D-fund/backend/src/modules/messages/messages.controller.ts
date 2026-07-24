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
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SkipEmailVerification } from '../../common/decorators/skip-email-verification.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseIdPipe } from '../../common/pipes/parse-id.pipe';
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
@Throttle({ default: {} })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /** Returns public discussion threads. Supports ?type, ?take (max 100), ?skip. */
  @Get('public')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findPublicDiscussions(
    @Query('type') type?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.messagesService.findPublicDiscussions(
      type,
      take ? parseInt(take, 10) : 50,
      skip ? parseInt(skip, 10) : 0,
    );
  }

  /** Creates a new public discussion thread. Requires authentication. */
  @Post('public')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @Throttle({ auth: {} })
  createPublicDiscussion(@CurrentUser() user: User, @Body() dto: CreateDiscussionDto) {
    return this.messagesService.createPublicDiscussion(user.id, dto.title, dto.description);
  }

  /** Returns all private discussions for the authenticated user, including the last message preview. */
  @Get('private')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  findPrivateDiscussions(@CurrentUser() user: User) {
    return this.messagesService.findPrivateDiscussionsForUser(user.id);
  }

  /** Returns messages for a public discussion thread. */
  @Get('public/:discussionId')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  findPublicMessages(@Param('discussionId', ParseIdPipe) discussionId: string) {
    return this.messagesService.findPublicDiscussionMessages(discussionId);
  }

  /**
   * Returns messages for a private discussion.
   * Only participants of the discussion may access this endpoint.
   */
  @Get('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  findPrivateMessages(
    @Param('discussionId', ParseIdPipe) discussionId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.findPrivateDiscussionMessages(discussionId, user.id);
  }

  /** Posts a message to a public discussion. Rate-limited to 30 per minute. */
  @Post('public/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @Throttle({ messaging: {} })
  createPublicMessage(
    @Param('discussionId', ParseIdPipe) discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPublicMessage(
      discussionId,
      user.id,
      dto.content,
      dto.clientMessageId,
    );
  }

  /** Posts a message to a private discussion. Rate-limited to 30 per minute. */
  @Post('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @Throttle({ messaging: {} })
  createPrivateMessage(
    @Param('discussionId', ParseIdPipe) discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPrivateMessage(
      discussionId,
      user.id,
      dto.content,
      dto.clientMessageId,
    );
  }

  /**
   * Starts or retrieves a private discussion with the target user.
   * Idempotent: calling it twice for the same pair returns the existing discussion.
   * Email verification not required — messaging is a basic social action.
   */
  @Post('private/start/:targetUserId')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @Throttle({ auth: {} })
  startPrivateDiscussion(
    @CurrentUser() user: User,
    @Param('targetUserId', ParseIdPipe) targetUserId: string,
  ) {
    return this.messagesService.startPrivateDiscussion(user.id, targetUserId);
  }

  /** Marks all messages in a private discussion as read. Only participants may call this. */
  @Post('private/:discussionId/read')
  @UseGuards(JwtAuthGuard)
  @SkipEmailVerification()
  @HttpCode(HttpStatus.OK)
  markAsRead(@CurrentUser() user: User, @Param('discussionId', ParseIdPipe) discussionId: string) {
    return this.messagesService.markPrivateDiscussionAsRead(discussionId, user.id);
  }
}
