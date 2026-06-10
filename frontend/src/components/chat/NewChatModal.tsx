 
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Users, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { chatService, type SearchUserResult } from "@/services/chat.service";
import { generateAvatarInitials } from "@/lib/utils";
import { useAuthUser } from "@/store/useAuthStore";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (conversation: any) => void;
}

export default function NewChatModal({ isOpen, onClose, onChatCreated }: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isE2E, setIsE2E] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<SearchUserResult[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const currentUser = useAuthUser();

  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setQuery("");
        setResults([]);
        setSelectedUsers([]);
        setIsE2E(false);
      }, 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      const t = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(t);
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await chatService.searchUsers(query);
        const filteredData = (data as unknown as SearchUserResult[]).filter(
          (u) => u._id !== currentUser?._id && u._id !== (currentUser as any)?.id
        );
        setResults(filteredData);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentUser]);

  const handleStartChat = async (userId: string) => {
    setIsCreating(true);
    try {
      const conv = await chatService.createDirectConversation(userId, { isE2E });
      onChatCreated(conv);
      onClose();
    } catch (error) {
      console.error("Failed to create chat:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">New Chat</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search users by name or @username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[300px] min-h-[200px] px-2 pb-4">
          {isLoading ? (
            <div className="flex h-[150px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((u) => (
                <button
                  key={u._id}
                  onClick={() => handleStartChat(u._id)}
                  disabled={isCreating}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <Avatar className="h-10 w-10">
                    {u.avatar && <AvatarImage src={u.avatar} />}
                    <AvatarFallback>{generateAvatarInitials(u.displayName || u.username)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-medium">{u.displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </button>
              ))}
              
              {!isGroup && (
                <div className="mt-4 flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Secret Chat (E2E)</p>
                      <p className="text-xs text-muted-foreground">End-to-end encrypted.</p>
                    </div>
                  </div>
                  <Switch checked={isE2E} onCheckedChange={setIsE2E} />
                </div>
              )}
            </div>
          ) : query.trim() ? (
            <div className="flex h-[150px] flex-col items-center justify-center text-center text-muted-foreground">
              <Users className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="flex h-[150px] flex-col items-center justify-center text-center text-muted-foreground">
              <p className="text-sm">Type to search for people</p>
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </div>
  );
}
