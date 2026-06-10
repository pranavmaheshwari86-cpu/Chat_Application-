import { Injectable, Logger } from '@nestjs/common';

import type { JwtPayload } from '@chat/shared';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bull';
import * as Bull from 'bull';
import {
  EventName,
  MessageCreatedPayload,
  MessageUpdatedPayload,
  MessageDeletedPayload,
  UserOnlinePayload,
  UserOfflinePayload,
  RelationshipUpdatedPayload,
  MemoryCreatedPayload,
} from './types/events.types';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectQueue('flashchat-events') private readonly eventsQueue: Bull.Queue,
  ) {}

  private async emitEvent(eventName: EventName, payload: any) {
    const eventId = payload.eventId || randomUUID();

    const eventPayload = {
      ...payload,

      eventId,

      timestamp: payload.timestamp || new Date().toISOString(),
    };

    await this.eventsQueue.add(eventName, eventPayload, {
      jobId: eventId, // Native BullMQ Idempotency: same jobId won't be queued twice
    });
    this.logger.debug(`Queued ${eventName} event [ID: ${eventId}]`);
  }

  // ── Messaging Events ────────────────────────────────────────

  async emitMessageCreated(
    payload: Omit<MessageCreatedPayload, 'timestamp' | 'eventId'>,
  ) {
    await this.emitEvent(EventName.MESSAGE_CREATED, payload);
  }

  async emitMessageUpdated(
    payload: Omit<MessageUpdatedPayload, 'timestamp' | 'eventId'>,
  ) {
    await this.emitEvent(EventName.MESSAGE_UPDATED, payload);
  }

  async emitMessageDeleted(
    payload: Omit<MessageDeletedPayload, 'timestamp' | 'eventId'>,
  ) {
    await this.emitEvent(EventName.MESSAGE_DELETED, payload);
  }

  // ── Presence Events ─────────────────────────────────────────

  async emitUserOnline(userId: string) {
    await this.emitEvent(EventName.USER_ONLINE, { userId });
  }

  async emitUserOffline(userId: string, lastSeen: Date = new Date()) {
    await this.emitEvent(EventName.USER_OFFLINE, { userId, lastSeen });
  }

  // ── Intelligence Events ─────────────────────────────────────

  async emitRelationshipUpdated(
    payload: Omit<RelationshipUpdatedPayload, 'timestamp' | 'eventId'>,
  ) {
    await this.emitEvent(EventName.RELATIONSHIP_UPDATED, payload);
  }

  async emitMemoryCreated(
    payload: Omit<MemoryCreatedPayload, 'timestamp' | 'eventId'>,
  ) {
    await this.emitEvent(EventName.MEMORY_CREATED, payload);
  }

  // Generic method for other events
  async emit(eventName: EventName, payload: any = {}) {
    await this.emitEvent(eventName, payload);
  }
}
