import { BadRequestException, ForbiddenException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DiscussionType, Prisma } from '@prisma/client';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from './chat.gateway';
import { REDIS_CLIENT } from '../redis/redis.module';

/**
 * Handles all messaging logic: public discussion threads and private (1-to-1) discussions.
 *
 * Every mutation that creates a message also broadcasts a real-time `newMessage` event
 * via {@link ChatGateway} so connected Socket.IO clients receive updates without polling.
 */
const DEDUP_TTL_SECONDS = 60;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  private async dedupGet(key: string): Promise<any | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(`msgdedup:${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private async dedupSet(key: string, value: any): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(`msgdedup:${key}`, JSON.stringify(value), 'EX', DEDUP_TTL_SECONDS);
    } catch {
      // Non-critical: a missed dedup entry may cause a duplicate insert on retry,
      // which is far less harmful than blocking message delivery.
    }
  }

  /** Creates a new public discussion thread owned by the given user. */
  createPublicDiscussion(ownerId: string, title: string, description?: string) {
    return this.prisma.publicDiscussion.create({
      data: {
        ownerId,
        title,
        description,
        type: DiscussionType.OPEN_FORUM,
        lastMessageAt: new Date(),
      },
      include: { owner: { select: { id: true, name: true, profilePic: true } } },
    });
  }

  /**
   * Returns all public discussion threads, optionally filtered by type.
   *
   * @param type - Optional filter: 'OPEN_FORUM' or 'OPPORTUNITY_RELATED'.
   */
  /** Returns true when userId is a participant of a private discussion OR the owner of a public one. */
  async isParticipant(userId: string, discussionId: string): Promise<boolean> {
    const [priv, pub] = await Promise.all([
      this.prisma.participant.findFirst({ where: { userId, discussionId } }),
      this.prisma.publicDiscussion.findFirst({ where: { id: discussionId } }),
    ]);
    // Public discussions are open to all authenticated users; private ones require membership
    return Boolean(priv) || Boolean(pub);
  }

  findPublicDiscussions(type?: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    const where: Prisma.PublicDiscussionWhereInput = {};

    if (type === DiscussionType.OPEN_FORUM || type === DiscussionType.OPPORTUNITY_RELATED) {
      where.type = type;
    }

    return this.prisma.publicDiscussion.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: cappedTake,
      skip: cappedSkip,
      include: {
        owner: { select: { id: true, name: true, profilePic: true } },
        opportunity: { select: { id: true, name: true, image: true, backgroundImage: true } },
      },
    });
  }

  /**
   * Returns all private discussions for a user, including the most recent message
   * in each thread for use as a preview in the inbox list.
   */
  findPrivateDiscussionsForUser(userId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    return this.prisma.privateDiscussion.findMany({
      where: { participants: { some: { userId } } },
      orderBy: { lastMessageAt: 'desc' },
      take: cappedTake,
      skip: cappedSkip,
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, profilePic: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, senderId: true, createdAt: true },
        },
      },
    });
  }

  /**
   * Returns messages for a public discussion, ordered chronologically.
   *
   * @param discussionId - ID of the public discussion.
   * @param take         - Maximum number of messages to return (default 100).
   * @param skip         - Number of messages to skip for pagination.
   */
  findPublicDiscussionMessages(discussionId: string, take = 50, skip = 0) {
    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    return this.prisma.message.findMany({
      where: { publicDiscussionId: discussionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: cappedTake,
      skip: cappedSkip,
      include: { sender: { select: { id: true, name: true, profilePic: true } } },
    });
  }

  /**
   * Returns messages for a private discussion, ordered chronologically.
   * Only participants may read the discussion.
   *
   * @throws NotFoundException  when the discussion does not exist.
   * @throws ForbiddenException when the requester is not a participant.
   */
  async findPrivateDiscussionMessages(discussionId: string, requesterId: string, take = 50, skip = 0) {
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: { participants: true },
    });

    if (!discussion) throw new NotFoundException('Discussion not found');

    if (!discussion.participants.some((p) => p.userId === requesterId)) {
      throw new ForbiddenException('You are not allowed to read this discussion');
    }

    const cappedTake = Math.min(Math.max(take, 1), 100);
    const cappedSkip = Math.max(skip, 0);
    return this.prisma.message.findMany({
      where: { privateDiscussionId: discussionId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: cappedTake,
      skip: cappedSkip,
      include: { sender: { select: { id: true, name: true, profilePic: true } } },
    });
  }

  /**
   * Starts a private discussion between two users.
   * Idempotent: returns the existing discussion when one already exists for the pair.
   *
   * Uses a database transaction to prevent duplicate discussions when two
   * concurrent requests arrive at the same time (race condition guard).
   *
   * @throws ForbiddenException when a user attempts to message themselves.
   */
  async startPrivateDiscussion(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new ForbiddenException('You cannot start a conversation with yourself');
    }

    // Verify the target user exists and is not banned before touching the DB
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isBanned: true },
    });
    if (!targetUser) throw new NotFoundException('User not found');
    if (targetUser.isBanned) throw new BadRequestException('Cannot message this user');

    return this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to eliminate the TOCTOU window
      const existing = await tx.privateDiscussion.findFirst({
        where: {
          AND: [
            { participants: { some: { userId: currentUserId } } },
            { participants: { some: { userId: targetUserId } } },
          ],
        },
        include: { participants: true },
      });

      if (existing) return existing;

      return tx.privateDiscussion.create({
        data: {
          participants: {
            create: [{ userId: currentUserId }, { userId: targetUserId }],
          },
          lastMessageAt: new Date(),
        },
        include: { participants: true },
      });
    });
  }

  /**
   * Posts a message to a public discussion and broadcasts it to all connected
   * Socket.IO clients subscribed to the discussion room.
   *
   * @throws NotFoundException when the discussion does not exist.
   */
  async createPublicMessage(discussionId: string, senderId: string, content: string, clientMessageId?: string) {
    // Idempotency: return the same message if the client retries
    if (clientMessageId) {
      const cached = await this.dedupGet(`pub:${senderId}:${clientMessageId}`);
      if (cached) return cached;
    }

    // Verify sender is active (not deleted or banned) before persisting
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { isBanned: true, deletedAt: true },
    });
    if (!sender) throw new ForbiddenException('Sender not found');
    if (sender.deletedAt) throw new ForbiddenException('Your account has been deleted');
    if (sender.isBanned) throw new ForbiddenException('Your account has been suspended');

    const discussion = await this.prisma.publicDiscussion.findUnique({
      where: { id: discussionId },
      select: { id: true, opportunityId: true },
    });
    if (!discussion) throw new NotFoundException('Discussion not found');

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: { content, senderId, publicDiscussionId: discussionId, clientMessageId: clientMessageId ?? null },
        include: { sender: { select: { id: true, name: true, profilePic: true } } },
      });
      await tx.publicDiscussion.update({
        where: { id: discussionId },
        data: { lastMessageAt: new Date(), messagesCount: { increment: 1 } },
      });
      return msg;
    });

    // Maintenir Opportunity.messagesCount si la discussion est liée à une opportunité (fire-and-forget)
    if (discussion.opportunityId) {
      this.prisma.opportunity
        .updateMany({ where: { id: discussion.opportunityId }, data: { messagesCount: { increment: 1 } } })
        .catch(() => undefined);
    }

    this.chatGateway.broadcastMessage(discussionId, message);

    if (clientMessageId) {
      await this.dedupSet(`pub:${senderId}:${clientMessageId}`, message);
    }

    return message;
  }

  /**
   * Resets the unread counter for a private discussion.
   * Only participants may mark a discussion as read.
   *
   * @throws NotFoundException  when the discussion does not exist.
   * @throws ForbiddenException when the requester is not a participant.
   */
  async markPrivateDiscussionAsRead(discussionId: string, userId: string) {
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: { participants: true },
    });

    if (!discussion) throw new NotFoundException('Discussion not found');

    if (!discussion.participants.some((p) => p.userId === userId)) {
      throw new ForbiddenException('You are not allowed to access this discussion');
    }

    await this.prisma.participant.updateMany({
      where: { userId, discussionId },
      data: { unreadCount: 0 },
    });

    return { success: true };
  }

  /**
   * Posts a message to a private discussion, broadcasts it via Socket.IO, and
   * sends both an in-app notification and an email notification to the recipient.
   *
   * Notifications are non-critical and run inside a try/catch to prevent failures
   * from blocking the message delivery.
   *
   * @throws NotFoundException  when the discussion does not exist.
   * @throws ForbiddenException when the sender is not a participant.
   */
  async createPrivateMessage(discussionId: string, senderId: string, content: string, clientMessageId?: string) {
    // Idempotency: return the same message if the client retries
    if (clientMessageId) {
      const cached = await this.dedupGet(`priv:${senderId}:${clientMessageId}`);
      if (cached) return cached;
    }
    const discussion = await this.prisma.privateDiscussion.findUnique({
      where: { id: discussionId },
      include: { participants: true },
    });

    if (!discussion) throw new NotFoundException('Discussion not found');

    if (!discussion.participants.some((p) => p.userId === senderId)) {
      throw new ForbiddenException('You are not allowed to post in this discussion');
    }

    // Verify sender is active before persisting
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { isBanned: true, deletedAt: true },
    });
    if (!sender) throw new ForbiddenException('Sender not found');
    if (sender.deletedAt) throw new ForbiddenException('Your account has been deleted');
    if (sender.isBanned) throw new ForbiddenException('Your account has been suspended');

    const otherParticipant = discussion.participants.find((p) => p.userId !== senderId);

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          content,
          senderId,
          receiverId: otherParticipant?.userId,
          privateDiscussionId: discussionId,
          clientMessageId: clientMessageId ?? null,
        },
        include: { sender: { select: { id: true, name: true, profilePic: true } } },
      });
      await tx.privateDiscussion.update({
        where: { id: discussionId },
        data: { lastMessageAt: new Date() },
      });
      return msg;
    });

    this.chatGateway.broadcastMessage(discussionId, message);

    if (otherParticipant) {
      try {
        await this.prisma.participant.updateMany({
          where: { userId: otherParticipant.userId, discussionId },
          data: { unreadCount: { increment: 1 } },
        });

        // Always push a lightweight badge-update event to the recipient's socket,
        // regardless of their in-app notification preferences. This keeps the
        // unread-chat badge in sync even when inAppNewMessage is disabled.
        this.chatGateway.sendToUser(otherParticipant.userId, 'chatBadgeUpdate', { discussionId });

        const [sender, recipient] = await Promise.all([
          this.prisma.user.findUnique({ where: { id: senderId }, select: { name: true } }),
          this.prisma.user.findUnique({ where: { id: otherParticipant.userId } }),
        ]);

        const preview = content.length > 80 ? content.slice(0, 80) + '...' : content;
        const senderName = sender?.name ?? 'Someone';

        await this.notificationsService.createInApp(
          otherParticipant.userId,
          'NEW_MESSAGE',
          `New message from ${senderName}`,
          preview,
          `/chat/private/${discussionId}`,
        );

        if (recipient) {
          this.notificationsService
            .sendNewMessageEmail(recipient, senderName, preview, discussionId)
            .catch((err) => this.logger.error(`Failed to send message email: ${err.message}`));
        }
      } catch (err) {
        this.logger.error(`Failed to create message notification: ${err.message}`);
      }
    }

    if (clientMessageId) {
      await this.dedupSet(`priv:${senderId}:${clientMessageId}`, message);
    }

    return message;
  }
}
