import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, UseGuards, UseFilters } from '@nestjs/common';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import { ServerEvents } from '../common/constants/socket-events';

@Injectable()
@WebSocketGateway({ namespace: '/' })
@UseGuards(WsAuthGuard)
@UseFilters(WsExceptionFilter)
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  // This gateway primarily exists for the server to push notifications
  // to specific users. Clients don't send events to this gateway directly.

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit(ServerEvents.NOTIFICATION_NEW, {
      notification,
    });
  }

  sendConversationUpdate(conversationId: string, updateData: any) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.CONVERSATION_UPDATED, {
        conversation: updateData,
      });
  }
}
