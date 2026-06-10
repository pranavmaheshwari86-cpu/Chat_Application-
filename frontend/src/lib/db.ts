 
/* eslint-disable @typescript-eslint/no-explicit-any */
import Dexie, { Table } from 'dexie';
import { Message, Conversation } from '@chat/shared';

export interface DBPendingMessage {
  tempId: string;
  conversationId: string;
  content: string;
  type: string;
  replyToId?: string | undefined;
  createdAt: string;
  [key: string]: any;
}

export class FlashChatDatabase extends Dexie {
  messages!: Table<Message, string>;
  conversations!: Table<Conversation, string>;
  pendingMessages!: Table<DBPendingMessage, string>;

  constructor() {
    super('flashchat-db');
    this.version(2).stores({
      messages: '_id, conversationId, createdAt',
      conversations: '_id, updatedAt',
      pendingMessages: 'tempId, createdAt',
    });
  }
}

export const db = new FlashChatDatabase();

// ── Cache Helpers ───────────────────────────────────────────

export const cacheMessages = async (messages: Message[]) => {
  if (!messages.length) return;
  await db.messages.bulkPut(messages);
};

export const getCachedMessages = async (conversationId: string): Promise<Message[]> => {
  const messages = await db.messages.where('conversationId').equals(conversationId).sortBy('createdAt');
  return messages.reverse(); // Newest first, or depends on original implementation? (idb code did `b.createdAt - a.createdAt` which is descending). Wait, let's just do `reverse()`.
};

export const cacheConversations = async (conversations: Conversation[]) => {
  if (!conversations.length) return;
  await db.conversations.bulkPut(conversations);
};

export const getCachedConversations = async (): Promise<Conversation[]> => {
  const conversations = await db.conversations.orderBy('updatedAt').reverse().toArray();
  return conversations;
};

// ── Offline Queue Helpers ───────────────────────────────────

export const addPendingMessage = async (message: DBPendingMessage) => {
  await db.pendingMessages.put(message);
};

export const removePendingMessage = async (tempId: string) => {
  await db.pendingMessages.delete(tempId);
};

export const getPendingMessages = async (): Promise<DBPendingMessage[]> => {
  return await db.pendingMessages.orderBy('createdAt').toArray();
};
