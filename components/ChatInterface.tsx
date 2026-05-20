"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatAnalysis } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  analysisId: string;
  initialHistory?: ChatMessage[];
}

export default function ChatInterface({ analysisId, initialHistory = [] }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await chatAnalysis(analysisId, userMessage.content);
      // Backend returns the full history, we can either replace or just append the last one.
      // Easiest is to replace to ensure sync.
      if (response && response.chatHistory) {
        setMessages(response.chatHistory);
      }
    } catch (err) {
      console.error("Chat error", err);
      // Remove the optimistic user message on error or show an error message
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-border rounded-xl bg-card shadow-sm mt-8">
      <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3 rounded-t-xl">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Chat with your Data</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <Bot className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p>Ask a question about this report!</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 \${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 \${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm \${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
              <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'text-white prose-p:text-white prose-strong:text-white' : ''}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-muted rounded-tl-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t bg-muted/10 rounded-b-xl flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask something like: 'What was the most common complaint?'"
          className="flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 px-3 text-sm outline-none"
          disabled={isLoading}
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading} className="h-9 w-9 rounded-full shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}