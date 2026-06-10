import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessageCreatedPayload } from '../types/events.types';
import { AiService } from '../../ai/ai.service';
import { MemoryService } from '../../memory/memory.service';

@Injectable()
export class MemoryWorker {
  private readonly logger = new Logger(MemoryWorker.name);

  constructor(
    private readonly aiService: AiService,
    private readonly memoryService: MemoryService,
  ) {}

  async processMessage(payload: MessageCreatedPayload) {
    this.logger.debug(
      `[MemoryWorker] Analyzing message ${payload.messageId} for knowledge extraction...`,
    );

    if (!payload.content || payload.content.length < 15) {
      this.logger.debug(
        `[MemoryWorker] Message too short for knowledge extraction.`,
      );
      return;
    }

    try {
      const extractedItems = await this.aiService.extractKnowledge(
        payload.content,
      );

      if (extractedItems && extractedItems.length > 0) {
        for (const item of extractedItems) {
          await this.memoryService.createMemory({
            userId: new Types.ObjectId(payload.senderId),
            conversationId: new Types.ObjectId(payload.conversationId),
            messageId: new Types.ObjectId(payload.messageId),

            type: item.type || 'note',

            title: item.title,

            content: item.content,
            isAiGenerated: true,
            confidence: 0.9,
          });
          this.logger.log(
            `[MemoryWorker] Extracted and stored Memory: [${item.type}] ${item.title}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[MemoryWorker] Failed to process message: ${error.message}`,
      );
    }
  }
}
