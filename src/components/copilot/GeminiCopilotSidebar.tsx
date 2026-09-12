"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Settings,
  X,
  Bot,
  User,
  Copy,
  Check,
  Plus,
  ArrowDownToLine,
  Trash2,
  Key,
  Loader2,
} from "lucide-react";
import { GeminiSettingsModal, GEMINI_MODELS } from "./GeminiSettingsModal";
import { CopilotMarkdown } from "./CopilotMarkdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface GeminiCopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentNoteTitle?: string;
  currentNoteContent?: string;
  onInsertContent?: (content: string) => void;
  onCreateNoteWithContent?: (title: string, content: string) => void;
}

export function GeminiCopilotSidebar({
  isOpen,
  onClose,
  currentNoteTitle,
  currentNoteContent,
  onInsertContent,
  onCreateNoteWithContent,
}: GeminiCopilotSidebarProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your **Gemini AI Copilot** in Netherite.\n\nI have real-time context of your active document. Ask me to:\n- Explain engineering concepts or GTU exam topics\n- Solve numericals (CRC, Hamming code, VLSM, Shannon Capacity)\n- Generate architectural **Mermaid diagrams**\n- Review, structure, or expand your study notes",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Draggable Width State (persistent in localStorage)
  const [copilotWidth, setCopilotWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_copilot_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 800) return parsed;
      }
    }
    return 420;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(420);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = copilotWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      // Dragging left increases width; dragging right decreases width
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(800, Math.max(320, startWidthRef.current + delta));
      setCopilotWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("netherite_copilot_width", copilotWidth.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, copilotWidth]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load API key and model from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("netherite_gemini_api_key") || "";
      const savedModel =
        localStorage.getItem("netherite_gemini_model") || "gemini-2.5-flash";
      setApiKey(savedKey);
      setModel(savedModel);
    }
  }, [isOpen]);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendMessage = async () => {
    const promptToSend = input.trim();
    if (!promptToSend) return;

    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const contextSnippet = currentNoteContent
        ? `\n\n--- ACTIVE NOTE CONTEXT ---\nDocument: ${currentNoteTitle || "Untitled"}\n${currentNoteContent.slice(
            0,
            12000
          )}\n--- END CONTEXT ---\n`
        : "";

      const systemInstruction = `You are Gemini Copilot, an expert academic pair-programmer and computer engineering assistant built into Netherite sovereign Markdown studio.
You assist university students (Course: BE Computer Engineering, Sem 5 GTU) in mastering Computer Networks, systems architecture, and engineering principles.
Guidelines:
1. Always format responses in clean GitHub Flavored Markdown with bolding, lists, and tables.
2. Use LaTeX for formulas: inline as $E = mc^2$ and block as $$...$$.
3. When diagrams are helpful, ALWAYS write them as native Mermaid code blocks:
\`\`\`mermaid
...
\`\`\`
4. When explaining topics, follow GTU marking patterns: clear definitions, core working principle, neat diagrams, step-by-step mathematical derivations or numerical traces, and comparative tables.
${contextSnippet}`;

      const contents = [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nStudent Query: ${promptToSend}` }],
        },
      ];

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message ||
            `API Error ${response.status}: Failed to generate content from Google Gemini.`
        );
      }

      const data = await response.json();
      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I received an empty response from Gemini. Please try rephrasing your request.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: generatedText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `**Request Failed**: ${err?.message || "Unknown error occurred."}\n\nPlease check your official API key in settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <aside
        style={{ width: `${copilotWidth}px` }}
        className="relative h-full flex flex-col bg-card border-l border-border/70 z-30 transition-none select-none shrink-0"
      >
        {/* Draggable Left Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-40 group"
          title="Drag to resize Copilot panel"
        >
          <div className="w-0.5 h-8 bg-border group-hover:bg-primary rounded-full absolute left-0.5 top-1/2 -translate-y-1/2 transition-colors" />
        </div>

        {/* Minimalist, Clean Header */}
        <div className="h-12 px-3.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground tracking-tight">Gemini Copilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/40">
                  {model.replace("gemini-", "")}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
                {currentNoteTitle ? currentNoteTitle : "Ready"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Configure API Key & Model"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                setMessages([
                  {
                    id: "reset",
                    role: "assistant",
                    content: "Chat cleared. How can I assist you?",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ])
              }
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Close Copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Setup Notification (If Key Missing) */}
        {!apiKey && (
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="m-2.5 px-3 py-2 rounded-lg bg-muted/60 border border-border/60 text-xs text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-medium">Connect Gemini API Key to chat</span>
            </div>
            <span className="text-[11px] font-semibold text-primary">Configure</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-muted-foreground/60 font-mono">
                  {isUser ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-primary" />
                      <span>Gemini</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[95%] select-text transition-all ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/30 dark:bg-card border border-border/60 text-foreground rounded-tl-xs shadow-2xs"
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : (
                    <CopilotMarkdown
                      content={msg.content}
                      onInsertContent={onInsertContent}
                    />
                  )}
                </div>

                {/* AI Message Action Buttons */}
                {!isUser && msg.id !== "welcome" && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onInsertContent && (
                      <button
                        onClick={() => onInsertContent(msg.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        title="Append to active note"
                      >
                        <ArrowDownToLine className="w-3 h-3 text-primary" />
                        <span>Insert</span>
                      </button>
                    )}

                    {onCreateNoteWithContent && (
                      <button
                        onClick={() => {
                          const suggestedTitle = `AI Note - ${currentNoteTitle || "New"}`;
                          onCreateNoteWithContent(suggestedTitle, msg.content);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        title="Save as new note"
                      >
                        <Plus className="w-3 h-3 text-emerald-500" />
                        <span>Save as Note</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/50 text-muted-foreground text-xs animate-pulse max-w-[80%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Thinking…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <div className="p-3 border-t border-border/60 bg-muted/10">
          <div className="relative flex items-end rounded-xl bg-background border border-border/80 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all p-1.5">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                apiKey
                  ? "Ask Copilot... (Shift+Enter for newline)"
                  : "Connect API key in settings..."
              }
              className="w-full bg-transparent resize-none text-xs text-foreground placeholder:text-muted-foreground/60 outline-none p-1 max-h-28"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="p-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-all cursor-pointer shrink-0 ml-1 mb-0.5"
              title="Send (Enter)"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      <GeminiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onApiKeySaved={(newKey, newModel) => {
          setApiKey(newKey);
          setModel(newModel);
        }}
      />
    </>
  );
}
