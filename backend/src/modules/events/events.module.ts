import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { EventsService } from './events.service';
import { EventsProcessor } from './events.processor';
import { MemoryWorker } from './workers/memory.worker';
import { RelationshipWorker } from './workers/relationship.worker';
import { AiModule } from '../ai/ai.module';
import { MemoryModule } from '../memory/memory.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import {
  Conversation,
  ConversationSchema,
} from '../conversations/schemas/conversation.schema';

@Module({
  imports: [
    AiModule,
    MemoryModule,
    RelationshipsModule,
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    BullModule.registerQueue({
      name: 'flashchat-events',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600, // keep for 1 hour
          count: 1000, // keep up to 1000
        },
        removeOnFail: false, // Serve as DLQ
      },
    }),
  ],
  providers: [EventsService, EventsProcessor, MemoryWorker, RelationshipWorker],
  exports: [EventsService],
})
export class EventsModule {}
