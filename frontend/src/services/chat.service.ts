 
/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from './api';
import { cacheConversations, cacheMessages } from '../lib/db';

export interface SearchUserResult {
  _id: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: string;
  isVerified: boolean;
}

export const chatService = {
  // Search
  searchUsers: async (query: string): Promise<SearchUserResult[]> => {
    const res = await api.get(`/search/users?q=${encodeURIComponent(query)}`);
    return res?.data || res;
  },

  // Conversations
  getConversations: async (cursor?: string): Promise<any> => {
    const query = cursor ? `?cursor=${cursor}` : '';
    const res = await api.get(`/conversations${query}`);
    const data = res?.data || res;
    // Cache conversations in background
    if (data && Array.isArray(data)) {
      cacheConversations(data).catch(console.error);
    } else if (data && data.data && Array.isArray(data.data)) {
      cacheConversations(data.data).catch(console.error);
    }
    return data;
  },

  createDirectConversation: async (participantId: string, options?: any): Promise<any> => {
    const res = await api.post('/conversations', { participantId, ...options });
    return res?.data || res;
  },

  createGroupConversation: async (name: string, memberIds: string[], description?: string): Promise<any> => {
    const res = await api.post('/conversations/group', { name, memberIds, description });
    return res?.data || res;
  },

  createConversationRest: async (payload: any): Promise<any> => {
    if (payload.type === 'direct') {
      return chatService.createDirectConversation(payload.participantIds[0], { metadata: payload.metadata });
    }
    return chatService.createGroupConversation(payload.name, payload.participantIds);
  },

  // Messages
  getMessages: async (conversationId: string, cursor?: string): Promise<any> => {
    const query = cursor ? `?cursor=${cursor}` : '';
    const res = await api.get(`/messages/${conversationId}${query}`);
    const data = res?.data || res;
    // Cache messages in background
    if (data && Array.isArray(data)) {
      cacheMessages(data).catch(console.error);
    } else if (data && data.data && Array.isArray(data.data)) {
      cacheMessages(data.data).catch(console.error);
    }
    return data;
  },

  sendMessageRest: async (conversationId: string, content: string, type = 'text', replyToId?: string, attachments?: any[], expiresIn?: number): Promise<any> => {
    const res = await api.post(`/messages/${conversationId}`, {
      content,
      type,
      replyToId,
      attachments,
      expiresIn,
    });
    return res?.data || res;
  },

  uploadAudio: async (blob: Blob): Promise<any> => {
    const formData = new FormData();
    formData.append('file', blob, 'voice-note.webm');
    const res = await api.post('/attachments/audio', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res?.data || res;
  }
};
