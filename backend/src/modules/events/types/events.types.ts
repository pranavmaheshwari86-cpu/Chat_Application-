// c:\Users\Pranav\Desktop\real time chat application\server\src\modules\events\types\events.types.ts

export enum EventName {
  MESSAGE_CREATED = 'MessageCreated',
  MESSAGE_UPDATED = 'MessageUpdated',
  MESSAGE_DELETED = 'MessageDeleted',

  USER_ONLINE = 'UserOnline',
  USER_OFFLINE = 'UserOffline',

  COMMUNITY_CREATED = 'CommunityCreated',
  CHANNEL_CREATED = 'ChannelCreated',
  THREAD_CREATED = 'ThreadCreated',

  RELATIONSHIP_UPDATED = 'RelationshipUpdated',

  CALL_STARTED = 'CallStarted',
  CALL_ENDED = 'CallEnded',

  FILE_UPLOADED = 'FileUploaded',
  STORY_CREATED = 'StoryCreated',
  EVENT_CREATED = 'EventCreated',

  MEMORY_CREATED = 'MemoryCreated',
  NOTIFICATION_CREATED = 'NotificationCreated',
}

export interface BaseEventPayload {
  eventId: string;
  correlationId?: string;
  timestamp: string;
}

export interface MessageCreatedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  content?: string;
  type?: string;
}

export interface MessageUpdatedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  changes: Record<string, any>;
}

export interface MessageDeletedPayload extends BaseEventPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
}

export interface UserOnlinePayload extends BaseEventPayload {
  userId: string;
}

export interface UserOfflinePayload extends BaseEventPayload {
  userId: string;
  lastSeen: Date;
}

export interface RelationshipUpdatedPayload extends BaseEventPayload {
  userId: string;
  contactId: string;
  interactionType: 'message' | 'call' | 'reaction' | 'file';
  weight: number;
}

export interface MemoryCreatedPayload extends BaseEventPayload {
  memoryId: string;
  userId: string;
  type: string;
}

// Additional event interfaces can be defined here as needed
