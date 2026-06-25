/* eslint-disable */
"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useChatStore, type Message } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatTime, generateAvatarInitials } from "@/lib/utils";
import { Check, CheckCheck, Reply, Smile, MoreHorizontal, Pencil, Trash2, Pin, AlertCircle, Loader2, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { chatService } from "@/services/chat.service";
import LinkPreview from "./LinkPreview";
import AudioPlayer from "./AudioPlayer";
import { ShieldAlert } from "lucide-react";

interface MessageListProps {
  conversationId: string;
  conversation?: any;
  onRetry?: (message: Message) => void;
}

export default function MessageList({ conversationId, conversation, onRetry }: MessageListProps) {
  const { messages: allMessages, isLoadingMessages } = useChatStore();
  const { user } = useAuthStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [reactingTo, setReactingTo] = useState<string | null>(null);

  const messages = allMessages[conversationId] || [];
  const isLoading = isLoadingMessages[conversationId];

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message or when changing chats
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "instant" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, conversationId, isLoading]);

  const [now, setNow] = useState(new Date());

  // Only tick when there are expiring messages
  const hasExpiringMessages = useMemo(() => messages.some(m => !!m.expiresAt), [messages]);
  useEffect(() => {
    if (!hasExpiringMessages) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [hasExpiringMessages]);

  // Group consecutive messages by sender
  const groupedMessages = useMemo(() => {
    const validMessages = messages.filter(msg => {
      if (msg.expiresAt) {
        return new Date(msg.expiresAt) > now;
      }
      return true;
    });

    return validMessages.reduceRight<Array<{ messages: Message[]; senderId: string }>>((acc, msg) => {
      const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.senderId === senderId) {
        lastGroup.messages.push(msg);
      } else {
        acc.push({ senderId, messages: [msg] });
      }
      return acc;
    }, []);
  }, [messages, now]);

  if (isLoading) {
    return (
      <div className="flex-1 px-6 py-4 overflow-y-auto" style={{ background: 'rgba(14, 14, 14, 0.9)' }}>
        <div className="w-full space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
              {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full bg-surface-container" />}
              <div className={cn("flex flex-col gap-1", i % 2 === 0 ? "items-end" : "items-start")}>
                <Skeleton className="h-10 w-[200px] rounded-2xl bg-surface-container" />
                <Skeleton className="h-8 w-[150px] rounded-2xl bg-surface-container" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getOtherUser = () => {
    if (!conversation || conversation.type !== "direct" || !conversation.members) return null;
    const member = conversation.members.find((m: any) => {
      const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
      const mId = m.userId?._id || m.userId?.id || m.userId;
      return mId !== currentUserId;
    });
    return member?.userId;
  };

  const otherUser = getOtherUser();

  const getSenderName = (msg: Message) => {
    if (typeof msg.senderId === "object" && msg.senderId !== null && (msg.senderId.displayName || msg.senderId.username)) {
      return msg.senderId.displayName || msg.senderId.username;
    }
    const senderIdStr = typeof msg.senderId === "object" ? (msg.senderId._id) : msg.senderId;
    if (conversation?.members) {
      const member = conversation.members.find((m: any) => {
        const mId = m.userId?._id || m.userId;
        return String(mId) === String(senderIdStr);
      });
      if (member?.userId && typeof member.userId === 'object') {
        return member.userId.displayName || member.userId.username || "Unknown";
      }
    }
    return "Unknown";
  };

  const getSenderAvatar = (msg: Message) => {
    if (typeof msg.senderId === "object" && msg.senderId !== null && msg.senderId.avatar) {
      return msg.senderId.avatar;
    }
    const senderIdStr = typeof msg.senderId === "object" ? (msg.senderId._id) : msg.senderId;
    if (conversation?.members) {
      const member = conversation.members.find((m: any) => {
        const mId = m.userId?._id || m.userId;
        return String(mId) === String(senderIdStr);
      });
      if (member?.userId && typeof member.userId === 'object') {
        return member.userId.avatar;
      }
    }
    return undefined;
  };

  const isOwnMessage = (msg: Message) => {
    const senderId = typeof msg.senderId === "object" && msg.senderId !== null ? (msg.senderId._id) : msg.senderId;
    const currentUserId = user?._id;
    return String(senderId) === String(currentUserId);
  };

  return (
    <ScrollArea
      ref={scrollRef}
      className="flex-1 px-6 py-4 overflow-y-auto relative"
      style={{ background: 'rgba(14, 14, 14, 0.9)' }}
    >
      {/* Profile intro block */}
      {otherUser && (
        <div className="flex flex-col items-center justify-center mb-8 mt-4 py-6 text-center max-w-4xl mx-auto">
          <Avatar className="h-20 w-20 rounded-2xl mb-4 border border-outline-variant/30 shadow-lg">
            {otherUser.avatar && <AvatarImage src={otherUser.avatar} alt={otherUser.username} className="object-cover rounded-2xl" />}
            <AvatarFallback className="text-3xl bg-surface-container text-on-surface font-serif rounded-2xl border border-outline-variant/30">
              {generateAvatarInitials(otherUser.displayName || otherUser.username || "?")}
            </AvatarFallback>
          </Avatar>
          <h3 className="font-serif text-2xl text-on-surface mb-1">{otherUser.displayName || otherUser.username}</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            {otherUser.username}
          </p>
          <Link href={`/profile/${otherUser._id || otherUser.id || otherUser}`}>
            <Button
              variant="outline"
              className="h-9 px-6 rounded-full text-sm font-medium border-outline-variant/50 bg-transparent text-on-surface hover:border-primary hover:text-primary transition-colors duration-300"
            >
              View profile
            </Button>
          </Link>
        </div>
      )}
      
      {messages.length === 0 && !otherUser && (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container mb-4 shadow-sm border border-outline-variant/30">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-serif font-semibold text-on-surface tracking-tight">Start the conversation</h3>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              Send a message to get things going
            </p>
          </div>
        </div>
      )}

      {/* Date divider */}
      {messages.length > 0 && (
        <div className="flex items-center justify-center my-4">
          <div className="px-4 py-1 rounded-full border border-outline-variant/20 text-xs text-on-surface-variant"
            style={{ background: 'rgba(32, 31, 31, 0.5)', backdropFilter: 'blur(8px)' }}
          >
            Today
          </div>
        </div>
      )}

      <div className="w-full space-y-6">
        {groupedMessages.map((group, gi) => {
          const firstMsg = group.messages[0];
          if (!firstMsg) return null;
          const own = isOwnMessage(firstMsg);
          return (
            <div key={gi} className={cn("flex gap-3", own ? "flex-row-reverse" : "flex-row", "max-w-[90%] md:max-w-[75%] lg:max-w-[65%]", own ? "ml-auto" : "mr-auto")}>
              {/* Avatar - only for received messages */}
              {!own && (
                <Avatar className="h-8 w-8 shrink-0 mt-auto mb-5 border border-outline-variant/30">
                  {getSenderAvatar(firstMsg) && (
                    <AvatarImage src={getSenderAvatar(firstMsg)} />
                  )}
                  <AvatarFallback className="text-[10px] bg-surface-container text-on-surface font-serif border border-outline-variant/30">
                    {generateAvatarInitials(getSenderName(firstMsg))}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={cn("flex flex-col gap-1", own ? "items-end" : "items-start")}>
                {/* Sender name (only for others) */}
                {!own && (
                  <span className="text-xs text-on-surface-variant ml-1 mb-0.5">
                    {getSenderName(firstMsg)}
                  </span>
                )}

                {group.messages.map((msg, mi) => (
                  <div
                    key={msg._id}
                    className={cn(
                      "relative group animate-in fade-in slide-in-from-bottom-1 duration-200",
                      mi > 0 && "-mt-1"
                    )}
                    style={{ animationDelay: `${mi * 30}ms` }}
                    onMouseEnter={() => setHoveredMessage(msg._id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div
                      className={cn(
                        "relative flex flex-col transition-all",
                        own ? "items-end" : "items-start",
                        msg.isDeleted && "opacity-50 italic",
                        msg.status === 'sending' && "opacity-70",
                        msg.status === 'error' && "ring-1 ring-destructive/50",
                        msg.isFlagged && !own && "bg-red-500/10 border-red-500/20 text-red-200 rounded-2xl p-3"
                      )}
                    >
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className={cn("mb-1 space-y-1", msg.content ? "mb-2" : "")}>
                          {msg.attachments.map((att: any, ai: number) => {
                            if (att.type === 'audio') {
                              return <AudioPlayer key={ai} src={att.url} />;
                            }
                            return (
                              <div key={ai} className="relative w-full max-w-[280px] sm:w-[300px] md:w-[350px] aspect-[4/5] rounded-2xl overflow-hidden bg-black">
                                <Image
                                  src={att.url}
                                  alt="attachment"
                                  fill
                                  className="object-cover"
                                />
                                {att.type === 'video' && (
                                  <div className="absolute bottom-3 left-3 h-8 w-8 bg-white/90 rounded-full flex items-center justify-center">
                                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-black border-b-[5px] border-b-transparent ml-1" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Content bubble */}
                      {msg.isFlagged && !own ? (
                        <div className="flex items-center gap-2 text-sm italic py-1">
                          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                          <span>This message was flagged by automated moderation.</span>
                        </div>
                      ) : msg.type !== 'voice' && msg.content && (
                      <div className={cn(
                        "markdown-content break-words text-base leading-relaxed px-5 py-3 rounded-2xl shadow-sm",
                        own
                          ? "bubble-sent"
                          : "bubble-received",
                        mi > 0 && own && "rounded-tr-[6px]",
                        mi > 0 && !own && "rounded-tl-[6px]",
                      )}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            a: ({ node, ...props }) => {
                              const url = props.href || '';
                              return (
                                <span className="inline-block w-full">
                                  <a {...props} target="_blank" rel="noopener noreferrer" className={cn("hover:underline break-all font-medium", own ? "text-primary" : "text-[#4dabf7]")} />
                                  {url && <LinkPreview url={url} />}
                                </span>
                              );
                            },
                            code: ({ node, inline, className, children, ...props }: any) => {
                              return !inline ? (
                                <pre className={cn("rounded-xl p-4 my-3 overflow-x-auto text-sm border", own ? "bg-black/20 border-primary/10" : "bg-black/30 border-white/5")}>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className={cn("rounded-md px-1.5 py-0.5 font-mono text-sm", own ? "bg-primary/10 text-on-surface" : "bg-white/10 text-on-surface")} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content || ''}
                        </ReactMarkdown>
                      </div>
                      )}

                      {/* Meta: time + read receipt */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1 px-1",
                        own ? "justify-end" : "justify-start"
                      )}>
                        <span className="text-[10px] text-on-surface-variant/70">{formatTime(msg.createdAt)}</span>
                        {msg.isEdited && <span className="text-[10px] text-on-surface-variant/70">(edited)</span>}
                        {msg.expiresAt && (
                          <span className="flex items-center gap-0.5 ml-1 text-[10px] font-medium text-red-500/80">
                            <Timer className="h-3 w-3" />
                            {Math.max(0, Math.floor((new Date(msg.expiresAt).getTime() - now.getTime()) / 1000))}s
                          </span>
                        )}
                        {own && (
                          msg.status === 'sending' ? (
                            <Loader2 className="h-3 w-3 opacity-70 animate-spin ml-0.5" />
                          ) : msg.status === 'error' ? (
                            <div className="flex items-center gap-1 ml-0.5">
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              {onRetry && (
                                <button 
                                  onClick={() => onRetry(msg)}
                                  className="text-[10px] text-red-600 font-medium hover:underline flex items-center gap-0.5"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                  Retry
                                </button>
                              )}
                            </div>
                          ) : (msg.readBy && msg.readBy.length > 0) || msg.status === 'read' ? (
                            <CheckCheck className="h-3.5 w-3.5 text-[#D4AF37] ml-0.5" />
                          ) : (msg.deliveredTo && msg.deliveredTo.length > 0) || msg.status === 'delivered' ? (
                            <CheckCheck className="h-3.5 w-3.5 text-on-surface-variant/70 ml-0.5" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-on-surface-variant/70 ml-0.5" />
                          )
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1 mt-0.5", own ? "justify-end" : "justify-start")}>
                          {msg.reactions.map((r: any, ri: number) => (
                            <span
                              key={ri}
                              className="inline-flex items-center justify-center text-sm bg-surface-bright/30 border border-outline-variant/20 rounded-full px-2 py-0.5 drop-shadow-sm hover:scale-110 transition-transform cursor-pointer"
                              title={r.emoji}
                              onClick={() => {
                                chatService.reactToMessage(msg.conversationId, msg._id, r.emoji).catch(console.error);
                              }}
                            >
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Emoji Picker Overlay */}
                    {reactingTo === msg._id && (
                      <div className={cn("absolute z-50 bottom-10", own ? "right-0" : "left-0")}>
                        <div className="fixed inset-0 z-40" onClick={() => setReactingTo(null)} />
                        <div className="relative z-50 shadow-xl rounded-xl overflow-hidden border border-outline-variant/30">
                          <EmojiPicker 
                            theme={Theme.DARK} 
                            onEmojiClick={(emojiData) => {
                              chatService.reactToMessage(msg.conversationId, msg._id, emojiData.emoji).catch(console.error);
                              setReactingTo(null);
                            }} 
                          />
                        </div>
                      </div>
                    )}

                    {/* Hover actions */}
                    <AnimatePresence>
                      {hoveredMessage === msg._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={cn(
                            "absolute -top-3 flex items-center gap-0.5 rounded-xl border border-outline-variant/20 p-0.5 shadow-sm z-10",
                            own ? "right-0" : "left-0"
                          )}
                          style={{ background: 'rgba(32, 31, 31, 0.9)', backdropFilter: 'blur(12px)' }}
                        >
                          <button 
                            className="rounded-lg p-1.5 hover:bg-surface-bright/50 transition-colors" 
                            title="React" 
                            aria-label="React to message"
                            onClick={() => setReactingTo(msg._id)}
                          >
                            <Smile className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                          </button>
                          <button className="rounded-lg p-1.5 hover:bg-surface-bright/50 transition-colors" title="Reply" aria-label="Reply to message">
                            <Reply className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                          </button>
                          {own && (
                            <>
                              <button className="rounded-lg p-1.5 hover:bg-surface-bright/50 transition-colors" title="Edit" aria-label="Edit message">
                                <Pencil className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
                              </button>
                              <button className="rounded-lg p-1.5 hover:bg-destructive/10 transition-colors" title="Delete" aria-label="Delete message">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div id="bottom-anchor" ref={messagesEndRef} className="h-4"></div>
    </ScrollArea>
  );
}
