import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';
import { GatewayModule } from '../../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    GatewayModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
