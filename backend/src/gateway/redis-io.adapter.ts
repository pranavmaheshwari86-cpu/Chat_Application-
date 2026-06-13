import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(
    app: any,
    private configService: ConfigService,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
        this.logger.warn('Redis Pub Client Error (non-fatal)', err.message),
      );
      subClient.on('error', (err) =>
        this.logger.warn('Redis Sub Client Error (non-fatal)', err.message),
      );

      await pubClient.connect();
      await subClient.connect();

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log(`Connected to Redis Adapter at ${host}:${port}`);
    } catch {
      this.logger.warn(
        `⚠️  Redis not available at ${host}:${port}. Falling back to in-memory Socket.IO adapter. WebSocket features will work on a single server instance.`,
      );
      this.adapterConstructor = null;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const clientUrl = this.configService.get<string>(
      'CLIENT_URL',
      'http://localhost:3000',
    );

    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: [clientUrl],
        credentials: true,
      },
    });

    if (this.adapterConstructor) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
