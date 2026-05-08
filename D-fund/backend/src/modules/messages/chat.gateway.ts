import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/** Socket.IO client extended with the authenticated user's ID. */
interface AuthenticatedSocket extends Socket {
  userId: string;
}

/**
 * WebSocket gateway for real-time chat features.
 *
 * Clients connect to the `/chat` namespace and authenticate by passing their
 * JWT in `socket.auth.token` at handshake time. The server disconnects any
 * client that does not provide a valid token.
 *
 * Room management: clients call the `join` / `leave` events with a `discussionId`
 * to subscribe or unsubscribe from a discussion room. Messages are broadcast to
 * all sockets in the room via {@link broadcastMessage}.
 */
@WebSocketGateway({
  namespace: '/chat',
  // CORS is configured via CorsIoAdapter in main.ts — do not set here.
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  /** Maps userId to the set of socket IDs currently active for that user. */
  private readonly onlineUsers = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

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

  /** Subscribes the client socket to a discussion room. */
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() discussionId: string) {
    client.join(discussionId);
  }

  /** Unsubscribes the client socket from a discussion room. */
  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() discussionId: string) {
    client.leave(discussionId);
  }

  /**
   * Relays a typing indicator to all other sockets in the discussion room.
   *
   * @param payload.discussionId - Target room (discussion ID).
   * @param payload.name         - Display name of the typing user.
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { discussionId: string; name: string },
  ) {
    client.to(payload.discussionId).emit('typing', {
      userId: client.userId,
      name: payload.name,
    });
  }

  /**
   * Relays a stop-typing signal to all other sockets in the discussion room.
   *
   * @param discussionId - Target room (discussion ID).
   */
  @SubscribeMessage('stopTyping')
  handleStopTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() discussionId: string,
  ) {
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
   *
   * @param userId  - Target user ID.
   * @param event   - Socket.IO event name (e.g. 'notification').
   * @param payload - Any serialisable data to deliver.
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
