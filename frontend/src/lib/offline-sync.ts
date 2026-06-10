 
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Socket } from 'socket.io-client';
import { useChatStore } from '../store/useChatStore';
import { 
  getCachedConversations, 
  getCachedMessages, 
  getPendingMessages, 
  removePendingMessage, 
  addPendingMessage,
  cacheMessages,
  cacheConversations
} from './db';
import { chatService } from '../services/chat.service';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Loads cached conversations and active conversation messages from IndexedDB into the Zustand store.
 * Useful for instant startup before network requests complete.
 */
export const loadCachedState = async () => {
  const store = useChatStore.getState();
  
  try {
    const cachedConvs = await getCachedConversations();
    if (cachedConvs.length > 0) {
      store.setConversations(cachedConvs);
    }

    if (store.activeConversationId) {
      const cachedMsgs = await getCachedMessages(store.activeConversationId);
      if (cachedMsgs.length > 0) {
        store.setMessages(store.activeConversationId, cachedMsgs);
      }
    }
  } catch (error) {
    console.error('Failed to load cached state', error);
  }
};

/**
 * Replays all pending messages that were queued while offline.
 */
export const syncOnReconnect = async (socket: Socket) => {
  const pendingMessages = await getPendingMessages();
  if (pendingMessages.length === 0) return;

  console.log(`Syncing ${pendingMessages.length} pending messages...`);
  
  const store = useChatStore.getState();

  for (const msg of pendingMessages) {
    try {
      // Depending on the implementation, we might send via REST or Socket.
      // Assuming REST here based on existing chatService
      const response = await chatService.sendMessageRest(
        msg.conversationId, 
        msg.content, 
        msg.type, 
        msg.replyToId
      );
      
      // Update store to remove temporary message and add real one
      store.deleteMessage(msg.tempId, msg.conversationId);
      store.addMessage(response.data || response); // Adjust depending on actual API response wrapper
      
      // Remove from offline queue
      await removePendingMessage(msg.tempId);
    } catch (error) {
      console.error('Failed to sync pending message', msg.tempId, error);
      // Mark as error in store
      store.updateMessage(msg.tempId, msg.conversationId, { status: 'error' });
    }
  }
};

/**
 * Intercepts message sending to handle offline queuing.
 */
export const sendOfflineAwareMessage = async (
  conversationId: string, 
  content: string, 
  type = 'text', 
  replyToId?: string
) => {
  const store = useChatStore.getState();
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const currentUser = useAuthStore.getState().user;
  
  const tempMessage = {
    _id: tempId,
    tempId, // specific to pending queue
    conversationId,
    senderId: currentUser,
    content,
    type,
    replyToId,
    createdAt: new Date().toISOString(),
    isDeleted: false,
    isEdited: false,
    status: 'sending' as const,
  };

  // 1. Optimistic UI update
  store.addMessage(tempMessage as any);

  // 2. Check network status
  if (!navigator.onLine) {
    console.log('Offline: Queuing message', tempId);
    await addPendingMessage(tempMessage);
    return;
  }

  // 3. Send over network
  try {
    const response = await chatService.sendMessageRest(conversationId, content, type, replyToId);
    store.deleteMessage(tempId, conversationId);
    store.addMessage(response.data || response);
    // Cache the real message
    await cacheMessages([response.data || response]);
  } catch (error) {
    console.error('Failed to send message', error);
    // Add to offline queue if it was a network error
    store.updateMessage(tempId, conversationId, { status: 'error' });
    await addPendingMessage(tempMessage);
  }
};
