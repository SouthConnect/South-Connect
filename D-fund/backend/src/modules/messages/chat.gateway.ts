import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { IsString, MaxLength, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { forwardRef, Inject, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type Redis from 'ioredis';
import { MessagesService } from './messages.service';
import { REDIS_CLIENT } from '../redis/redis.module';

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
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** Maps userId to the set of socket IDs currently active for that user (local sockets only). */
  private readonly onlineUsers = new Map<string, Set<string>>();

  /** Held so it can be disconnected on gateway destroy (prevents Redis connection leak). */
  private redisSubClient: Redis | null = null;

  /** Interval that periodically purges socket IDs no longer tracked by Socket.IO. */
  private sanitizeInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null,
  ) {}

  onModuleDestroy() {
    if (this.sanitizeInterval) clearInterval(this.sanitizeInterval);
    this.redisSubClient?.disconnect();
  }

  /**
   * Attaches the Redis pub/sub adapter after the Socket.IO server is created.
   * With the adapter, `server.to(room).emit(...)` and `server.to(socketId).emit(...)`
   * are automatically forwarded to all backend instances via Redis pub/sub.
   * Without Redis (dev / test), the gateway works as a single-instance in-memory server.
   */
  async afterInit(server: Server) {
    if (this.redis) {
      try {
        const pubClient = this.redis;
        const subClient = this.redis.duplicate();
        // Silence connection errors on the subscriber duplicate — the main client
        // already handles reconnect; errors here are surfaced via the pub client.
        subClient.on('error', () => {});
        this.redisSubClient = subClient; // keep reference for cleanup on destroy
        server.adapter(createAdapter(pubClient, subClient));
        this.logger.log('Socket.IO Redis adapter attached (multi-instance mode)');
      } catch (err: any) {
        this.logger.warn(`Failed to attach Redis adapter — falling back to in-memory: ${err.message}`);
      }
    }

    // Periodic sanitization: remove socket IDs that Socket.IO no longer tracks.
    // Guards against missed disconnect events (e.g. abrupt process restarts).
    this.sanitizeInterval = setInterval(() => {
      // Guard: server.sockets.sockets can be undefined during shutdown or
      // before the namespace is fully initialised — bail out rather than crash.
      const connected = this.server?.sockets?.sockets;
      if (!connected) return;
      for (const [userId, sockets] of this.onlineUsers) {
        for (const socketId of sockets) {
          if (!connected.has(socketId)) {
            sockets.delete(socketId);
          }
        }
        if (sockets.size === 0) this.onlineUsers.delete(userId);
      }
    }, 5 * 60 * 1000); // every 5 minutes
  }

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

      // Join the user's personal room so sendToUser works in multi-instance mode via Redis adapter
      (client as AuthenticatedSocket).join(`user:${payload.userId}`);

      this.logger.log(`Connected: ${payload.userId} (socket ${client.id})`);
    } catch (err: any) {
      // Inform the client explicitly so it can trigger a token refresh
      // instead of just retrying with the same expired token.
      if (err?.name === 'TokenExpiredError') {
        client.emit('tokenExpired');
      }
      client.disconnect();
    }
  }

  /** Removes the socket from the online-users map on disconnection. */
  handleDisconnect(client: AuthenticatedSocket) {
    const userId: string = client.userId;
    if (!userId) return;

    // Broadcast stopTyping to every room this socket was in so the "typing…"
    // indicator never gets stuck when a connection drops unexpectedly.
    for (const roomId of client.rooms) {
      if (roomId !== client.id) {
        client.to(roomId).emit('stopTyping', { userId });
      }
    }

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
   * Membership is verified so only participants can send typing events.
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() raw: unknown,
  ) {
    const payload = plainToInstance(TypingPayloadDto, raw);
    const errors = validateSync(payload);
    if (errors.length) throw new WsException('Invalid payload');

    const allowed = await this.messagesService.isParticipant(client.userId, payload.discussionId);
    if (!allowed) return; // silently ignore unauthorized typing events

    // Rate limit: 1 typing event per user per discussion per second to prevent spam.
    if (this.redis) {
      const rateKey = `typing:rate:${client.userId}:${payload.discussionId}`;
      const isNew = await this.redis.set(rateKey, '1', 'EX', 1, 'NX').catch(() => 'OK');
      if (isNew !== 'OK') return; // throttled — drop event silently
    }

    client.to(payload.discussionId).emit('typing', {
      userId: client.userId,
      name: payload.name,
    });
  }

  /**
   * Relays a stop-typing signal to all other sockets in the discussion room.
   * Membership is verified so only participants can send stop-typing events.
   */
  @SubscribeMessage('stopTyping')
  async handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() discussionId: unknown,
  ) {
    if (typeof discussionId !== 'string' || discussionId.length > 36) return;

    const allowed = await this.messagesService.isParticipant(client.userId, discussionId);
    if (!allowed) return; // silently ignore unauthorized stop-typing events

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
   * Sends a real-time event directly to a specific user.
   * Uses the personal room (`user:<userId>`) so the event is forwarded to all
   * backend instances via the Redis adapter in multi-instance deployments.
   */
  sendToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Returns whether the given user has at least one active socket connection. */
  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
