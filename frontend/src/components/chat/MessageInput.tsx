"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Smile, Image as ImageIcon, Mic, X, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/useChatStore";
import { socketManager } from "@/lib/socket-manager";
import { audioService } from "@/lib/audio";

interface MessageInputProps {
  onSend: (content: string, type?: string, attachments?: unknown[], expiresIn?: number) => void;
  onSendAudio?: (blob: Blob) => void;
  disabled?: boolean;
  replyTo?: { _id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
}

export default function MessageInput({ onSend, onSendAudio, disabled, replyTo, onCancelReply }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [expiresIn, setExpiresIn] = useState<number | undefined>(undefined);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { activeConversationId } = useChatStore();

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (onSendAudio) {
            onSendAudio(audioBlob);
          }
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Error accessing microphone", error);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [content]);

  // Focus when replyTo changes
  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;

    setIsSending(true);
    try {
      audioService.playSend();
      onSend(trimmed, "text", undefined, expiresIn);
      setContent("");
      setExpiresIn(undefined);
      if (onCancelReply) onCancelReply();
    } finally {
      setIsSending(false);
    }
  };

  const _cycleExpiresIn = () => {
    if (!expiresIn) setExpiresIn(10);
    else if (expiresIn === 10) setExpiresIn(60);
    else if (expiresIn === 60) setExpiresIn(3600);
    else setExpiresIn(undefined);
  };
  
  const _getExpiresLabel = () => {
    if (!expiresIn) return "";
    if (expiresIn === 10) return "10s";
    if (expiresIn === 60) return "1m";
    if (expiresIn === 3600) return "1h";
    return "";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      if (activeConversationId) {
        socketManager.getSocket()?.emit('typing:stop', { conversationId: activeConversationId });
      }
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    
    if (activeConversationId) {
      const socket = socketManager.getSocket();
      if (socket) {
        socket.emit('typing:start', { conversationId: activeConversationId });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing:stop', { conversationId: activeConversationId });
        }, 2000);
      }
    }
  };

  return (
    <div className="p-6 z-10 sticky bottom-0"
      style={{
        background: 'rgba(19, 19, 19, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(77, 70, 53, 0.3)',
      }}
    >
      <div className="w-full">
        {/* Reply preview */}
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center gap-3 rounded-2xl border border-outline-variant/20 px-4 py-2 mx-1"
            style={{ background: 'rgba(28, 27, 27, 0.7)', backdropFilter: 'blur(16px)' }}
          >
            <div className="h-full w-0.5 rounded-full bg-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary">{replyTo.senderName}</p>
              <p className="text-sm text-on-surface-variant truncate mt-0.5">{replyTo.content}</p>
            </div>
            <button onClick={onCancelReply} aria-label="Cancel reply" className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-md hover:bg-surface-bright/30 shrink-0">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}

        {/* Input container */}
        <div
          className="relative flex items-end gap-2 rounded-3xl border border-outline-variant/30 p-2 transition-all duration-300 focus-within:border-primary/50"
          style={{
            background: '#201f1f',
            boxShadow: 'none',
          }}
        >
          {/* Emoji button */}
          <Button variant="ghost" size="icon" className="p-2.5 shrink-0 mb-0.5 text-on-surface-variant hover:text-primary hover:bg-transparent transition-colors" title="Emoji">
            <Smile className="h-5 w-5" />
          </Button>

          {/* Text area or Recording state */}
          <div className="flex-1 relative flex items-center min-w-0">
            {isRecording ? (
              <div className="flex-1 flex items-center gap-3 px-2 py-1">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-red-400 font-medium text-sm truncate">Recording...</span>
                <span className="ml-auto font-mono text-red-400/80 text-sm shrink-0">{formatRecordingTime(recordingTime)}</span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                disabled={disabled}
                className={cn(
                  "flex-1 bg-transparent border-none text-on-surface placeholder-on-surface-variant text-sm resize-none focus:ring-0 focus:outline-none py-3 max-h-[120px] min-h-[44px]",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
            )}
          </div>

          {/* Right action buttons */}
          <div className="flex items-center gap-1 shrink-0 mb-0.5 pr-1">
            {content.trim() ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <button
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-surface-container-lowest flex items-center justify-center transition-colors ml-1"
                  style={{ boxShadow: '0 2px 10px rgba(212,175,55,0.2)' }}
                  onClick={handleSubmit}
                  disabled={isSending || disabled}
                >
                  {isSending ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <Send className="h-[18px] w-[18px] ml-0.5" />
                  )}
                </button>
              </motion.div>
            ) : (
              <>
                {/* Mic */}
                <button
                  className={cn(
                    "p-2 transition-colors",
                    isRecording
                      ? "text-red-500 hover:text-red-400"
                      : "text-on-surface-variant hover:text-primary"
                  )}
                  title={isRecording ? "Stop recording" : "Voice message"}
                  onClick={handleToggleRecording}
                >
                  {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                </button>
                {/* Image */}
                {!isRecording && (
                  <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Send image" aria-label="Send image">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {/* Attach */}
                {!isRecording && (
                  <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Attach file" aria-label="Attach file">
                    <Paperclip className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
                {/* Send button (always visible) */}
                <button
                  className="w-10 h-10 rounded-full bg-primary hover:bg-primary-hover text-surface-container-lowest flex items-center justify-center transition-colors ml-1"
                  style={{ boxShadow: '0 2px 10px rgba(212,175,55,0.2)' }}
                  onClick={handleSubmit}
                  disabled={disabled}
                >
                  <Send className="h-[18px] w-[18px] ml-0.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
