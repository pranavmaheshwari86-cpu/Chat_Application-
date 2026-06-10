"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/services/api";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const messagesToSend = messages.concat(userMessage).map(m => ({
        role: m.role,
        content: m.content
      }));
      const res = await api.post("/ai/generate", { messages: messagesToSend });
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: res.data?.response || res.data || "I couldn't process that request.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Generate Error:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "Sorry, I encountered an error while processing your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden flex-col">
      {/* Header */}
      <div className="h-[72px] border-b border-surface-variant flex items-center px-6 shrink-0 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full metallic-gradient flex items-center justify-center">
            <Bot className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface">FlashChat AI Assistant</h1>
            <p className="text-on-surface-variant text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online and ready to help
            </p>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-6 pb-4 bg-background/50 backdrop-blur-sm shrink-0 z-10 border-b border-surface-variant/30 shadow-sm">
        <div className="max-w-4xl mx-auto relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask AI or search anything..."
            className="w-full bg-surface-container-low border border-border/50 text-on-surface rounded-2xl px-6 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent resize-none min-h-[60px] max-h-[200px] shadow-lg transition-all duration-300 placeholder:text-on-surface-variant/50"
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 p-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-on-surface-variant mt-3 opacity-60">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 rounded-2xl metallic-gradient flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-10 h-10 text-background" />
            </div>
            <h2 className="text-2xl font-headline-md text-on-surface">How can I help you today?</h2>
            <p className="text-on-surface-variant">
              Ask me to generate smart replies, translate text, brainstorm ideas, or anything else you need.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-3xl",
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-surface-variant/50">
                {msg.role === "ai" ? (
                  <Bot className="w-5 h-5 text-primary" />
                ) : (
                  <UserIcon className="w-5 h-5 text-on-surface" />
                )}
              </div>
              <div
                className={cn(
                  "p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-primary text-on-primary rounded-tr-sm"
                    : "glass-panel text-on-surface rounded-tl-sm border border-white/5"
                )}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4 max-w-3xl mr-auto"
          >
            <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center bg-surface-variant/50">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="p-4 rounded-2xl glass-panel border border-white/5 rounded-tl-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}
