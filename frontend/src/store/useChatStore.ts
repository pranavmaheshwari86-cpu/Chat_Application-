import { create } from 'zustand';
import { Message, Conversation, Reaction } from '@chat/shared';

export type { Message, Conversation, Reaction };

// Configuration constants
const MAX_CACHED_CONVERSATIONS = 20;
const MAX_MESSAGES_PER_CONVERSATION = 500;
const _MAX_TYPING_USERS_PER_CONVERSATION = 10;

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages[]
  isLoadingMessages: Record<string, boolean>;
  messageErrors: Record<string, string>;
  onlineUsers: string[];
  typingUsers: Record<string, { userId: string; username: string }[]>; // conversationId -> users typing
  
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, conversationId: string, data: Partial<Message>) => void;
  deleteMessage: (messageId: string, conversationId: string) => void;
  
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
  clearUnreadCount: (conversationId: string) => void;
  
  setIsLoadingMessages: (conversationId: string, isLoading: boolean) => void;
  setMessageError: (conversationId: string, error: string | null) => void;
  
  setOnlineUsers: (userIds: string[]) => void;
  setOnlineStatus: (userId: string, isOnline: boolean) => void;
  
  setTypingActive: (conversationId: string, userId: string, username: string) => void;
  setTypingStopped: (conversationId: string, userId: string) => void;
  updateMessageReadStatus: (conversationId: string, userId: string, readAt: Date) => void;
  updateMessageReactions: (conversationId: string, messageId: string, reactions: Reaction[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingMessages: {},
  messageErrors: {},
  onlineUsers: [],
  typingUsers: {},
  
  setConversations: (fetchedConversations) => set((state) => {
    // Filter out malformed conversations (missing _id or members)
    const validConversations = fetchedConversations.filter(
      (c) => c && c._id && Array.isArray(c.members)
    );
    // Preserve the active conversation if it's missing from the fetched list
    let updatedConversations = [...validConversations];
    if (state.activeConversationId) {
      const activeExistsInFetched = validConversations.some(c => c._id === state.activeConversationId);
      if (!activeExistsInFetched) {
        const activeConv = state.conversations.find(c => c._id === state.activeConversationId);
        if (activeConv && activeConv.members) {
          updatedConversations = [activeConv, ...updatedConversations];
        }
      }
    }
    return { conversations: updatedConversations };
  }),
  
  addConversation: (conversation) =>
    set((state) => {
      // Don't add if already exists
      if (state.conversations.some(c => c._id === conversation._id)) return state;
      return { conversations: [conversation, ...state.conversations] };
    }),
  
  setActiveConversation: (id) => set({ activeConversationId: id }),
  
  setMessages: (conversationId, messages) =>
    set((state) => {
      const newMessagesDict = { ...state.messages };
      // Prevent memory leak by limiting cached conversations
      const keys = Object.keys(newMessagesDict);
      if (keys.length >= MAX_CACHED_CONVERSATIONS && !newMessagesDict[conversationId]) {
        const toRemove = keys.find(k => k !== state.activeConversationId);
        if (toRemove) delete newMessagesDict[toRemove];
      }
      
      newMessagesDict[conversationId] = messages.slice(0, MAX_MESSAGES_PER_CONVERSATION);
      return { messages: newMessagesDict };
    }),
    
  addMessage: (message) =>
    set((state) => {
      const convMessages = state.messages[message.conversationId] || [];
      // Remove temporary message if it exists (for optimistic updates)
      const filtered = convMessages.filter(m => !(m._id.startsWith('temp-') && m.content === message.content && m.status === 'sending'));
      // Prevent duplicates
      if (filtered.some(m => m._id === message._id)) return state;
      
      const newMessages = [message, ...filtered].slice(0, MAX_MESSAGES_PER_CONVERSATION);
      
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: newMessages,
        },
      };
    }),
    
  updateMessage: (messageId, conversationId, data) =>
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: convMessages.map((m) =>
            m._id === messageId ? ({ ...m, ...data } as Message) : m
          ),
        },
      };
    }),
    
  deleteMessage: (messageId, conversationId) =>
    set((state) => {
      const convMessages = state.messages[conversationId] || [];
      return {
        messages: {
          ...state.messages,
          [conversationId]: convMessages.filter((m) => m._id !== messageId),
        },
      };
    }),
    
    updateConversationLastMessage: (conversationId, message) =>
    set((state) => {
      const conversations = [...state.conversations];
      const idx = conversations.findIndex(c => c._id === conversationId);
      if (idx !== -1) {
        // Extract string ID from populated object to match expected type
        const senderIdStr = typeof message.senderId === 'object' && message.senderId !== null 
          ? (message.senderId as { _id?: string; id?: string; displayName?: string; username?: string })._id || 
            (message.senderId as { _id?: string; id?: string; displayName?: string; username?: string }).id
          : message.senderId;
        
        conversations[idx] = {
          ...conversations[idx],
          lastMessage: {
            ...message,
            senderId: senderIdStr,
            senderName: typeof message.senderId === 'object' && message.senderId !== null 
              ? (message.senderId as { displayName?: string; username?: string }).displayName || 
                (message.senderId as { displayName?: string; username?: string }).username
              : undefined,
          },
          updatedAt: message.createdAt,
        } as Conversation;
        // Sort conversations to bring updated to top (only if changed)
        const needsSort = idx !== 0;
        if (needsSort) {
          conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
      }
      return { conversations };
    }),
    
    clearUnreadCount: (conversationId) =>
    set((state) => {
      const conversations = [...state.conversations];
      const idx = conversations.findIndex(c => c._id === conversationId);
      if (idx !== -1) {
        conversations[idx] = {
          ...conversations[idx],
          unreadCount: 0,
        } as Conversation;
      }
      return { conversations };
    }),

  setIsLoadingMessages: (conversationId, isLoading) =>
    set((state) => ({
      isLoadingMessages: { ...state.isLoadingMessages, [conversationId]: isLoading }
    })),

  setMessageError: (conversationId, error) =>
    set((state) => {
      if (error === null) {
        const newErrors = { ...state.messageErrors };
        delete newErrors[conversationId];
        return { messageErrors: newErrors };
      }
      return { messageErrors: { ...state.messageErrors, [conversationId]: error } };
    }),

  setOnlineUsers: (userIds) => set({ onlineUsers: userIds }),
  
  setOnlineStatus: (userId, isOnline) => set((state) => {
    const current = new Set(state.onlineUsers);
    if (isOnline) {
      current.add(userId);
    } else {
      current.delete(userId);
    }
    return { onlineUsers: Array.from(current) };
  }),

  setTypingActive: (conversationId, userId, username) => 
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.some(u => u.userId === userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, { userId, username }]
        }
      };
    }),

  setTypingStopped: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter(u => u.userId !== userId)
        }
      };
    }),

  updateMessageReadStatus: (conversationId, userId, readAt) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      const updatedMessages = messages.map(msg => {
        // If message is sent by current user and read by someone else
        if (!msg.readBy) msg.readBy = [];
        if (!msg.readBy.some(r => r.userId === userId)) {
          return {
            ...msg,
            readBy: [...msg.readBy, { userId, readAt: readAt.toISOString() }]
          };
        }
        return msg;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages
        }
      };
    }),

  updateMessageReactions: (conversationId, messageId, reactions) =>
    set((state) => {
      const messages = state.messages[conversationId];
      if (!messages) return state;

      const updatedMessages = messages.map(msg => {
        if (msg._id === messageId) {
          return { ...msg, reactions };
        }
        return msg;
      });

      return {
        messages: {
          ...state.messages,
          [conversationId]: updatedMessages
        }
      };
    })
}));

// Optimized Selectors
export const useConversations = () => useChatStore((state) => state.conversations);
export const useActiveConversationId = () => useChatStore((state) => state.activeConversationId);
export const useConversationMessages = (conversationId: string) => useChatStore((state) => state.messages[conversationId] || []);
export const useOnlineUsers = () => useChatStore((state) => state.onlineUsers);
export const useChatActions = () => useChatStore((state) => ({
  setConversations: state.setConversations,
  addConversation: state.addConversation,
  setActiveConversation: state.setActiveConversation,
  setMessages: state.setMessages,
  addMessage: state.addMessage,
  updateMessage: state.updateMessage,
  deleteMessage: state.deleteMessage,
  updateConversationLastMessage: state.updateConversationLastMessage,
  setIsLoadingMessages: state.setIsLoadingMessages,
  setMessageError: state.setMessageError,
  setOnlineUsers: state.setOnlineUsers,
  setOnlineStatus: state.setOnlineStatus,
}));
