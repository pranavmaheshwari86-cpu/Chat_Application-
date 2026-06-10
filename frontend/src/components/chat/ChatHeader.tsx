/* eslint-disable */
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Video, Search, MoreVertical, Pin, Users,
  Bell, BellOff, Trash2, ArrowLeft, Info
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore, type Conversation } from "@/store/useChatStore";
import { useCallStore } from "@/store/useCallStore";
import { cn, generateAvatarInitials } from "@/lib/utils";

interface ChatHeaderProps {
  conversation: Conversation | null;
  typingUsers?: string[];
  onBack?: () => void;
}

export default function ChatHeader({ conversation, typingUsers = [], onBack }: ChatHeaderProps) {
  const { user } = useAuthStore();
  const { initiateCall } = useCallStore();
  const [showMenu, setShowMenu] = useState(false);

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const otherUser = isGroup
    ? null
     
    : conversation.members.find((m: any) => (m.userId?._id || (m.userId as any)?.id || m.userId) !== ((user as any)?._id || (user as any)?.id || (user as any)?.userId));

  const name = isGroup
    ? conversation.name || "Group Chat"
    : otherUser?.userId?.displayName || "Unknown";
  const avatar = isGroup ? conversation.avatar : otherUser?.userId?.avatar;
  const memberCount = conversation.members.length;
  
  const handleCall = (type: 'voice' | 'video') => {
    if (!otherUser?.userId) return;
    const participantId = typeof otherUser.userId === 'object' ? (otherUser.userId._id || otherUser.userId.id) : otherUser.userId;
    initiateCall(participantId, type);
  };

  return (
    <div className="flex items-center justify-between border-b border-[#40484b]/30 bg-[#020617] px-5 py-4 shadow-sm z-10">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Mobile back button */}
        {onBack && (
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-10 w-10 border border-[#303435]/50 shadow-sm flex-shrink-0">
          {avatar && <AvatarImage src={avatar} alt={name} className="object-cover" />}
          <AvatarFallback className="text-[13px] bg-[#0b0f10] text-[#e1e3e4]">
            {isGroup ? <Users className="h-4.5 w-4.5" /> : generateAvatarInitials(name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-[#e1e3e4] truncate">{name}</h2>
          <div className="flex items-center gap-1">
            {typingUsers.length > 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[13px] font-medium text-[#E2B859]"
              >
                {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  …
                </motion.span>
              </motion.p>
            ) : (
              <p className="text-[13px] text-[#8a9296]">
                {isGroup ? `${memberCount} members` : "Online"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button onClick={() => handleCall('voice')} variant="ghost" size="icon" className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors hidden sm:flex" aria-label="Audio call">
          <Phone className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>
        <Button onClick={() => handleCall('video')} variant="ghost" size="icon" className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors hidden sm:flex" aria-label="Video call">
          <Video className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors hidden sm:flex" aria-label="Search conversation">
          <Search className="h-4.5 w-4.5" aria-hidden="true" />
        </Button>

        <div className="w-px h-5 bg-gradient-to-b from-transparent via-[#40484b] to-transparent mx-1 hidden sm:block"></div>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-[#8a9296] hover:text-[#e1e3e4] hover:bg-[#191c1e] rounded-full transition-colors"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <MoreVertical className="h-4.5 w-4.5" aria-hidden="true" />
          </Button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-[#303435] bg-[#0b0f10]/95 backdrop-blur-xl p-1.5 shadow-2xl z-50"
              >
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#e1e3e4] hover:bg-[#191c1e] transition-colors">
                  <Info className="h-4 w-4 text-[#8a9296]" /> View details
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#e1e3e4] hover:bg-[#191c1e] transition-colors">
                  <Pin className="h-4 w-4 text-[#8a9296]" /> Pinned messages
                </button>
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-[#e1e3e4] hover:bg-[#191c1e] transition-colors">
                  <BellOff className="h-4 w-4 text-[#8a9296]" /> Mute
                </button>
                <Separator className="my-1.5 bg-[#303435]" />
                <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors">
                  <Trash2 className="h-4 w-4" /> Delete chat
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
