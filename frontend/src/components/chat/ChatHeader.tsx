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
  const members = conversation.members || [];
  const otherUser = isGroup
    ? null
    : members.find((m: any) => (m.userId?._id || (m.userId as any)?.id || m.userId) !== ((user as any)?._id || (user as any)?.id || (user as any)?.userId));

  const getDisplayName = (userId: any): string => {
    if (typeof userId === 'string') return 'Unknown';
    return userId?.displayName || userId?.username || 'Unknown';
  };
  const getAvatar = (userId: any): string | undefined => {
    if (typeof userId === 'string') return undefined;
    return userId?.avatar;
  };

  const name = isGroup
    ? conversation.name || "Group Chat"
    : getDisplayName(otherUser?.userId);
  const avatar = isGroup ? conversation.avatar : getAvatar(otherUser?.userId);
  const memberCount = members.length;
  
  const getParticipantId = (userId: any): string | undefined => {
    if (typeof userId === 'string') return userId;
    return userId?._id;
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (!otherUser?.userId) return;
    const participantId = getParticipantId(otherUser.userId);
    if (!participantId) return;
    initiateCall(participantId, type);
  };

  return (
    <div className="h-[72px] flex items-center justify-between px-5 z-10 sticky top-0"
      style={{
        background: 'rgba(19, 19, 19, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(77, 70, 53, 0.3)',
      }}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer group">
        {/* Mobile back button */}
        {onBack && (
          <Button variant="ghost" size="icon" className="h-9 w-9 lg:hidden text-on-surface-variant hover:text-primary hover:bg-surface-bright/50 rounded-full transition-colors flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="relative">
          <Avatar className="h-10 w-10 border border-outline-variant/30 flex-shrink-0 group-hover:border-primary/50 transition-colors">
            {avatar && <AvatarImage src={avatar} alt={name} className="object-cover" />}
            <AvatarFallback className="text-[13px] bg-surface-container text-on-surface font-serif">
              {isGroup ? <Users className="h-4.5 w-4.5" /> : generateAvatarInitials(name)}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></div>
        </div>

        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-on-surface truncate flex items-center gap-2">
            {name}
            <svg className="h-3.5 w-3.5 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </h2>
          <div className="flex items-center gap-1">
            {typingUsers.length > 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-medium text-primary"
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
              <p className="text-xs text-primary/80">
                {isGroup ? `${memberCount} members` : "Online"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button onClick={() => handleCall('voice')} variant="ghost" size="icon" className="h-10 w-10 text-on-surface-variant hover:text-primary hover:bg-surface-bright/50 rounded-full transition-colors hidden sm:flex" aria-label="Audio call">
          <Phone className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>
        <Button onClick={() => handleCall('video')} variant="ghost" size="icon" className="h-10 w-10 text-on-surface-variant hover:text-primary hover:bg-surface-bright/50 rounded-full transition-colors hidden sm:flex" aria-label="Video call">
          <Video className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-outline-variant/30 mx-2 hidden sm:block"></div>

        <Button variant="ghost" size="icon" className="h-10 w-10 text-on-surface-variant hover:text-primary hover:bg-surface-bright/50 rounded-full transition-colors hidden sm:flex" aria-label="Search conversation">
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-on-surface-variant hover:text-primary hover:bg-surface-bright/50 rounded-full transition-colors"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="More options"
            aria-expanded={showMenu}
          >
            <MoreVertical className="h-[18px] w-[18px]" aria-hidden="true" />
          </Button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-outline-variant/20 p-1.5 shadow-2xl z-50"
                style={{
                  background: 'rgba(28, 27, 27, 0.95)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-on-surface hover:bg-surface-bright/30 transition-colors">
                  <Info className="h-4 w-4 text-on-surface-variant" /> View details
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-on-surface hover:bg-surface-bright/30 transition-colors">
                  <Pin className="h-4 w-4 text-on-surface-variant" /> Pinned messages
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-on-surface hover:bg-surface-bright/30 transition-colors">
                  <BellOff className="h-4 w-4 text-on-surface-variant" /> Mute
                </button>
                <Separator className="my-1.5 bg-outline-variant/20" />
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors">
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
