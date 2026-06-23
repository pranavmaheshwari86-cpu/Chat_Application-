import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { PresenceGateway } from './presence.gateway';
import { NotificationGateway } from './notification.gateway';
import { CallGateway } from './call.gateway';
import { RedisModule } from '../modules/redis/redis.module';
import { EventsModule } from '../modules/events/events.module';
import { ConversationsModule } from '../modules/conversations/conversations.module';
import { MessagesModule } from '../modules/messages/messages.module';
import { User, UserSchema } from '../modules/users/schemas/user.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RedisModule,
    EventsModule,
    ConversationsModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [ChatGateway, PresenceGateway, NotificationGateway, CallGateway],
  exports: [ChatGateway, PresenceGateway, NotificationGateway, CallGateway],
})
export class GatewayModule {}
