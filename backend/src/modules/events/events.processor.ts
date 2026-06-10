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
import {
  NotificationWorker,
  AnalyticsWorker,
  MediaWorker,
} from './workers/system.workers';

@Processor('flashchat-events')
export class EventsProcessor {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(
    private readonly memoryWorker: MemoryWorker,
    private readonly relationshipWorker: RelationshipWorker,
    private readonly notificationWorker: NotificationWorker,
    private readonly analyticsWorker: AnalyticsWorker,
    private readonly mediaWorker: MediaWorker,
  ) {}

  @Process(EventName.MESSAGE_CREATED)
  async handleMessageCreated(job: Bull.Job<MessageCreatedPayload>) {
    this.logger.debug(`Processing MessageCreated event: ${job.id}`);
    const data = job.data;

    // Fan-out to specialized workers
    await Promise.allSettled([
      this.memoryWorker.processMessage(data),
      this.relationshipWorker.updateFromMessage(data),
      this.notificationWorker.sendPushNotification(data),
      this.analyticsWorker.trackEvent(EventName.MESSAGE_CREATED, data),
    ]);
  }

  @Process(EventName.USER_ONLINE)
  async handleUserOnline(job: Bull.Job<any>) {
    this.logger.debug(`Processing UserOnline event: ${job.id}`);
    await this.analyticsWorker.trackEvent(EventName.USER_ONLINE, job.data);
  }

  @Process(EventName.RELATIONSHIP_UPDATED)
  async handleRelationshipUpdated(job: Bull.Job<RelationshipUpdatedPayload>) {
    this.logger.debug(`Processing RelationshipUpdated event: ${job.id}`);
    await this.analyticsWorker.trackEvent(
      EventName.RELATIONSHIP_UPDATED,
      job.data,
    );
  }

  @Process(EventName.FILE_UPLOADED)
  async handleFileUploaded(job: Bull.Job<any>) {
    this.logger.debug(`Processing FileUploaded event: ${job.id}`);
    await this.mediaWorker.processUpload(job.data);
  }
}
