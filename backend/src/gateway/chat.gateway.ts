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
  forwardRef,
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
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('ChatGateway initialized');

    // Use Socket.io middleware to authenticate BEFORE connection is established
    server.use((socket: AuthenticatedSocket, next) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          let token = '';
          const authHeader = socket.handshake.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
          } else if (socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
          }

          if (!token) {
            next(new Error('Authentication error'));
            return;
          }

          const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
          const payload = await this.jwtService.verifyAsync(token, { secret });

          socket.user = {
            userId: payload.sub,
            email: payload.email,
            username: payload.username,
            displayName: payload.displayName,
          };

          next();
        } catch (err) {
          next(new Error('Authentication error'));
        }
      })();
    });
  }

  handleConnection(client: AuthenticatedSocket) {
    if (!client.user) {
      this.logger.warn(`Client connected without user object: ${client.id}`);
      client.disconnect();
      return;
    }

    // Join personal room for real-time alerts across all conversations
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    client.join(`user:${client.user.userId}`);
    this.logger.log(
      `Client connected and joined personal room: ${client.id} (User: ${client.user.userId})`,
    );
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @OnEvent('user.logout')
  handleUserLogout(payload: { userId: string }) {
    for (const [id, socket] of this.server.sockets.sockets as unknown as Map<
      string,
      AuthenticatedSocket
    >) {
      if (socket.user && socket.user.userId === payload.userId) {
        this.logger.log(
          `Force disconnecting logged out user: ${payload.userId}`,
        );
        socket.disconnect(true);
      }
    }
  }

  @SubscribeMessage(ClientEvents.CONVERSATION_JOIN)
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    try {
      // Validate membership before allowing room join (Fix for SEC-01)
      await this.conversationsService.getConversation(
        conversationId,
        client.user.userId,
      );
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.join(`conversation:${conversationId}`);
      return { success: true, conversationId };
    } catch (error) {
      this.logger.warn(
        `Unauthorized room join attempt: ${client.id} for ${conversationId}`,
      );

      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage(ClientEvents.CONVERSATION_LEAVE)
  handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody('conversationId') conversationId: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    client.leave(`conversation:${conversationId}`);
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

      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_EDIT)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { messageId: string; conversationId: string; content: string },
  ) {
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

      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_DELETE)
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId: string; conversationId: string },
  ) {
    try {
      await this.messagesService.deleteMessage(
        payload.messageId,
        payload.conversationId,
        client.user.userId,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete message via WS: ${error.message}`);

      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage(ClientEvents.MESSAGE_REACT)
  async handleReactMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: { messageId: string; conversationId: string; emoji: string },
  ) {
    try {
      // Verify membership before allowing reaction broadcast
      await this.conversationsService.getConversation(
        payload.conversationId,
        client.user.userId,
      );

      const reaction = {
        userId: client.user.userId,
        emoji: payload.emoji,
        createdAt: new Date(),
      };

      this.server
        .to(`conversation:${payload.conversationId}`)
        .emit(ServerEvents.MESSAGE_REACTION, {
          conversationId: payload.conversationId,
          messageId: payload.messageId,
          reactions: [reaction],
        });
      return { success: true };
    } catch (error) {
      this.logger.warn(
        `Unauthorized reaction attempt: ${client.id} on ${payload.messageId}`,
      );

      return { success: false, error: error.message };
    }
  }
}
