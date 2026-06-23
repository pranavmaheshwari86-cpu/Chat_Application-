import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter implements OnModuleDestroy {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);
  private redisAvailable = false;

  constructor(
    app: INestApplication,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password', '');

    try {
      const pubClient = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 3,
        keepAlive: 10000,
        enableReadyCheck: false,
        family: 4,
        retryStrategy(times) {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });
      const subClient = pubClient.duplicate();

      pubClient.on('error', (err) =>
        this.logger.error('Redis Pub Client Error', err.message),
      );
      subClient.on('error', (err) =>
        this.logger.error('Redis Sub Client Error', err.message),
      );

      await pubClient.connect();
      await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.redisAvailable = true;
      this.logger.log(`Connected to Redis Adapter at ${host}:${port}`);
    } catch (err) {
      this.redisAvailable = false;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Redis connection failed - WebSocket multi-server support disabled: ${errorMsg}`,
      );
      throw err; // Re-throw to prevent silent fallback
    }
  }

  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  onModuleDestroy() {
    // Cleanup handled by NestJS
  }

  createIOServer(port: number, options?: ServerOptions): SocketIOServer {
    const clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );

    const clientUrls = clientUrl.split(',').map(url => url.trim());

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: clientUrls,
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
