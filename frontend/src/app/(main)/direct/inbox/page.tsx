/* eslint-disable */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import dynamic from 'next/dynamic';
import Sidebar from "@/components/chat/Sidebar";
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";

const NewChatModal = dynamic(() => import("@/components/chat/NewChatModal"), { 
  ssr: false,
});
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, type Message, type Conversation } from "@/store/useChatStore";
import { useSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { chatService } from "@/services/chat.service";
import { sendOfflineAwareMessage } from "@/lib/offline-sync";

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <DirectInboxContent />
    </Suspense>
  );
}

function DirectInboxContent() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { conversations, setConversations, activeConversationId, setActiveConversation, messages, setMessages, addMessage, setIsLoadingMessages, setMessageError, updateMessage, clearUnreadCount } = useChatStore();
  const { getSocket, isConnected } = useSocket();
  const socket = getSocket();
  const [showSidebar, setShowSidebar] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const cParam = searchParams.get('c');

  // Handle URL param for active conversation
  useEffect(() => {
    if (cParam && cParam !== activeConversationId) {
      setActiveConversation(cParam);
    }
  }, [cParam, activeConversationId, setActiveConversation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setIsNewChatModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hide sidebar on mobile if we navigate here with an active conversation or param
  useEffect(() => {
    if ((useChatStore.getState().activeConversationId || cParam) && window.innerWidth < 1024) {
      setShowSidebar(false);
    }
  }, [cParam]);

  // Load conversations on mount
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    
    const fetchConversations = async () => {
      try {
        const data = await chatService.getConversations();
        const convsArray = Array.isArray(data) ? data : 
                          (Array.isArray(data?.data) ? data.data : 
                          (Array.isArray(data?.data?.data) ? data.data.data : []));
        setConversations(convsArray);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [isAuthenticated, router, setConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConversationId) return;
      
      try {
        setIsLoadingMessages(activeConversationId, true);
        const res = await chatService.getMessages(activeConversationId);
        
        // The API returns { success: true, data: { data: [...], nextCursor: null } }
        // chatService.getMessages returns the full response data.
        // So res.data is the paginated object { data: [...], nextCursor: null }
        const messagesArray = Array.isArray(res) ? res : 
                             (Array.isArray(res?.data) ? res.data : 
                             (Array.isArray(res?.data?.data) ? res.data.data : []));
        
        setMessages(activeConversationId, messagesArray);
        
        // Mark as read in backend and frontend state
        await chatService.markAsRead(activeConversationId);
        clearUnreadCount(activeConversationId);
      } catch (error: any) {
        console.error("Failed to load messages:", error);
        
        // If the backend says the conversation doesn't exist (404), remove it locally
        if (error?.response?.status === 404) {
          toast.error("Conversation no longer exists");
          const currentConversations = useChatStore.getState().conversations;
          useChatStore.getState().setConversations(
            currentConversations.filter((c) => c._id !== activeConversationId)
          );
          setActiveConversation(null);
        } else {
          toast.error("Failed to load messages");
        }
      } finally {
        if (activeConversationId) {
          setIsLoadingMessages(activeConversationId, false);
        }
      }
    };

    fetchMessages();

    // Join socket room
    if (socket && activeConversationId) {
      socket.emit("conversation:join", { conversationId: activeConversationId });
    }

    return () => {
      if (socket && activeConversationId) {
        socket.emit("conversation:leave", { conversationId: activeConversationId });
      }
    };
  }, [activeConversationId, setMessages, clearUnreadCount, socket]);

  const activeConversation = conversations.find((c) => c._id === activeConversationId) || null;

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    // On mobile, hide sidebar when selecting
    if (window.innerWidth < 1024) {
      setShowSidebar(false);
    }
  }, [setActiveConversation]);

  const handleSendAudio = useCallback(async (blob: Blob) => {
    if (!activeConversationId || !user) return;

    // Optimistic Update for audio
    const tempId = `temp-${crypto.randomUUID()}`;
    const tempMessage: Message = {
      _id: tempId,
      conversationId: activeConversationId,
      senderId: user,
      content: 'Voice Note',
      type: 'voice',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      isEdited: false,
      status: 'sending'
    };

    addMessage(tempMessage);

    try {
      const uploadResult = await chatService.uploadAudio(blob);
      const attachments = [{
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        type: 'audio',
        format: uploadResult.format,
        size: uploadResult.size
      }];
      const result = await chatService.sendMessageRest(activeConversationId, 'Voice Note', 'voice', undefined, attachments);
      
      useChatStore.getState().updateMessage(tempId, activeConversationId, {
        _id: result._id,
        senderId: result.senderId,
        attachments: result.attachments,
        createdAt: result.createdAt,
        status: 'sent'
      });
    } catch (error) {
      console.error("Failed to send audio:", error);
      useChatStore.getState().updateMessage(tempId, activeConversationId, {
        status: 'error'
      });
      toast.error("Failed to send voice note");
    }
  }, [activeConversationId, user, addMessage]);

  const handleSendMessage = useCallback(async (content: string, type: string = "text", attachments?: any[], expiresIn?: number) => {
    if (!activeConversationId || !user) return;

    if (attachments && attachments.length > 0 || expiresIn) {
      // Fallback to basic sending for attachments or self-destruct for now
      // Or integrate attachments into offline sync later.
      const tempId = `temp-${crypto.randomUUID()}`;
      const tempMessage: Message = {
        _id: tempId,
        conversationId: activeConversationId,
        senderId: user,
        content,
        type,
        attachments,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        isEdited: false,
        status: 'sending'
      };

      addMessage(tempMessage);

      try {
        const result = await chatService.sendMessageRest(activeConversationId, content, type, undefined, attachments, expiresIn);
        useChatStore.getState().updateMessage(tempId, activeConversationId, {
          _id: result._id,
          senderId: result.senderId,
          createdAt: result.createdAt,
          status: 'sent'
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        useChatStore.getState().updateMessage(tempId, activeConversationId, {
          status: 'error'
        });
        toast.error("Failed to send message", {
          description: "Check your connection and try again.",
        });
      }
      return;
    }

    await sendOfflineAwareMessage(activeConversationId, content, type);
  }, [activeConversationId, user, addMessage]);

  const handleRetryMessage = useCallback(async (message: Message) => {
    if (!activeConversationId) return;

    // Set status to sending
    updateMessage(message._id, activeConversationId, { status: 'sending' });

    try {
      const result = await chatService.sendMessageRest(activeConversationId, message.content, message.type);
      updateMessage(message._id, activeConversationId, {
        _id: result._id,
        senderId: result.senderId,
        createdAt: result.createdAt,
        status: 'sent'
      });
    } catch (error) {
      console.error("Failed to retry message:", error);
      updateMessage(message._id, activeConversationId, { status: 'error' });
      toast.error("Failed to send message", {
        description: "Check your connection and try again.",
      });
    }
  }, [activeConversationId, updateMessage]);

  return (
    <div className="flex h-full w-full max-w-[2000px] mx-auto bg-surface-container-lowest overflow-hidden relative border-x border-outline-variant/20">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {showSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-20 bg-surface-container-lowest/80 backdrop-blur-sm lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={cn(
                "absolute inset-y-0 left-0 z-30 w-[85%] sm:w-80 lg:relative lg:z-auto lg:w-auto",
                "lg:block"
              )}
            >
            <Sidebar 
              onSelectConversation={handleSelectConversation} 
              isLoading={loading} 
              onNewChatClick={() => setIsNewChatModalOpen(true)}
            />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Connection status banner */}
        {!isConnected && (
          <div className="bg-destructive/10 text-destructive px-4 py-1.5 text-xs font-medium text-center flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            Reconnecting to chat server...
          </div>
        )}

        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              onBack={() => setShowSidebar(true)}
            />
            <MessageList 
              conversationId={activeConversationId!} 
              conversation={activeConversation}
              onRetry={handleRetryMessage}
            />
            <MessageInput onSend={handleSendMessage} onSendAudio={handleSendAudio} />
          </>
        ) : (
          /* Empty state */
          <div className="flex flex-1 items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md px-8"
            >
              {/* Animated logo */}
              <motion.div
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <MessageSquare className="h-9 w-9 text-primary" />
              </motion.div>

              <h2 className="text-xl font-semibold tracking-tight">
                Welcome to FlashChat
              </h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed mb-6">
                Select a conversation from the sidebar to start messaging,
                or create a new one.
              </p>

              <Button onClick={() => setIsNewChatModalOpen(true)}>Send Message</Button>

              {/* Keyboard shortcut hints */}
              <div className="mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
                  <span>Search</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">N</kbd>
                  <span>New chat</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isNewChatModalOpen && (
          <NewChatModal 
          isOpen={isNewChatModalOpen} 
          onClose={() => setIsNewChatModalOpen(false)}
          onChatCreated={(conv) => {
            // Add the new conversation to the store if it doesn't exist
            const exists = useChatStore.getState().conversations.some(c => c._id === conv._id);
            if (!exists) {
              useChatStore.getState().setConversations([conv, ...useChatStore.getState().conversations]);
            }
            handleSelectConversation(conv._id);
          }}
        />
        )}
      </AnimatePresence>
    </div>
  );
}
