import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Messages d'une discussion publique
  findPublicDiscussionMessages(discussionId: string) {
    return this.prisma.message.findMany({
      where: { publicDiscussionId: discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
      },
    });
  }

  // Messages d'une discussion privée
  findPrivateDiscussionMessages(discussionId: string) {
    return this.prisma.message.findMany({
      where: { privateDiscussionId: discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        receiver: true,
      },
    });
  }
}


