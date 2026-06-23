import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisResult<T> {
  success: boolean;
  data: T;
  redisAvailable: boolean;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password', '');

    try {
      this.client = new Redis({
        host,
        port,
        password,
        maxRetriesPerRequest: 3,
        keepAlive: 10000,
        enableReadyCheck: false,
        family: 4,
        retryStrategy(times) {
          if (times > 3) return null;
          return Math.min(times * 200, 1000);
        },
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        if (this.connected) {
          this.logger.warn('Redis Client Error (non-fatal)', err.message);
        }
      });

      this.client.on('close', () => {
        this.connected = false;
        this.logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis reconnecting...');
      });

      this.client.on('ready', () => {
        this.connected = true;
        this.logger.log('Redis connection ready');
      });

      await this.client.connect();
      this.connected = true;
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    } catch (err) {
      this.logger.error(
        `❌ Redis connection failed at ${host}:${port}: ${(err as Error).message}`,
      );
      this.client = null;
      this.connected = false;
      // Don't throw - allow graceful degradation but log clearly
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isHealthy(): boolean {
    return this.connected && this.client !== null;
  }

  // Presence methods — return explicit status when Redis is offline
  async addOnlineUser(userId: string): Promise<RedisResult<boolean>> {
    if (!this.client || !this.connected) {
      return { success: false, data: false, redisAvailable: false };
    }
    try {
      const result = await this.client.sadd('online_users', userId);
      return { success: true, data: result === 1, redisAvailable: true };
    } catch (err) {
      this.logger.warn(
        `Redis addOnlineUser failed for ${userId}: ${(err as Error).message}`,
      );
      return { success: false, data: false, redisAvailable: true };
    }
  }

  async removeOnlineUser(userId: string): Promise<RedisResult<boolean>> {
    if (!this.client || !this.connected) {
      return { success: false, data: false, redisAvailable: false };
    }
    try {
      const result = await this.client.srem('online_users', userId);
      return { success: true, data: result === 1, redisAvailable: true };
    } catch (err) {
      this.logger.warn(
        `Redis removeOnlineUser failed for ${userId}: ${(err as Error).message}`,
      );
      return { success: false, data: false, redisAvailable: true };
    }
  }

  async isUserOnline(userId: string): Promise<RedisResult<boolean>> {
    if (!this.client || !this.connected) {
      return { success: false, data: false, redisAvailable: false };
    }
    try {
      return {
        success: true,
        data: (await this.client.sismember('online_users', userId)) === 1,
        redisAvailable: true,
      };
    } catch (err) {
      this.logger.warn(
        `Redis isUserOnline failed for ${userId}: ${(err as Error).message}`,
      );
      return { success: false, data: false, redisAvailable: true };
    }
  }

  async getOnlineUsers(): Promise<RedisResult<string[]>> {
    if (!this.client || !this.connected) {
      return { success: false, data: [], redisAvailable: false };
    }
    try {
      return {
        success: true,
        data: await this.client.smembers('online_users'),
        redisAvailable: true,
      };
    } catch (err) {
      this.logger.warn(
        `Redis getOnlineUsers failed: ${(err as Error).message}`,
      );
      return { success: false, data: [], redisAvailable: true };
    }
  }
}
