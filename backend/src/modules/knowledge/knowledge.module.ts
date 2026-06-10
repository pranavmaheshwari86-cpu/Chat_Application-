import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  KnowledgeDocument,
  KnowledgeDocumentSchema,
} from './schemas/knowledge-document.schema';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { AiModule } from '../ai/ai.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
    ]),
    AiModule,
    EventsModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
