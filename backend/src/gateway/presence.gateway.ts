import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import {
  UseGuards,
  UseFilters,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
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
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PresenceGateway.name);
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30s
  private readonly INITIAL_SYNC_KEY_PREFIX = 'user:initial_sync:';

  constructor(
    private readonly redisService: RedisService,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(_server: Server) {
    // Authentication is handled by WsAuthGuard class decorator
    // Server-side heartbeat: send ping to all connected clients
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      // Only emit to authenticated connected clients
      const sockets = this.server.sockets?.sockets;
      if (sockets) {
        sockets.forEach((socket: AuthenticatedSocket) => {
          if (socket.connected && socket.user?.userId) {
            socket.emit('ping');
          }
        });
      }
    }, this.PING_INTERVAL);
  }

  onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
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

      // Handle client ping -> respond with pong
      client.on('ping', () => {
        client.emit('pong');
      });

      // Handle client pong (response to our ping)
      client.on('pong', () => {
        // Client responded to our ping - connection is alive
      });
    } catch (err) {
      this.logger.warn(`Client connection rejected without valid user: ${client.id}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      const result = await this.redisService.removeOnlineUser(
        client.user.userId,
      );
      if (result.success && result.data) {
        this.broadcastPresence(client.user.userId, 'offline');
      }
      // Clean up initial sync tracking in Redis
      if (this.redisService.isHealthy()) {
        await this.redisService
          .getClient()
          ?.del(`${this.INITIAL_SYNC_KEY_PREFIX}${client.user.userId}`);
      }
    }
  }

  @SubscribeMessage(ClientEvents.PRESENCE_PING)
  async handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.user) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      client.join(`user:${client.user.userId}`);

      const addedResult = await this.redisService.addOnlineUser(
        client.user.userId,
      );
      if (addedResult.success && addedResult.data) {
        this.broadcastPresence(client.user.userId, 'online');
        // Queue event for drift detection and relationship warming
        this.eventsService.emitUserOnline(client.user.userId).catch(() => {});
      }

      const userId = client.user.userId;

      // Check Redis for initial sync state (persistent across restarts)
      // If Redis is not available, we default to sending initial sync to be safe
      let isFirstPing = false;
      const redisAvailable = this.redisService.isHealthy();

      if (redisAvailable) {
        const hasSynced = await this.redisService
          .getClient()
          ?.get(`${this.INITIAL_SYNC_KEY_PREFIX}${userId}`);
        if (!hasSynced) {
          isFirstPing = true;
          await this.redisService
            .getClient()
            ?.setex(`${this.INITIAL_SYNC_KEY_PREFIX}${userId}`, 3600, '1');
        }
      } else {
        // Redis unavailable - send initial sync anyway since we can't track state
        isFirstPing = true;
      }

      if (isFirstPing) {
        // Return full online users list only on first ping
        const onlineUsersResult = await this.redisService.getOnlineUsers();
        return {
          success: true,
          onlineUsers: onlineUsersResult.data,
          redisAvailable: onlineUsersResult.redisAvailable,
          initialSync: true,
        };
      }

      // Subsequent pings: lightweight response
      return {
        success: true,
        onlineUsers: [], // Client already has initial list
        redisAvailable: redisAvailable,
        initialSync: false,
      };
    }
    return { success: true };
  }

  // TYPING_START, TYPING_STOP, and MESSAGE_READ are handled by ChatGateway

  private broadcastPresence(userId: string, status: 'online' | 'offline') {
    // Only broadcast to authenticated sockets to reduce unnecessary traffic
    const sockets = this.server.sockets?.sockets;
    if (sockets) {
      sockets.forEach((socket: AuthenticatedSocket) => {
        if (socket.connected && socket.user?.userId) {
          socket.emit(ServerEvents.PRESENCE_UPDATE, {
            userId,
            status,
            lastSeen: new Date(),
          });
        }
      });
    }
  }
}
