 
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, MessageSquare, Users, Settings, LogOut,
  Hash, Bell, ChevronDown, MoreHorizontal
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, type Conversation } from "@/store/useChatStore";
import { cn, formatTime, generateAvatarInitials } from "@/lib/utils";
import { chatService } from "@/services/chat.service";
import Image from "next/image";

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  onNewChatClick: () => void;
}

interface ChatUser {
  _id: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  [key: string]: unknown;
}

interface ConversationMember {
  userId: string | ChatUser;
  unreadCount?: number;
}

export default function Sidebar({ onSelectConversation, isLoading = false, onNewChatClick }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversationId, setActiveConversation, typingUsers } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const getOtherParticipant = useCallback((conv: Conversation) => {
    const currentUserId = user?._id;
    if (!conv.members || !Array.isArray(conv.members)) return null;
    const other = conv.members.find(
      (m: ConversationMember) => {
        const id = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
        return id !== currentUserId;
      }
    );
    const otherUser = other?.userId;
    if (typeof otherUser === 'object' && otherUser !== null) {
      return {
        name: otherUser.displayName || otherUser.username || "Unknown",
        avatar: otherUser.avatar
      };
    }
    return null;
  }, [user]);

  const getDirectName = useCallback((conv: Conversation): string => {
    if (conv.type === "group") return conv.name || "Group";
    return getOtherParticipant(conv)?.name || "Unknown";
  }, [getOtherParticipant]);

  const getDirectAvatar = useCallback((conv: Conversation): string | undefined => {
    if (conv.type === "group") return conv.avatar;
    return getOtherParticipant(conv)?.avatar;
  }, [getOtherParticipant]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (!searchQuery) return true;
      const name = c.type === "group" ? c.name : getDirectName(c);
      return name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [conversations, searchQuery, getDirectName]);

  const handleSelect = (id: string) => {
    setActiveConversation(id);
    onSelectConversation(id);
  };



  return (
    <div className="flex h-full w-full lg:w-80 flex-col border-r border-[#40484b]/30 bg-[#020617]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center self-center gap-3">
          <h1 className="text-[19px] leading-none font-semibold tracking-tight text-[#e1e3e4] font-heading">Conversations</h1>
        </div>
        <div className="flex items-center self-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors self-center">
            <Bell className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#101415] bg-[#E2B859] hover:bg-[#D1A03A] rounded-full shadow-sm transition-colors self-center" onClick={onNewChatClick}>
            <Plus className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9296] group-focus-within:text-[#E2B859] transition-colors" />
          <Input
            placeholder="Search conversations…"
            className="h-10 pl-10 pr-4 text-[14px] bg-[#0b0f10] border-[#303435] text-[#e1e3e4] placeholder:text-[#8a9296] rounded-xl focus-visible:ring-1 focus-visible:ring-[#E2B859]/50 focus-visible:border-[#E2B859]/50 transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-[#40484b]/30 to-transparent w-full" />

      {/* Conversation list */}
      <ScrollArea className="flex-1 px-3 py-3">
        {isLoading ? (
          <div className="space-y-3 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-11 w-11 rounded-full bg-[#191c1e]" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4 bg-[#191c1e]" />
                  <Skeleton className="h-3 w-1/2 bg-[#191c1e]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b0f10] border border-[#303435] mb-4 shadow-sm">
              <MessageSquare className="h-6 w-6 text-[#8a9296]" />
            </div>
            <p className="text-[15px] font-medium text-[#e1e3e4]">No conversations yet</p>
            <p className="mt-1.5 text-[13px] text-[#8a9296] leading-relaxed">Click the plus icon to start a new chat</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conv) => {
              const isActive = activeConversationId === conv._id;
              const name = conv.type === "group" ? conv.name || "Group" : getDirectName(conv);
              const avatar = getDirectAvatar(conv);
              const lastMsg = conv.lastMessage;
              const currentUserDict = user as Record<string, unknown> | null;
              const currentUserId = user?._id || currentUserDict?.id || currentUserDict?.userId;
              
              const member = conv.members?.find((m: ConversationMember) => {
                const id = typeof m.userId === 'object' && m.userId !== null ? m.userId._id : m.userId;
                return String(id) === String(currentUserId);
              });
              const unreadCount = member?.unreadCount || 0;
              const isUnread = unreadCount > 0;
              
              const typingUsersInConv = typingUsers[conv._id] || [];
              const isTyping = typingUsersInConv.length > 0;

              return (
                <motion.button
                  key={conv._id}
                  onClick={() => handleSelect(conv._id)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-xl px-4 py-3 min-h-[72px] text-left transition-all duration-200 group",
                    isActive
                      ? "bg-[#191c1e] text-[#e1e3e4] shadow-sm ring-1 ring-[#303435]"
                      : "hover:bg-[#0b0f10] text-[#c0c8cb] hover:text-[#e1e3e4]"
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative">
                    <Avatar className="h-11 w-11 border border-[#303435]/50 shadow-sm transition-transform group-hover:scale-105">
                      {avatar && <AvatarImage src={avatar} alt={name} className="object-cover" />}
                      <AvatarFallback className="text-[13px] bg-[#0b0f10] text-[#e1e3e4]">
                        {conv.type === "group" ? (
                          <Users className="h-4.5 w-4.5" />
                        ) : (
                          generateAvatarInitials(name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator (mock) */}
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-[2.5px] border-[#020617] bg-emerald-500 shadow-sm" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={cn("text-[15px] truncate", isActive ? "text-[#e1e3e4]" : "text-[#c0c8cb] group-hover:text-[#e1e3e4]", isUnread ? "font-bold text-[#e1e3e4]" : "font-medium")}>{name}</span>
                      {lastMsg && (
                        <div className="flex items-center gap-2 ml-2">
                          {isUnread && <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-[#131313] bg-[#E2B859] rounded-full shadow-[0_0_8px_rgba(226,184,89,0.4)]">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                          <span className={cn("text-[11px] whitespace-nowrap", isUnread ? "font-bold text-[#e1e3e4]" : "font-medium text-[#8a9296]")}>
                            {formatTime(lastMsg.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    {isTyping ? (
                      <p className="text-[13px] font-medium text-emerald-400 italic truncate animate-pulse">
                        {typingUsersInConv.length === 1 && typingUsersInConv[0] 
                          ? `${typingUsersInConv[0].username} is typing...` 
                          : `${typingUsersInConv.length} people are typing...`}
                      </p>
                    ) : (
                      <p className={cn("text-[13px] truncate", 
                        isUnread ? "font-bold text-[#e1e3e4]" : (isActive ? "text-[#8a9296]" : "text-[#8a9296]/80")
                      )}>
                        {lastMsg ? (lastMsg.content || (lastMsg.type === "text" ? "Sent a message" : `[${lastMsg.type}]`)) : "\u00A0"}
                      </p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="h-px bg-gradient-to-r from-transparent via-[#40484b]/30 to-transparent w-full" />

      {/* User footer */}
      <div className="p-4 bg-[#0b0f10]/50 backdrop-blur-md">
        <div className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 bg-[#191c1e]/60 border border-[#303435] shadow-sm hover:bg-[#191c1e] transition-colors group">
          <Avatar className="h-10 w-10 border border-[#40484b]/50">
            {user?.avatar && <AvatarImage src={user.avatar} className="object-cover" />}
            <AvatarFallback className="text-xs bg-[#0b0f10] text-[#E2B859]">
              {generateAvatarInitials(user?.displayName || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[14px] font-medium text-[#e1e3e4] truncate">{user?.displayName}</p>
            <p className="text-[12px] text-[#8a9296] truncate">@{user?.username}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-[#8a9296] hover:text-red-400 hover:bg-red-400/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
            onClick={() => { logout(); window.location.href = "/login"; }}
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

    </div>
  );
}
