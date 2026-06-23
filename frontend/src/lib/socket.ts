 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { syncOnReconnect, loadCachedState } from './offline-sync';
import { cacheMessages } from './db';
import { socketManager } from './socket-manager';
import { audioService } from './audio';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addMessage } = useChatStore();

  useEffect(() => {
    loadCachedState();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      socketManager.connect(accessToken, {
        onConnect: () => {
          console.log('Connected to socket server via manager');
          setIsConnected(true);
          const socket = socketManager.getSocket();
          if (socket) syncOnReconnect(socket);
        },
        onDisconnect: () => {
          setIsConnected(false);
        },
        onMessageNew: async (payload: any) => {
          const state = useChatStore.getState();
          const { user } = useAuthStore.getState();
          
          state.addMessage(payload.message);
          await cacheMessages([payload.message]);
          
          // Play receive sound if it's from someone else
          const senderId = typeof payload.message.senderId === 'object' ? payload.message.senderId._id : payload.message.senderId;
          const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
          if (senderId !== currentUserId) {
            audioService.playReceive();
          }
          
          const currentConvs = state.conversations;
          if (!currentConvs.some((c: any) => c._id === payload.conversationId)) {
            try {
              const { chatService } = await import('../services/chat.service');
              const data = await chatService.getConversations();
              const convsArray = Array.isArray(data) ? data : 
                                (Array.isArray(data?.data) ? data.data : 
                                (Array.isArray(data?.data?.data) ? data.data.data : []));
              useChatStore.getState().setConversations(convsArray);
            } catch (err) {
              console.error('Failed to fetch new conversation', err);
            }
          } else {
            state.updateConversationLastMessage(payload.conversationId, payload.message);
          }
        },
        onMessageEdited: (payload: any) => {
          useChatStore.getState().updateMessage(payload.messageId, payload.conversationId, {
            content: payload.content,
            isEdited: true,
          });
        },
        onMessageDeleted: (payload: any) => {
          useChatStore.getState().deleteMessage(payload.messageId, payload.conversationId);
        },
        onTypingActive: (payload: any) => {
          useChatStore.getState().setTypingActive(payload.conversationId, payload.userId, payload.username);
        },
        onTypingStopped: (payload: any) => {
          useChatStore.getState().setTypingStopped(payload.conversationId, payload.userId);
        },
        onMessageSeen: (payload: any) => {
          useChatStore.getState().updateMessageReadStatus(payload.conversationId, payload.userId, new Date(payload.readAt));
        },
        onMessageReacted: (payload: any) => {
          useChatStore.getState().updateMessageReactions(payload.conversationId, payload.messageId, payload.reactions);
        }
      });
    }

    return () => {
      // Disconnect on unmount or when auth state changes to prevent multiple listeners
      socketManager.disconnect();
    };
  }, [isAuthenticated, accessToken]);

  // We do not return the socket reference during render directly from a ref,
  // we just return a getter if we need it
  return { 
    getSocket: () => socketManager.getSocket(), 
    isConnected 
  };
};
