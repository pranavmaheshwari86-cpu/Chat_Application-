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

  const messages = allMessages[conversationId] || [];
  const isLoading = isLoadingMessages[conversationId];

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const [now, setNow] = useState(new Date());

  // Only tick when there are expiring messages — avoids re-rendering the entire list every second
  const hasExpiringMessages = useMemo(() => messages.some(m => !!m.expiresAt), [messages]);
  useEffect(() => {
    if (!hasExpiringMessages) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [hasExpiringMessages]);

  // Group consecutive messages by sender — memoized to avoid recalc on hover
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
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
              {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              <div className={cn("flex flex-col gap-1", i % 2 === 0 ? "items-end" : "items-start")}>
                <Skeleton className="h-10 w-[200px] rounded-2xl" />
                <Skeleton className="h-8 w-[150px] rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getOtherUser = () => {
    if (!conversation || conversation.type !== "direct") return null;
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
    const senderIdStr = typeof msg.senderId === "object" ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
    if (conversation?.members) {
      const member = conversation.members.find((m: any) => {
        const mId = m.userId?._id || m.userId?.id || m.userId;
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
    const senderIdStr = typeof msg.senderId === "object" ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
    if (conversation?.members) {
      const member = conversation.members.find((m: any) => {
        const mId = m.userId?._id || m.userId?.id || m.userId;
        return String(mId) === String(senderIdStr);
      });
      if (member?.userId && typeof member.userId === 'object') {
        return member.userId.avatar;
      }
    }
    return undefined;
  };

  const isOwnMessage = (msg: Message) => {
    const senderId = typeof msg.senderId === "object" && msg.senderId !== null ? (msg.senderId._id || msg.senderId.id) : msg.senderId;
    const currentUserId = user?._id || (user as any)?.id || (user as any)?.userId;
    return String(senderId) === String(currentUserId);
  };

  return (
    <ScrollArea ref={scrollRef} className="flex-1 px-4 py-4 overflow-y-auto">
      {otherUser && (
        <div className="flex flex-col items-center justify-center py-6 mb-6 mt-2 text-center max-w-4xl mx-auto">
          <Avatar className="h-20 w-20 mb-3 border-2 border-[#303435]/50 shadow-lg">
            {otherUser.avatar && <AvatarImage src={otherUser.avatar} alt={otherUser.username} className="object-cover" />}
            <AvatarFallback className="text-2xl bg-[#191c1e] text-[#e1e3e4]">
              {generateAvatarInitials(otherUser.displayName || otherUser.username || "?")}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold tracking-tight text-[#e1e3e4]">{otherUser.displayName || otherUser.username}</h2>
          <p className="text-[#8a9296] text-[13px] mt-0.5 mb-5 font-medium tracking-wide">
            {otherUser.username} • FlashGram
          </p>
          <Link href={`/profile/${otherUser._id || otherUser.id || otherUser}`}>
            <Button variant="outline" className="h-8 px-5 rounded-full text-[13px] font-medium border-[#303435]/60 bg-[#191c1e]/60 text-[#e1e3e4] hover:bg-[#E2B859] hover:text-black hover:border-[#E2B859] transition-all shadow-sm">
              View profile
            </Button>
          </Link>
        </div>
      )}
      
      {messages.length === 0 && !otherUser && (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#191c1e] mb-4 shadow-sm border border-[#303435]/50">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-semibold text-[#e1e3e4] tracking-tight">Start the conversation</h3>
            <p className="mt-1.5 text-[14px] text-[#8a9296]">
              Send a message to get things going
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-3xl space-y-4">
        {groupedMessages.map((group, gi) => {
          const firstMsg = group.messages[0];
          if (!firstMsg) return null;
          const own = isOwnMessage(firstMsg);
          return (
            <div key={gi} className={cn("flex gap-3", own ? "flex-row-reverse" : "flex-row")}>
              {/* Avatar */}
              {!own && (
                <Avatar className="h-8 w-8 mt-1 shrink-0">
                  {getSenderAvatar(firstMsg) && (
                    <AvatarImage src={getSenderAvatar(firstMsg)} />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {generateAvatarInitials(getSenderName(firstMsg))}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={cn("flex flex-col gap-0.5 max-w-[85%] md:max-w-[75%] lg:max-w-[70%] xl:max-w-[65%]", own ? "items-end" : "items-start")}>
                {/* Sender name (only for others) */}
                {!own && (
                  <span className="text-[12px] font-medium text-muted-foreground ml-1.5 mb-1">
                    {getSenderName(firstMsg)}
                  </span>
                )}

                {group.messages.map((msg, mi) => (
                  <div
                    key={msg._id}
                    className="relative group animate-in fade-in slide-in-from-bottom-1 duration-200"
                    style={{ animationDelay: `${mi * 30}ms` }}
                    onMouseEnter={() => setHoveredMessage(msg._id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    <div
                      className={cn(
                        "relative px-5 py-3 text-[16px] leading-[1.6] transition-all shadow-sm",
                        own
                          ? "bg-gradient-to-br from-[#E8B931] to-[#C49A2C] text-[#101415] rounded-[22px] rounded-tr-[6px] shadow-sm shadow-[#E2B859]/10"
                          : "bg-[#202426] border border-[#303435]/60 text-[#e8eaeb] rounded-[22px] rounded-tl-[6px] shadow-sm",
                        msg.isDeleted && "opacity-50 italic",
                        msg.status === 'sending' && "opacity-70",
                        msg.status === 'error' && "ring-1 ring-destructive/50",
                        msg.isFlagged && !own && "bg-red-500/10 border-red-500/20 text-red-200"
                      )}
                    >
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {msg.attachments.map((att: any, ai: number) => {
                            if (att.type === 'audio') {
                              return <AudioPlayer key={ai} src={att.url} />;
                            }
                            return (
                              <div key={ai} className="relative w-full max-w-[400px] sm:w-[300px] md:w-[400px] aspect-video">
                                <Image
                                  src={att.url}
                                  alt="attachment"
                                  fill
                                  className="rounded-[16px] object-cover shadow-sm border border-black/10"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Content */}
                      {msg.isFlagged && !own ? (
                        <div className="flex items-center gap-2 text-[15px] italic py-1">
                          <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                          <span>This message was flagged by automated moderation.</span>
                        </div>
                      ) : msg.type !== 'voice' && (
                      <div className="markdown-content break-words text-[16px] leading-[1.6] tracking-tight">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                            a: ({ node, ...props }) => {
                              const url = props.href || '';
                              return (
                                <span className="inline-block w-full">
                                  <a {...props} target="_blank" rel="noopener noreferrer" className={cn("hover:underline break-all font-medium", own ? "text-blue-900" : "text-[#4dabf7]")} />
                                  {url && <LinkPreview url={url} />}
                                </span>
                              );
                            },
                            code: ({ node, inline, className, children, ...props }: any) => {
                              return !inline ? (
                                <pre className={cn("rounded-xl p-4 my-3 overflow-x-auto text-[14px] border", own ? "bg-black/10 border-black/10" : "bg-black/30 border-white/5")}>
                                  <code className={className} {...props}>
                                    {children}
                                  </code>
                                </pre>
                              ) : (
                                <code className={cn("rounded-md px-1.5 py-0.5 font-mono text-[14.5px]", own ? "bg-black/10 text-black" : "bg-white/10 text-[#e8eaeb]")} {...props}>
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

                      {/* Meta */}
                      <div className={cn(
                        "flex items-center gap-1.5 mt-2",
                        own ? "justify-end text-[#101415]/70" : "justify-start text-[#e8eaeb]/50"
                      )}>
                        <span className="text-[11px] font-medium tracking-wide">{formatTime(msg.createdAt)}</span>
                        {msg.isEdited && <span className="text-[11px] font-medium tracking-wide">(edited)</span>}
                        {msg.expiresAt && (
                          <span className="flex items-center gap-0.5 ml-1 text-[11px] font-medium tracking-wide text-red-500/80">
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
                          ) : (
                            <CheckCheck className="h-[14px] w-[14px] opacity-70 ml-0.5" />
                          )
                        )}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {msg.reactions.map((r: any, ri: number) => (
                            <span
                              key={ri}
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs border backdrop-blur-sm",
                                own ? "bg-black/10 border-black/10" : "bg-white/5 border-white/10"
                              )}
                            >
                              {r.emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Hover actions */}
                    <AnimatePresence>
                      {hoveredMessage === msg._id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={cn(
                            "absolute -top-3 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 shadow-sm",
                            own ? "right-0" : "left-0"
                          )}
                        >
                          <button className="rounded-md p-1.5 hover:bg-accent transition-colors" title="React" aria-label="React to message">
                            <Smile className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          </button>
                          <button className="rounded-md p-1.5 hover:bg-accent transition-colors" title="Reply" aria-label="Reply to message">
                            <Reply className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                          </button>
                          {own && (
                            <>
                              <button className="rounded-md p-1.5 hover:bg-accent transition-colors" title="Edit" aria-label="Edit message">
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                              </button>
                              <button className="rounded-md p-1.5 hover:bg-destructive/10 transition-colors" title="Delete" aria-label="Delete message">
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
    </ScrollArea>
  );
}
