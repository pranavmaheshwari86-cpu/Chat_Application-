import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { SearchModule } from './modules/search/search.module';
import { AiModule } from './modules/ai/ai.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule } from './modules/health/health.module';
import { PostsModule } from './modules/posts/posts.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FollowsModule } from './modules/follows/follows.module';
import { FeedModule } from './modules/feed/feed.module';
import { EventsModule } from './modules/events/events.module';
import { RedisModule } from './modules/redis/redis.module';
import { MemoryModule } from './modules/memory/memory.module';
import { RelationshipsModule } from './modules/relationships/relationships.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { StoriesModule } from './modules/stories/stories.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { CallsModule } from './modules/calls/calls.module';
import { AdminModule } from './modules/admin/admin.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import cloudinaryConfig from './config/cloudinary.config';
import throttleConfig from './config/throttle.config';
import googleConfig from './config/google.config';
import { User, UserSchema } from './modules/users/schemas/user.schema';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';

import { validate } from './config/config.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [
        databaseConfig,
        redisConfig,
        jwtConfig,
        cloudinaryConfig,
        throttleConfig,
        googleConfig,
      ],
      validate,
    }),

    // Database
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'database.uri',
          'mongodb://127.0.0.1:27017/flashchat?replicaSet=testset',
        ),
        autoIndex: process.env.NODE_ENV !== 'production',
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      }),
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttle.ttl', 60) * 1000,
          limit: configService.get<number>('throttle.limit', 100),
        },
      ],
    }),

    // BullMQ / Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password', ''),
          maxRetriesPerRequest: 3,
          enableReadyCheck: false,
          retryStrategy(times: number) {
            if (times > 3) return null;
            return Math.min(times * 200, 1000);
          },
        },
      }),
    }),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Logger
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: any) =>
          req.headers['x-correlation-id'] || req.correlationId,
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),

    // Models needed globally (for guards, etc.)
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    // Feature modules
    AuthModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    NotificationsModule,
    AttachmentsModule,
    SearchModule,
    AiModule,
    HealthModule,
    GatewayModule,
    PostsModule,
    CommentsModule,
    FollowsModule,
    FeedModule,
    EventsModule,
    RedisModule,
    MemoryModule,
    RelationshipsModule,
    CommunitiesModule,
    KnowledgeModule,
    StoriesModule,
    DiscoveryModule,
    CallsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    RolesGuard,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
