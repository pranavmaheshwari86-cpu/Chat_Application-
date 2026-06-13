import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { PresenceGateway } from './presence.gateway';
import { NotificationGateway } from './notification.gateway';
import { CallGateway } from './call.gateway';
import { RedisModule } from '../modules/redis/redis.module';
import { EventsModule } from '../modules/events/events.module';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { MessagesModule } from '../modules/messages/messages.module';

@Module({
  imports: [
    JwtModule.register({}),
    RedisModule,
    EventsModule,
    ConversationsModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [ChatGateway, PresenceGateway, NotificationGateway, CallGateway],
  exports: [ChatGateway, PresenceGateway, NotificationGateway, CallGateway],
})
export class GatewayModule {}
