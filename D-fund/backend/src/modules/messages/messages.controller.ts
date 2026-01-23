import { Controller, Get, Param } from '@nestjs/common';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('public/:discussionId')
  findPublic(@Param('discussionId') discussionId: string) {
    return this.messagesService.findPublicDiscussionMessages(discussionId);
  }

  @Get('private/:discussionId')
  findPrivate(@Param('discussionId') discussionId: string) {
    return this.messagesService.findPrivateDiscussionMessages(discussionId);
  }
}


