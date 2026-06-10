 
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

interface SidebarProps {
  onSelectConversation: (id: string) => void;
  isLoading?: boolean;
  onNewChatClick: () => void;
}

export default function Sidebar({ onSelectConversation, isLoading = false, onNewChatClick }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversationId, setActiveConversation } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");

  const getDirectName = useCallback((conv: Conversation): string => {
    const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
    if (conv.type === "group") return conv.name || "Group";
    const other = conv.members.find(
      (m: any) => (m.userId?._id || m.userId?.id || m.userId) !== currentUserId
    );
    return other?.userId?.displayName || other?.userId?.username || "Unknown";
  }, [user]);

  const getDirectAvatar = useCallback((conv: Conversation): string | undefined => {
    const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
    if (conv.type === "group") return conv.avatar;
    const other = conv.members.find(
      (m: any) => (m.userId?._id || m.userId?.id || m.userId) !== currentUserId
    );
    return other?.userId?.avatar;
  }, [user]);

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
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E2B859] to-[#9A7B33] shadow-sm">
            <MessageSquare className="h-4.5 w-4.5 text-[#101415] fill-current" />
          </div>
          <h1 className="text-[19px] font-semibold tracking-tight text-[#e1e3e4] font-heading">FlashChat</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors">
            <Bell className="h-4.5 w-4.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[#101415] bg-[#E2B859] hover:bg-[#D1A03A] rounded-full shadow-sm transition-colors" onClick={onNewChatClick}>
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
              const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
              
              const isUnread = lastMsg && 
                (lastMsg.senderId?._id || lastMsg.senderId?.id || lastMsg.senderId) !== currentUserId && 
                (!lastMsg.readBy || !lastMsg.readBy.includes(currentUserId));

              return (
                <motion.button
                  key={conv._id}
                  onClick={() => handleSelect(conv._id)}
                  className={cn(
                    "flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition-all duration-200 group",
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
                        <span className={cn("text-[11px] ml-2 whitespace-nowrap", isUnread ? "font-bold text-[#e1e3e4]" : "font-medium text-[#8a9296]")}>
                          {formatTime(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className={cn("text-[13px] truncate", 
                        isUnread ? "font-bold text-[#e1e3e4]" : (isActive ? "text-[#8a9296]" : "text-[#8a9296]/80")
                      )}>
                        {lastMsg.content || (lastMsg.type === "text" ? "Sent a message" : `[${lastMsg.type}]`)}
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
