import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import * as Bull from 'bull';
import {
  EventName,
  MessageCreatedPayload,
  RelationshipUpdatedPayload,
} from './types/events.types';
import { MemoryWorker } from './workers/memory.worker';
import { RelationshipWorker } from './workers/relationship.worker';

@Processor('flashchat-events')
export class EventsProcessor {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(
    private readonly memoryWorker: MemoryWorker,
    private readonly relationshipWorker: RelationshipWorker,
  ) {}

  @Process(EventName.MESSAGE_CREATED)
  async handleMessageCreated(job: Bull.Job<MessageCreatedPayload>) {
    this.logger.debug(`Processing MessageCreated event: ${job.id}`);
    const data = job.data;

    // Fan-out to specialized workers
    await Promise.allSettled([
      this.memoryWorker.processMessage(data),
      this.relationshipWorker.updateFromMessage(data),
    ]);
  }

  @Process(EventName.USER_ONLINE)
  async handleUserOnline(job: Bull.Job<any>) {
    this.logger.debug(`Processing UserOnline event: ${job.id}`);
  }

  @Process(EventName.RELATIONSHIP_UPDATED)
  async handleRelationshipUpdated(job: Bull.Job<RelationshipUpdatedPayload>) {
    this.logger.debug(`Processing RelationshipUpdated event: ${job.id}`);
  }

  @Process(EventName.FILE_UPLOADED)
  async handleFileUploaded(job: Bull.Job<any>) {
    this.logger.debug(`Processing FileUploaded event: ${job.id}`);
  }
}
