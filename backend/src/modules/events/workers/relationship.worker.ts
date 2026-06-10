import { Injectable, Logger } from '@nestjs/common';
import { MessageCreatedPayload } from '../types/events.types';
import { RelationshipsService } from '../../relationships/relationships.service';

@Injectable()
export class RelationshipWorker {
  private readonly logger = new Logger(RelationshipWorker.name);

  constructor(private readonly relationshipsService: RelationshipsService) {}

  async updateFromMessage(payload: MessageCreatedPayload) {
    this.logger.debug(
      `[RelationshipWorker] Updating relationship scores for conversation ${payload.conversationId}...`,
    );
    try {
      await this.relationshipsService.processInteraction(
        payload.senderId,
        payload.conversationId, // Normally this should be individual recipient IDs in a DM, or community ID. For now we use the context.
        'message',
        1,
      );
      this.logger.debug(`[RelationshipWorker] Relationship metrics updated.`);
    } catch (error) {
      this.logger.error(
        `[RelationshipWorker] Failed to update metrics: ${error.message}`,
      );
    }
  }
}
