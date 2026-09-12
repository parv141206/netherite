"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Workflow,
  GraduationCap,
  ListPlus,
  HelpCircle,
  Calculator,
} from "lucide-react";
import { GeminiSettingsModal, GEMINI_MODELS } from "./GeminiSettingsModal";

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
        "👋 Hello! I am your **Gemini AI Copilot** in Netherite.\n\nI can help you:\n- 📖 Explain complex concepts from your notes for GTU exams\n- 📊 Generate custom **Mermaid diagrams**\n- 🧮 Solve step-by-step engineering numericals (CRC, Hamming code, VLSM, Shannon Capacity)\n- ✍️ Expand, structure, or summarize any topic\n\nAsk me anything or pick a quick prompt below!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input.trim();
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
    if (!customPrompt) setInput("");
    setIsLoading(true);

    try {
      // Build conversation history & context
      const contextSnippet = currentNoteContent
        ? `\n\n--- ACTIVE NOTE CONTEXT ---\nDocument Title: ${currentNoteTitle || "Untitled"}\nContent:\n${currentNoteContent.slice(
            0,
            12000
          )}\n--- END CONTEXT ---\n`
        : "";

      const systemInstruction = `You are Gemini Copilot, an expert academic pair-programmer and computer engineering professor built into Netherite sovereign Markdown studio.
You assist university students (specifically B.E. Computer Engineering, Sem 5 GTU) in mastering Computer Networks, systems architecture, and engineering principles.
Guidelines:
1. Always format responses in clean GitHub Flavored Markdown with bolding, lists, and tables.
2. Use LaTeX for formulas: inline as $E = mc^2$ and block as $$...$$.
3. When diagrams are helpful, ALWAYS write them as native Mermaid code blocks:
\`\`\`mermaid
...
\`\`\`
4. When explaining topics, follow GTU marking patterns: clear definitions, core working principle, neat ASCII or Mermaid diagrams, step-by-step mathematical derivations or numerical traces, and comparative tables.
${contextSnippet}`;

      // Format for Google Gemini generateContent REST API
      const contents = [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nStudent Query: ${promptToSend}` }],
        },
      ];

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error?.message || `Google API error (Status ${res.status})`
        );
      }

      const replyText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I couldn't generate a response. Please check your prompt or API key.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Error communicating with Gemini API**:\n\n${
          err?.message || err
        }\n\n*Click the Settings gear at the top to verify your official Google Gemini API key.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
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

  const quickPrompts = [
    {
      icon: GraduationCap,
      label: "Explain Note for Exam",
      prompt: `Please explain the key concepts in this note ("${currentNoteTitle || "this topic"}") thoroughly as expected in a 7-mark GTU examination answer, including core definitions, flow, and key points to remember.`,
    },
    {
      icon: Workflow,
      label: "Create Mermaid Diagram",
      prompt: `Generate a detailed Mermaid diagram that visualizes the core architecture or protocol flow described in this note ("${currentNoteTitle || "this topic"}"). Output only clean markdown with the mermaid block.`,
    },
    {
      icon: ListPlus,
      label: "Find Gaps & Expand",
      prompt: `Analyze this note ("${currentNoteTitle || "this topic"}") and identify any missing sub-topics, trade-offs, standard RFC specifications, or exam questions that should be added to make it completely exhaustive.`,
    },
    {
      icon: Calculator,
      label: "Worked Numerical",
      prompt: `Provide a realistic, step-by-step worked numerical problem based on this topic ("${currentNoteTitle || "this topic"}") with full formulas, calculation steps, and final answer.`,
    },
  ];

  return (
    <>
      <aside
        className="fixed sm:relative inset-y-0 right-0 z-40 w-80 sm:w-96 border-l border-border bg-[var(--sidebar-bg)] flex flex-col h-full select-none shadow-2xl sm:shadow-none animate-in slide-in-from-right duration-200 shrink-0"
      >
        {/* Header Bar */}
        <div className="px-3.5 py-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <span>Gemini Copilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300">
                  {model.replace("gemini-", "")}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/80 truncate max-w-[170px]">
                {currentNoteTitle ? `Context: ${currentNoteTitle}` : "Ready"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Configure Gemini API Key & Model"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                setMessages([
                  {
                    id: "reset",
                    role: "assistant",
                    content: "Chat cleared. How can I assist you with your notes?",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ])
              }
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear Chat History"
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

        {/* API Key Missing Alert */}
        {!apiKey && (
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="m-2.5 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 cursor-pointer hover:bg-purple-500/15 transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 shrink-0 text-purple-500" />
              <div>
                <div className="font-semibold">Connect Gemini API Key</div>
                <div className="text-[10px] opacity-80">
                  Click to enter your official free API key
                </div>
              </div>
            </div>
            <span className="text-[11px] underline font-semibold shrink-0">Setup</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-muted-foreground/70">
                  {isUser ? (
                    <>
                      <span>You</span>
                      <User className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-purple-500" />
                      <span>Gemini</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[95%] leading-relaxed select-text ${
                    isUser
                      ? "bg-purple-600 text-white rounded-tr-xs"
                      : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-2xs whitespace-pre-wrap font-sans"
                  }`}
                >
                  {msg.content}
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
                          <span className="text-emerald-500">Copied</span>
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
                        title="Append into active note"
                      >
                        <ArrowDownToLine className="w-3 h-3 text-blue-500" />
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
                        title="Create new note from response"
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
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-card border border-border/60 text-muted-foreground text-xs animate-pulse max-w-[80%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
              <span>Gemini is thinking & formulating answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 border-t border-border/40 bg-muted/10 space-y-1">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase px-1 tracking-wider">
            Quick Prompts
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickPrompts.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card hover:bg-accent border border-border/60 text-[11px] text-muted-foreground hover:text-foreground whitespace-nowrap shrink-0 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Icon className="w-3 h-3 text-purple-500" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="p-2.5 border-t border-border/60 bg-muted/20">
          <div className="relative flex items-end rounded-xl bg-background border border-border/80 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/40 transition-all p-1.5">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                apiKey
                  ? "Ask Gemini Copilot... (Shift+Enter for new line)"
                  : "Connect API key to chat..."
              }
              className="w-full bg-transparent resize-none text-xs text-foreground placeholder:text-muted-foreground/60 outline-none p-1 max-h-28"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !input.trim()}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-all cursor-pointer shrink-0 ml-1 mb-0.5"
              title="Send message"
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
