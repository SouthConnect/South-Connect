import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { IsString, MaxLength, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';

/** Socket.IO client extended with the authenticated user's ID. */
interface AuthenticatedSocket extends Socket {
  userId: string;
}

class TypingPayloadDto {
  @IsString()
  @MaxLength(36)
  discussionId!: string;

  @IsString()
  @MaxLength(200)
  name!: string;
}

/**
 * WebSocket gateway for real-time chat features.
 *
 * Clients connect to the `/chat` namespace and authenticate by passing their
 * JWT in `socket.auth.token` at handshake time. The server disconnects any
 * client that does not provide a valid token.
 *
 * Room management: clients call the `join` / `leave` events with a `discussionId`
 * to subscribe or unsubscribe from a discussion room. Membership is verified before
 * joining — only participants of a discussion may subscribe to it.
 */
@WebSocketGateway({
  namespace: '/chat',
  // CORS is configured via CorsIoAdapter in main.ts — do not set here.
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** Maps userId to the set of socket IDs currently active for that user. */
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  /**
   * Verifies the JWT on connection and stores the userId on the socket instance.
   * Disconnects immediately when the token is missing or invalid.
   */
  handleConnection(client: Socket) {
    try {
      // Priority: auth.token (legacy / Postman) → Authorization header → HttpOnly cookie
      const cookieHeader: string = (client.handshake.headers.cookie as string) || '';
      const cookieMatch = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

      const raw =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization || '').replace('Bearer ', '') ||
        cookieToken;

      if (!raw) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ userId: string }>(raw);
      (client as AuthenticatedSocket).userId = payload.userId;

      if (!this.onlineUsers.has(payload.userId)) {
        this.onlineUsers.set(payload.userId, new Set());
      }
      this.onlineUsers.get(payload.userId)!.add(client.id);

      this.logger.log(`Connected: ${payload.userId} (socket ${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  /** Removes the socket from the online-users map on disconnection. */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId: string = client.userId;
    if (!userId) return;

    const sockets = this.onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) this.onlineUsers.delete(userId);
    }

    this.logger.log(`Disconnected: ${userId} (socket ${client.id})`);
  }

  /**
   * Subscribes the client socket to a discussion room after verifying membership.
   * Throws WsException (closes the connection cleanly) if the user is not a participant.
   */
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() discussionId: unknown,
  ) {
    if (typeof discussionId !== 'string' || discussionId.length > 36 || !discussionId.trim()) {
      throw new WsException('Invalid discussionId');
    }
    const allowed = await this.messagesService.isParticipant(client.userId, discussionId);
    if (!allowed) throw new WsException('Unauthorized');
    client.join(discussionId);
  }

  /** Unsubscribes the client socket from a discussion room. */
  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() discussionId: unknown) {
    if (typeof discussionId !== 'string' || discussionId.length > 36) return;
    client.leave(discussionId);
  }

  /**
   * Relays a typing indicator to all other sockets in the discussion room.
   * Payload is validated with class-validator before broadcasting.
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const payload = plainToInstance(TypingPayloadDto, raw);
    const errors = validateSync(payload);
    if (errors.length) throw new WsException('Invalid payload');

    client.to(payload.discussionId).emit('typing', {
      userId: client.userId,
      name: payload.name,
    });
  }

  /**
   * Relays a stop-typing signal to all other sockets in the discussion room.
   */
  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() discussionId: unknown,
  ) {
    if (typeof discussionId !== 'string' || discussionId.length > 36) return;
    client.to(discussionId).emit('stopTyping', { userId: client.userId });
  }

  /**
   * Broadcasts a new message to all sockets subscribed to the given discussion room.
   * Called by {@link MessagesService} after a message is persisted.
   */
  broadcastMessage(discussionId: string, message: unknown) {
    this.server.to(discussionId).emit('newMessage', message);
  }

  /**
   * Sends a real-time event directly to all active sockets of a specific user.
   * Used for personal notifications (application reviewed, new message, etc.).
   */
  sendToUser(userId: string, event: string, payload: unknown) {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets || sockets.size === 0) return;
    for (const socketId of sockets) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  /** Returns whether the given user has at least one active socket connection. */
  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
