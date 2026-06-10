import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { UseGuards, UseFilters, Injectable } from '@nestjs/common';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import type { AuthenticatedSocket } from '@chat/shared';
import { ClientEvents, ServerEvents } from '../common/constants/socket-events';
import { RedisService } from '../modules/redis/redis.service';
import { EventsService } from '../modules/events/events.service';

@Injectable()
@WebSocketGateway({ namespace: '/' })
@UseGuards(WsAuthGuard)
@UseFilters(WsExceptionFilter)
export class PresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    // Note: client.user might not be populated until the guard runs on a specific message
    // If we want auth on connection, we need a middleware approach.
    // For now, we rely on PRESENCE_PING from the client after connection
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const removed = await this.redisService.removeOnlineUser(
        client.user.userId,
      );
      if (removed) {
        this.broadcastPresence(client.user.userId, 'offline');
      }
    }
  }

  @SubscribeMessage(ClientEvents.PRESENCE_PING)
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.user) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.join(`user:${client.user.userId}`);

      const added = await this.redisService.addOnlineUser(client.user.userId);
      if (added) {
        this.broadcastPresence(client.user.userId, 'online');
        // Queue event for drift detection and relationship warming
        this.eventsService.emitUserOnline(client.user.userId).catch(() => {});
      }

      // Return currently online users so client can sync initially
      const onlineUsers = await this.redisService.getOnlineUsers();
      return { success: true, onlineUsers };
    }
    return { success: true };
  }

  @SubscribeMessage(ClientEvents.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.TYPING_ACTIVE, {
        conversationId,
        userId: client.user.userId,
        displayName: client.user.displayName,
      });
  }

  @SubscribeMessage(ClientEvents.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.TYPING_STOPPED, {
        conversationId,
        userId: client.user.userId,
      });
  }

  @SubscribeMessage(ClientEvents.MESSAGE_READ)
  handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { conversationId: string; messageIds: string[] },
  ) {
    client
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_SEEN, {
        conversationId: payload.conversationId,
        userId: client.user.userId,
        messageIds: payload.messageIds,
      });
  }

  private broadcastPresence(userId: string, status: 'online' | 'offline') {
    this.server.emit(ServerEvents.PRESENCE_UPDATE, {
      userId,
      status,
      lastSeen: new Date(),
    });
  }
}
