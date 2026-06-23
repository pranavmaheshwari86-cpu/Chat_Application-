import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageCreatedPayload } from '../types/events.types';
import { RelationshipsService } from '../../relationships/relationships.service';
import {
  Conversation,
  ConversationDocument,
} from '../../conversations/schemas/conversation.schema';

@Injectable()
export class RelationshipWorker {
  private readonly logger = new Logger(RelationshipWorker.name);

  constructor(
    private readonly relationshipsService: RelationshipsService,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async updateFromMessage(payload: MessageCreatedPayload) {
    this.logger.debug(
      `[RelationshipWorker] Updating relationship scores for conversation ${payload.conversationId}...`,
    );
    try {
      const conversation = await this.conversationModel
        .findById(payload.conversationId)
        .exec();
      if (!conversation) {
        this.logger.warn(
          `Conversation ${payload.conversationId} not found for relationship update`,
        );
        return;
      }

      const members = conversation.members as Array<{
        userId: { toString(): string };
      }>;
      const recipientIds = members
        .filter((m) => String(m.userId) !== payload.senderId)
        .map((m) => String(m.userId));

      for (const recipientId of recipientIds) {
        await this.relationshipsService.processInteraction(
          payload.senderId,
          recipientId,
          'message',
          1,
        );
      }

      this.logger.debug(
        `[RelationshipWorker] Relationship metrics updated for ${recipientIds.length} recipients.`,
      );
    } catch (error) {
      this.logger.error(
        `[RelationshipWorker] Failed to update metrics: ${(error as Error).message}`,
      );
    }
  }
}
