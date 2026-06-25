import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import {
  Logger,
  UseGuards,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';
import { WsThrottlerGuard } from '../common/guards/ws-throttler.guard';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import type { AuthenticatedSocket } from '@chat/shared';
import { ClientEvents, ServerEvents } from '../common/constants/socket-events';
import { SendWsMessageDto } from './dto/send-ws-message.dto';
import { ConversationsService } from '../modules/conversations/conversations.service';
import { MessagesService } from '../modules/messages/messages.service';

interface ConversationMemberPayload {
  userId: string | { _id: string; [key: string]: unknown };
}

interface ConversationPayload {
  members?: ConversationMemberPayload[];
}

interface MessagePayload {
  content?: string;
  type?: string;
  [key: string]: unknown;
}

interface ReactionPayload {
  emoji: string;
  userId: string;
  [key: string]: unknown;
}

@WebSocketGateway({ namespace: '/' })
@UseGuards(WsThrottlerGuard, WsAuthGuard)
@UseFilters(WsExceptionFilter)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('ChatGateway initialized');
    // Authentication is handled by WsAuthGuard class decorator
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        throw new Error('No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.accessSecret')
      });

      client.user = {
        userId: payload.sub,
        email: payload.email,
        username: payload.username,
        displayName: payload.displayName,
      };

      client.join(`user:${client.user.userId}`);
      this.logger.log(`Client connected: ${client.id} (User: ${client.user.userId})`);
    } catch (err) {
      this.logger.warn(`Client connection rejected without valid user: ${client.id}`);
      client.disconnect(true);
      throw err;
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('user.logout')
  handleUserLogout(payload: { userId: string }) {
    this.logger.log(`Force disconnecting logged out user: ${payload.userId}`);
    this.server.in(`user:${payload.userId}`).disconnectSockets(true);
  }

  @OnEvent('message.created')
  handleMessageCreated(payload: {
    conversationId: string;
    message: MessagePayload;
    conversation: ConversationPayload;
  }) {
    // Emit to conversation room
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_NEW, {
        conversationId: payload.conversationId,
        message: payload.message,
      });

    // Emit to members' personal rooms who are NOT in the conversation room
    if (payload.conversation?.members) {
      payload.conversation.members.forEach((member: ConversationMemberPayload) => {
        const memberUserId = typeof member.userId === 'object' ? member.userId._id : member.userId;
        const memberRoom = `user:${memberUserId.toString()}`;
        this.server
          .to(memberRoom)
          .except(`conversation:${payload.conversationId}`)
          .emit(ServerEvents.MESSAGE_NEW, {
            conversationId: payload.conversationId,
            message: payload.message,
          });
      });
    }
  }

  @OnEvent('message.edited')
  handleMessageEdited(payload: {
    conversationId: string;
    messageId: string;
    content: string;
    editedAt: Date;
    senderId?: string;
  }) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_EDITED, {
        ...payload,
        editedAt: payload.editedAt?.toISOString() || new Date().toISOString(),
      });
  }

  @OnEvent('message.deleted')
  handleMessageDeleted(payload: { conversationId: string; messageId: string }) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_DELETED, payload);
  }


  @OnEvent('message.read')
  handleMessageReadInternal(payload: {
    conversationId: string;
    userId: string;
    readAt: Date;
  }) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_SEEN, payload);
  }

  @SubscribeMessage(ClientEvents.CONVERSATION_JOIN)
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId || typeof conversationId !== 'string') {
      return { success: false, error: { code: 'ValidationError', message: 'conversationId must be a string' } };
    }
    try {
      // Validate membership before allowing room join (Fix for SEC-01)
      await this.conversationsService.getConversation(
        conversationId,
        client.user.userId,
      );
      await client.join(`conversation:${conversationId}`);
      return { success: true, conversationId };
    } catch (error) {
      this.logger.warn(
        `Unauthorized room join attempt: ${client.id} for ${conversationId}`,
      );

      return { success: false, error: { code: 'Unauthorized', message: error.message } };
    }
  }

  @SubscribeMessage(ClientEvents.CONVERSATION_LEAVE)
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    if (!conversationId) return { success: false, error: { code: 'ValidationError', message: 'conversationId is required' } };
    await client.leave(`conversation:${conversationId}`);
    return { success: true, conversationId };
  }

  @SubscribeMessage(ClientEvents.MESSAGE_SEND)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendWsMessageDto,
  ) {
    try {
      // Save message to DB via MessagesService — this persists and emits socket events

      const message = await this.messagesService.sendMessage(
        payload.conversationId,
        client.user.userId,
        {
          content: payload.content,
          type: payload.type || 'text',
          attachments: payload.attachments,
          replyToId: payload.replyToId,
        },
      );

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send message via WS: ${error.message}`);

      return { success: false, error: { code: 'InternalError', message: error.message } };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_EDIT)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { messageId: string; conversationId: string; content: string },
  ) {
    if (!payload.messageId || !payload.conversationId || !payload.content) {
      return { success: false, error: { code: 'ValidationError', message: 'Missing required fields' } };
    }
    try {
      const message = await this.messagesService.editMessage(
        payload.messageId,
        payload.conversationId,
        client.user.userId,
        { content: payload.content },
      );

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to edit message via WS: ${error.message}`);

      return { success: false, error: { code: 'InternalError', message: error.message } };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_DELETE)
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; conversationId: string },
  ) {
    if (!payload.messageId || !payload.conversationId) {
      return { success: false, error: { code: 'ValidationError', message: 'Missing required fields' } };
    }
    try {
      await this.messagesService.deleteMessage(
        payload.messageId,
        payload.conversationId,
        client.user.userId,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete message via WS: ${error.message}`);

      return { success: false, error: { code: 'InternalError', message: error.message } };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_REACT)
  async handleReactMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { messageId: string; conversationId: string; emoji: string },
  ) {
    if (!payload.messageId || !payload.conversationId || !payload.emoji) {
      return { success: false, error: { code: 'ValidationError', message: 'Missing required fields' } };
    }
    try {
      const result = await this.messagesService.reactToMessage(
        payload.messageId,
        payload.conversationId,
        client.user.userId,
        payload.emoji,
      );
      return result;
    } catch (error) {
      this.logger.warn(
        `Unauthorized reaction attempt: ${client.id} on ${payload.messageId}`,
      );
      return { success: false, error: { code: 'Unauthorized', message: error.message } };
    }
  }

  @OnEvent('message.reacted')
  handleMessageReacted(payload: {
    conversationId: string;
    messageId: string;
    reactions: ReactionPayload[];
  }) {
    this.server
      .to(`conversation:${payload.conversationId}`)
      .emit(ServerEvents.MESSAGE_REACTION, payload);
  }

  @SubscribeMessage(ClientEvents.TYPING_START)
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client.broadcast
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.TYPING_ACTIVE, {
        conversationId,
        userId: client.user.userId,
        username: client.user.username || 'Someone',
      });
  }

  @SubscribeMessage(ClientEvents.TYPING_STOP)
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    client.broadcast
      .to(`conversation:${conversationId}`)
      .emit(ServerEvents.TYPING_STOPPED, {
        conversationId,
        userId: client.user.userId,
      });
  }

  @SubscribeMessage(ClientEvents.MESSAGE_READ)
  async handleMessageRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    try {
      // Update DB
      await this.messagesService.markAsRead(conversationId, client.user.userId);

      // Broadcast to sender that messages were read
      client.broadcast
        .to(`conversation:${conversationId}`)
        .emit(ServerEvents.MESSAGE_SEEN, {
          conversationId,
          userId: client.user.userId,
          readAt: new Date(),
        });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
