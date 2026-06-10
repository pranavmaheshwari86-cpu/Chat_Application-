"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Paperclip, Smile, Image as ImageIcon, Mic, X, Loader2, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      // Start recording
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
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
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
      onSend(trimmed, "text", undefined, expiresIn);
      setContent("");
      setExpiresIn(undefined);
      if (onCancelReply) onCancelReply();
    } finally {
      setIsSending(false);
    }
  };

  const cycleExpiresIn = () => {
    if (!expiresIn) setExpiresIn(10);
    else if (expiresIn === 10) setExpiresIn(60);
    else if (expiresIn === 60) setExpiresIn(3600);
    else setExpiresIn(undefined);
  };
  
  const getExpiresLabel = () => {
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
    }
  };

  return (
    <div className="bg-[#0b0f10] border-t border-[#40484b]/30">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
      {/* Reply preview */}
      {replyTo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-3 rounded-xl bg-[#191c1e]/80 border border-[#303435] px-4 py-2 backdrop-blur-md mx-1"
        >
          <div className="h-full w-0.5 rounded-full bg-[#E2B859]" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#E2B859]">{replyTo.senderName}</p>
            <p className="text-[13px] text-[#c0c8cb] truncate mt-0.5">{replyTo.content}</p>
          </div>
          <button onClick={onCancelReply} aria-label="Cancel reply" className="text-[#c0c8cb] hover:text-white transition-colors p-1 rounded-md hover:bg-[#303435]/50 shrink-0">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      )}

      <div className="flex items-end gap-1.5 sm:gap-2 max-w-5xl mx-auto">
        {/* Attachment button */}
        <div className="flex gap-0.5 sm:gap-1 pb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full transition-colors relative",
              expiresIn ? "bg-[#E2B859]/20 text-[#E2B859] hover:bg-[#E2B859]/30" : "hover:bg-[#191c1e] text-[#8a9296] hover:text-[#e1e3e4]"
            )} 
            onClick={cycleExpiresIn}
            title="Self-destruct timer"
          >
            <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
            {expiresIn && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#E2B859] text-[9px] font-bold text-black">
                {getExpiresLabel()}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full hover:bg-[#191c1e] text-[#8a9296] hover:text-[#e1e3e4] transition-colors" title="Attach file" aria-label="Attach file">
            <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-10 w-10 shrink-0 rounded-full hover:bg-[#191c1e] text-[#8a9296] hover:text-[#e1e3e4] transition-colors" title="Send image" aria-label="Send image">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        {/* Text area or Recording state */}
        <div className="flex-1 relative group flex items-center min-w-0">
          {isRecording ? (
            <div className="flex-1 flex items-center gap-2 sm:gap-3 rounded-3xl border border-red-500/50 bg-red-500/10 px-3 sm:px-5 py-2 sm:py-3 h-[42px] sm:h-[46px] backdrop-blur-md min-w-0">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-red-400 font-medium text-xs sm:text-sm truncate">Recording...</span>
              <span className="ml-auto font-mono text-red-400/80 text-xs sm:text-sm shrink-0">{formatRecordingTime(recordingTime)}</span>
            </div>
          ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            disabled={disabled}
            className={cn(
              "w-full resize-none rounded-3xl border border-[#40484b]/60 bg-[#191c1e]/60 px-3.5 sm:px-5 py-2.5 sm:py-3.5 text-[15px] sm:text-[16px] text-[#e1e3e4] leading-relaxed",
              "placeholder:text-[#8a9296] focus:outline-none focus:ring-1 focus:ring-[#E2B859]/50 focus:border-[#E2B859]/50 focus:bg-[#191c1e]",
              "transition-all duration-200 max-h-32 sm:max-h-40 backdrop-blur-md shadow-sm",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
          )}
        </div>

        {/* Emoji + Send */}
        <div className="flex gap-0.5 sm:gap-1 pb-1">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex h-10 w-10 shrink-0 rounded-full hover:bg-[#191c1e] text-[#8a9296] hover:text-[#e1e3e4] transition-colors" title="Emoji">
            <Smile className="h-5 w-5" />
          </Button>

          {content.trim() ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <Button
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-gradient-to-r from-[#E2B859] to-[#9A7B33] hover:from-[#9A7B33] hover:to-[#E2B859] text-[#101415] shadow-md border-0 transition-all duration-300"
                onClick={handleSubmit}
                disabled={isSending || disabled}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 ml-0.5" />
                )}
              </Button>
            </motion.div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full transition-colors",
                isRecording 
                  ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 hover:text-red-400" 
                  : "hover:bg-[#191c1e] text-[#8a9296] hover:text-[#e1e3e4]"
              )}
              title={isRecording ? "Stop recording" : "Voice message"}
              onClick={handleToggleRecording}
            >
              {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
