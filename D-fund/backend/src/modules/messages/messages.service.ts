import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createPublicDiscussion(ownerId: string, title: string, description?: string) {
    return this.prisma.publicDiscussion.create({
      data: {
        ownerId,
        title,
        description,
        type: 'OPEN_FORUM' as any,
        lastMessageAt: new Date(),
      },
      include: {
        owner: {
          select: { id: true, name: true, profilePic: true },
        },
      },
    });
  }

  findPublicDiscussions(type?: string) {
    const where: Prisma.PublicDiscussionWhereInput = {};

    if (type === 'OPEN_FORUM' || type === 'OPPORTUNITY_RELATED') {
      where.type = type as any;
    }

    return this.prisma.publicDiscussion.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            profilePic: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            name: true,
            image: true,
            backgroundImage: true,
          },
        },
      },
    });
  }

  findPrivateDiscussionsForUser(userId: string) {
    return this.prisma.privateDiscussion.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
        },
      },
    });
  }

  findPublicDiscussionMessages(discussionId: string) {
    return this.prisma.message.findMany({
      where: { publicDiscussionId: discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
      },
    });
  }

  async findPrivateDiscussionMessages(discussionId: string, requesterId: string) {
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: { participants: true },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const isParticipant = discussion.participants.some((p) => p.userId === requesterId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not allowed to read this discussion');
    }

    return this.prisma.message.findMany({
      where: { privateDiscussionId: discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: true,
        receiver: true,
      },
    });
  }

  async startPrivateDiscussion(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('You cannot start a conversation with yourself');
    }

    const existing = await this.prisma.privateDiscussion.findFirst({
      where: {
        participants: {
          every: {
            userId: {
              in: [currentUserId, targetUserId],
            },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.privateDiscussion.create({
      data: {
        participants: {
          create: [
            { userId: currentUserId },
            { userId: targetUserId },
          ],
        },
        lastMessageAt: new Date(),
      },
      include: {
        participants: true,
      },
    });
  }

  async createPublicMessage(discussionId: string, senderId: string, content: string) {
    const discussion = await this.prisma.publicDiscussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        publicDiscussionId: discussionId,
      },
    });

    await this.prisma.publicDiscussion.update({
      where: { id: discussionId },
      data: {
        lastMessageAt: new Date(),
        messagesCount: {
          increment: 1,
        },
      },
    });

    return message;
  }

  async markPrivateDiscussionAsRead(discussionId: string, userId: string) {
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: { participants: true },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const isParticipant = discussion.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not allowed to access this discussion');
    }

    await this.prisma.privateDiscussion.update({
      where: { id: discussionId },
      data: { unreadCount: 0 },
    });

    return { success: true };
  }

  async createPrivateMessage(discussionId: string, senderId: string, content: string) {
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: {
        participants: true,
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const isParticipant = discussion.participants.some((p) => p.userId === senderId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not allowed to post in this discussion');
    }

    const otherParticipant = discussion.participants.find((p) => p.userId !== senderId);

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: otherParticipant?.userId,
        privateDiscussionId: discussionId,
      },
    });

    await this.prisma.privateDiscussion.update({
      where: { id: discussionId },
      data: {
        lastMessageAt: new Date(),
        unreadCount: {
          increment: 1,
        },
      },
    });

    return message;
  }
}

