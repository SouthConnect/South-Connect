import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateDiscussionDto } from './dto/create-discussion.dto';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('public')
  findPublicDiscussions(@Query('type') type?: string) {
    return this.messagesService.findPublicDiscussions(type);
  }

  @Post('public')
  @UseGuards(JwtAuthGuard)
  createPublicDiscussion(
    @CurrentUser() user: User,
    @Body() dto: CreateDiscussionDto,
  ) {
    return this.messagesService.createPublicDiscussion(user.id, dto.title, dto.description);
  }

  @Get('private')
  @UseGuards(JwtAuthGuard)
  findPrivateDiscussions(@CurrentUser() user: User) {
    return this.messagesService.findPrivateDiscussionsForUser(user.id);
  }

  @Get('public/:discussionId')
  findPublic(@Param('discussionId') discussionId: string) {
    return this.messagesService.findPublicDiscussionMessages(discussionId);
  }

  @Get('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  findPrivate(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.findPrivateDiscussionMessages(discussionId, user.id);
  }

  @Post('public/:discussionId')
  @UseGuards(JwtAuthGuard)
  createPublicMessage(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPublicMessage(discussionId, user.id, dto.content);
  }

  @Post('private/:discussionId')
  @UseGuards(JwtAuthGuard)
  createPrivateMessage(
    @Param('discussionId') discussionId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createPrivateMessage(discussionId, user.id, dto.content);
  }

  @Post('private/start/:targetUserId')
  @UseGuards(JwtAuthGuard)
  startPrivateDiscussion(
    @CurrentUser() user: User,
    @Param('targetUserId') targetUserId: string,
  ) {
    return this.messagesService.startPrivateDiscussion(user.id, targetUserId);
  }

  @Post('private/:discussionId/read')
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @CurrentUser() user: User,
    @Param('discussionId') discussionId: string,
  ) {
    return this.messagesService.markPrivateDiscussionAsRead(discussionId, user.id);
  }
}

