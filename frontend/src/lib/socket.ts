 
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { syncOnReconnect, loadCachedState } from './offline-sync';
import { cacheMessages } from './db';
import { socketManager } from './socket-manager';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addMessage, updateMessage, deleteMessage, updateConversationLastMessage } = useChatStore();

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
          addMessage(payload.message);
          await cacheMessages([payload.message]);
          
          const currentConvs = useChatStore.getState().conversations;
          if (!currentConvs.some((c: any) => c._id === payload.conversationId)) {
            try {
              const { chatService } = await import('../services/chat.service');
              const data = await chatService.getConversations();
              useChatStore.getState().setConversations(data.data || []);
            } catch (err) {
              console.error('Failed to fetch new conversation', err);
            }
          } else {
            updateConversationLastMessage(payload.conversationId, payload.message);
          }
        },
        onMessageEdited: (payload: any) => {
          updateMessage(payload.messageId, payload.conversationId, {
            content: payload.content,
            isEdited: true,
          });
        },
        onMessageDeleted: (payload: any) => {
          deleteMessage(payload.messageId, payload.conversationId);
        }
      });
    }

    return () => {
      // We don't necessarily disconnect on unmount if we want background sync
      // but if the user explicitly logs out, isAuthenticated will become false
      if (!isAuthenticated) {
        socketManager.disconnect();
      }
    };
  }, [isAuthenticated, accessToken, addMessage, updateMessage, deleteMessage, updateConversationLastMessage]);

  // We do not return the socket reference during render directly from a ref,
  // we just return a getter if we need it
  return { 
    getSocket: () => socketManager.getSocket(), 
    isConnected 
  };
};
