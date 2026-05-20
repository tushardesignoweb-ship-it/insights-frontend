"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Send, Loader2, Bot, User, CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as api from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function CreateFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [formDraft, setFormDraft] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(!!editId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editId) {
      const fetchForm = async () => {
        try {
          const res = await api.getGeneratedForm(editId);
          if (res.form) {
            setMessages(res.form.chatHistory || []);
            setFormDraft(res.form.draft);
          }
        } catch (err) {
          toast.error("Failed to load form history.");
        } finally {
          setIsInitializing(false);
        }
      };
      fetchForm();
    }
  }, [editId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, formDraft]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input };
    const currentHistory = [...messages];
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.generateFormChat(userMessage.content, currentHistory);
      
      const assistantMessage: ChatMessage = { role: "assistant", content: response.text };
      setMessages((prev) => [...prev, assistantMessage]);

      if (response.formDraft) {
        setFormDraft(response.formDraft);
        toast.success("Form draft updated!");
      }
    } catch (err) {
      console.error("Chat error", err);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!formDraft) return;
    setIsPublishing(true);
    try {
      const res = await api.publishForm(formDraft, messages, editId || undefined);
      toast.success("Form successfully saved and created in Google Forms!");
      if (res.url) {
        window.open(res.url, "_blank");
      }
      router.push("/dashboard/google");
    } catch (err: any) {
      console.error("Publish error", err);
      if (err.code === "MISSING_GOOGLE_SCOPES") {
        toast.error("Missing required permissions for Google Drive/Forms. Please reconnect your Google account in the dashboard.");
      } else {
        toast.error(err.message || "Failed to publish form. Please check your Google connection.");
      }
    } finally {
      setIsPublishing(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto h-[80vh]">
      {/* Chat Section */}
      <div className="flex flex-col flex-1 border border-border rounded-xl bg-card shadow-sm h-full">
        <div className="flex items-center gap-2 border-b bg-muted/20 px-4 py-3 rounded-t-xl">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">AI Form Builder</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground mt-10">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20 mb-2" />
              <p>Tell me what kind of Google Form you want to create.</p>
              <p className="text-sm mt-2 opacity-70">Example: "I need a feedback form for my recent webinar."</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                <div className={`prose prose-sm dark:prose-invert max-w-none ${msg.role === 'user' ? 'text-white prose-p:text-white prose-strong:text-white' : ''}`}>
                  {/* Clean up the code block output if it's the assistant so user doesn't see raw JSON unless they scroll */}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.role === 'assistant' ? msg.content.replace(/```json\n[\s\S]*?\n```/g, '*I have generated a form draft for you. Check the preview!*') : msg.content}
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
            placeholder="Type your request here..."
            className="flex-1 bg-transparent border-0 focus:ring-0 focus-visible:ring-0 px-3 text-sm outline-none"
            disabled={isLoading || isPublishing}
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim() || isLoading || isPublishing} className="h-9 w-9 rounded-full shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Form Preview Section */}
      {formDraft && (
        <div className="flex flex-col flex-1 border border-border rounded-xl bg-card shadow-sm h-full animate-in fade-in slide-in-from-right-4">
          <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-3 rounded-t-xl">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Form Preview</h3>
            </div>
            <Button size="sm" onClick={handlePublish} disabled={isPublishing} className="gap-1">
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {editId ? "Publish Updates" : "Publish to Google"}
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
            <div className="max-w-md mx-auto bg-background rounded-xl border shadow-sm overflow-hidden">
              <div className="h-3 bg-primary w-full"></div>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">{formDraft.title || "Untitled Form"}</h1>
                {formDraft.description && (
                  <p className="text-muted-foreground text-sm mb-6">{formDraft.description}</p>
                )}
                
                <div className="space-y-6">
                  {formDraft.questions?.map((q: any, i: number) => (
                    <div key={i} className="p-4 border rounded-lg bg-card shadow-sm">
                      <div className="font-medium mb-3 flex items-start gap-1">
                        <span>{q.title}</span>
                        {q.required && <span className="text-red-500">*</span>}
                      </div>
                      
                      {q.type === 'TEXT' && (
                        <div className="border-b border-muted-foreground/30 pb-1 text-muted-foreground text-sm">
                          Short answer text
                        </div>
                      )}
                      
                      {q.type === 'PARAGRAPH_TEXT' && (
                        <div className="border-b border-muted-foreground/30 pb-1 text-muted-foreground text-sm">
                          Long answer text
                        </div>
                      )}
                      
                      {['CHOICE', 'CHECKBOX', 'RADIO'].includes(q.type) && (
                        <div className="space-y-2 text-sm text-muted-foreground">
                          {q.options?.map((opt: string, j: number) => (
                            <div key={j} className="flex items-center gap-2">
                              <div className={`w-4 h-4 border border-muted-foreground rounded-${q.type === 'CHOICE' || q.type === 'RADIO' ? 'full' : 'sm'}`}></div>
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(q.type === 'DROPDOWN' || q.type === 'DROP_DOWN') && (
                        <div className="border rounded px-3 py-2 text-sm text-muted-foreground flex justify-between items-center">
                          <span>Choose</span>
                          <ArrowRight className="w-3 h-3 rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreateFormPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <CreateFormContent />
    </Suspense>
  );
}
