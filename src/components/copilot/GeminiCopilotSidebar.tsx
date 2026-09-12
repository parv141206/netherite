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
  ChevronDown,
  Wrench,
  FileEdit,
  FilePlus,
  BrainCircuit,
  ChevronRight,
} from "lucide-react";
import { GeminiSettingsModal, GEMINI_MODELS } from "./GeminiSettingsModal";
import { CopilotMarkdown } from "./CopilotMarkdown";

interface ToolCallItem {
  id: string;
  name: string;
  args: any;
  status: "executing" | "completed" | "failed";
  summary?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  thinking?: string;
  toolCalls?: ToolCallItem[];
}

interface GeminiCopilotSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentNoteTitle?: string;
  currentNoteContent?: string;
  onInsertContent?: (content: string) => void;
  onReplaceContent?: (content: string) => void;
  onCreateNoteWithContent?: (title: string, content: string) => void;
}

export function GeminiCopilotSidebar({
  isOpen,
  onClose,
  currentNoteTitle,
  currentNoteContent,
  onInsertContent,
  onReplaceContent,
  onCreateNoteWithContent,
}: GeminiCopilotSidebarProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am your **Gemini AI Copilot** in Netherite.\n\nI can directly write notes, create diagrams, and solve engineering numericals right into your open document beside me.\n\nTry asking:\n- *\"Write a detailed guide about Linear Regression in this file\"*\n- *\"Generate an architectural Mermaid diagram for OSI vs TCP/IP\"*\n- *\"Solve this Hamming code parity problem step-by-step\"*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [collapsedThinking, setCollapsedThinking] = useState<Record<string, boolean>>({});

  // Draggable Width State (persistent in localStorage)
  const [copilotWidth, setCopilotWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_copilot_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 320 && parsed <= 850) return parsed;
      }
    }
    return 440;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(440);

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
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(850, Math.max(320, startWidthRef.current + delta));
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

  const handleSelectModel = (newModelId: string) => {
    setModel(newModelId);
    setShowModelMenu(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("netherite_gemini_model", newModelId);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Click outside to close model dropdown
  useEffect(() => {
    if (!showModelMenu) return;
    const handleClickOutside = () => setShowModelMenu(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showModelMenu]);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeModelMeta =
    GEMINI_MODELS.find((m) => m.id === model) || {
      id: model,
      name: model.replace("gemini-", "Gemini "),
      tag: "Active",
    };

  // Handle message submission with Tool Calling and Streaming
  const handleSendMessage = async () => {
    const promptToSend = input.trim();
    if (!promptToSend || isLoading) return;

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

    const aiMsgId = `ai-${Date.now()}`;
    const initialAiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      thinking: "",
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const activeDocName = currentNoteTitle || "Untitled";
      const contextSnippet = currentNoteContent
        ? `\n\n--- ACTIVE NOTE CONTEXT ---\nDocument Title: "${activeDocName}"\nCurrent Note Content:\n${currentNoteContent.slice(
            0,
            12000
          )}\n--- END ACTIVE NOTE CONTEXT ---\n`
        : `\n\nActive Document: "${activeDocName}" (Currently empty or new note)\n`;

      const systemInstruction = `You are Gemini Copilot, an expert academic pair-programmer and computer engineering assistant built into Netherite sovereign Markdown studio.
You assist university students (Course: BE Computer Engineering, Sem 5 GTU) in mastering Computer Networks, systems architecture, machine learning, and engineering principles.

IMPORTANT CAPABILITY - DIRECT DOCUMENT EDITING TOOLS:
You are equipped with tools to manipulate the user's notes:
1. 'edit_active_note': Call this when the student asks you to "write about X in this file", "add notes", "insert diagram", or "replace content" in the active file ("${activeDocName}").
   - Set mode="replace" when the student asks to write an entire topic or overwrite/fill the file.
   - Set mode="append" when the student asks to append or add a specific section to what already exists.
2. 'create_new_note': Call this when the student asks to create a brand new note file.

CRITICAL INSTRUCTION:
When the student asks to write or update content "in this file" or the open note, you MUST call the 'edit_active_note' tool rather than just replying with markdown text in the chat!

Formatting Guidelines for note content:
- Use clean GitHub Flavored Markdown with bolding, lists, and tables.
- Use LaTeX for formulas: inline as $E = mc^2$ and block as $$...$$.
- When architectural diagrams are relevant, embed them as native Mermaid blocks (\`\`\`mermaid ... \`\`\`).
- Ensure diagrams are clean, avoiding hardcoded dark style fills.
${contextSnippet}`;

      // Build tools declarations
      const tools = [
        {
          functionDeclarations: [
            {
              name: "edit_active_note",
              description: `Directly edits or populates the active document ("${activeDocName}") currently open in the Netherite editor. Use mode='replace' to overwrite the note content with complete new notes, or mode='append' to add to the existing content.`,
              parameters: {
                type: "OBJECT",
                properties: {
                  content: {
                    type: "STRING",
                    description: "The Markdown content to write into the note.",
                  },
                  mode: {
                    type: "STRING",
                    enum: ["replace", "append"],
                    description: "Whether to replace the whole document ('replace') or append to the end ('append').",
                  },
                  summary: {
                    type: "STRING",
                    description: "A short 1-sentence explanation of what was written.",
                  },
                },
                required: ["content"],
              },
            },
            {
              name: "create_new_note",
              description: "Creates a brand new note file in Netherite with a given title and content.",
              parameters: {
                type: "OBJECT",
                properties: {
                  title: {
                    type: "STRING",
                    description: "The title or filename of the new note (e.g. 'Linear Regression.md').",
                  },
                  content: {
                    type: "STRING",
                    description: "The Markdown content for the new note.",
                  },
                },
                required: ["title", "content"],
              },
            },
          ],
        },
      ];

      // Build conversation contents
      const conversationContents = [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\nStudent Query: ${promptToSend}` }],
        },
      ];

      // Streaming request with SSE
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey.trim()}&alt=sse`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: conversationContents,
          tools,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message ||
            `API Error ${response.status}: Failed to generate content from Google Gemini.`
        );
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      let accumulatedText = "";
      let accumulatedThinking = "";
      const detectedToolCalls: ToolCallItem[] = [];

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const chunk = JSON.parse(jsonStr);
              const candidate = chunk?.candidates?.[0];
              const parts = candidate?.content?.parts || [];

              for (const part of parts) {
                if (part.text) {
                  accumulatedText += part.text;
                }
                if (part.thought || (part as any).thoughtText) {
                  accumulatedThinking += (part.thought || (part as any).thoughtText);
                }
                if (part.functionCall) {
                  const fc = part.functionCall;
                  const existingIdx = detectedToolCalls.findIndex(
                    (t) => t.name === fc.name && JSON.stringify(t.args) === JSON.stringify(fc.args)
                  );
                  if (existingIdx === -1) {
                    detectedToolCalls.push({
                      id: `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                      name: fc.name,
                      args: fc.args,
                      status: "executing",
                      summary: fc.args?.summary || `Executed ${fc.name}`,
                    });
                  }
                }
              }

              // Update UI state live during stream
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? {
                        ...m,
                        content: accumulatedText,
                        thinking: accumulatedThinking,
                        toolCalls: [...detectedToolCalls],
                      }
                    : m
                )
              );
            } catch (err) {
              // Ignore single malformed chunk
            }
          }
        }
      }

      // Process and execute any triggered tool calls!
      for (const tool of detectedToolCalls) {
        if (tool.name === "edit_active_note") {
          const mode = tool.args?.mode || "replace";
          const content = tool.args?.content || "";

          if (mode === "replace" && onReplaceContent) {
            onReplaceContent(content);
            tool.status = "completed";
            tool.summary = `Replaced "${activeDocName}" with ${content.length} characters of structured notes`;
          } else if (onInsertContent) {
            onInsertContent(content);
            tool.status = "completed";
            tool.summary = `Appended ${content.length} characters to "${activeDocName}"`;
          }

          if (!accumulatedText.trim()) {
            accumulatedText = `✓ I have updated **${activeDocName}** directly in the editor with comprehensive notes.`;
          }
        } else if (tool.name === "create_new_note") {
          const title = tool.args?.title || "New Note.md";
          const content = tool.args?.content || "";

          if (onCreateNoteWithContent) {
            onCreateNoteWithContent(title, content);
            tool.status = "completed";
            tool.summary = `Created new note "${title}" with ${content.length} characters`;
          }

          if (!accumulatedText.trim()) {
            accumulatedText = `✓ I have created a new note file **${title}** with the generated content.`;
          }
        }
      }

      // Final state commit for this message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? {
                ...m,
                content:
                  accumulatedText.trim() ||
                  (detectedToolCalls.length > 0
                    ? `✓ Tools executed successfully on active note.`
                    : "I have processed your request."),
                thinking: accumulatedThinking,
                toolCalls: detectedToolCalls,
              }
            : m
        )
      );
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `**Request Failed**: ${err?.message || "Unknown error occurred."}\n\nPlease verify your API key or model availability in Copilot settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? errorMsg : m))
      );
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
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary/50 transition-colors z-40 group"
          title="Drag to resize Copilot panel"
        >
          <div className="w-0.5 h-10 bg-border group-hover:bg-primary rounded-full absolute left-0.5 top-1/2 -translate-y-1/2 transition-colors" />
        </div>

        {/* Minimalist, Clean Header */}
        <div className="h-12 px-3.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground tracking-tight">Gemini Copilot</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/40 truncate max-w-[120px]">
                  {activeModelMeta.name.replace("Gemini ", "")}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
                {currentNoteTitle ? `Doc: ${currentNoteTitle}` : "Ready"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Configure API Key & Defaults"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() =>
                setMessages([
                  {
                    id: "reset",
                    role: "assistant",
                    content: "Chat cleared. What engineering topic would you like to explore?",
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

        {/* Setup Banner (If Key Missing) */}
        {!apiKey && (
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="m-2.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground cursor-pointer hover:bg-primary/15 transition-colors flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-primary shrink-0" />
              <span className="text-[11px] font-medium">Connect Gemini API Key to chat</span>
            </div>
            <span className="text-[11px] font-semibold text-primary underline">Configure</span>
          </div>
        )}

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isThinkingCollapsed = collapsedThinking[msg.id] ?? false;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                {/* Header label */}
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

                {/* Thinking Process Disclosure (if present) */}
                {!isUser && msg.thinking && (
                  <div className="w-full max-w-[95%] mb-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedThinking((prev) => ({
                          ...prev,
                          [msg.id]: !isThinkingCollapsed,
                        }))
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-foreground bg-muted/40 rounded-lg border border-border/40 transition-colors"
                    >
                      <BrainCircuit className="w-3.5 h-3.5 text-primary" />
                      <span>Thinking Process</span>
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${
                          !isThinkingCollapsed ? "rotate-90" : ""
                        }`}
                      />
                    </button>
                    {!isThinkingCollapsed && (
                      <div className="mt-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-[11px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                        {msg.thinking}
                      </div>
                    )}
                  </div>
                )}

                {/* Tool Execution Cards (if any tools called) */}
                {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="w-full max-w-[95%] mb-2 space-y-1.5">
                    {msg.toolCalls.map((tc) => (
                      <div
                        key={tc.id}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs font-mono select-text"
                      >
                        <div className="p-1 rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
                          {tc.name === "edit_active_note" ? (
                            <FileEdit className="w-3.5 h-3.5" />
                          ) : tc.name === "create_new_note" ? (
                            <FilePlus className="w-3.5 h-3.5" />
                          ) : (
                            <Wrench className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground text-[11px]">
                              {tc.name === "edit_active_note"
                                ? `Tool: Edit Active Note (${tc.args?.mode || "replace"})`
                                : tc.name === "create_new_note"
                                ? `Tool: Create Note "${tc.args?.title || "Note"}"`
                                : `Tool: ${tc.name}`}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Executed
                            </span>
                          </div>
                          {tc.summary && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              {tc.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Content Bubble */}
                <div
                  className={`p-3.5 rounded-2xl max-w-[95%] select-text transition-all ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-xs"
                      : "bg-muted/30 dark:bg-card border border-border/60 text-foreground rounded-tl-xs shadow-2xs"
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                  ) : msg.content ? (
                    <CopilotMarkdown
                      content={msg.content}
                      onInsertContent={onInsertContent}
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>Generating response…</span>
                    </div>
                  )}
                </div>

                {/* AI Message Action Buttons */}
                {!isUser && msg.id !== "welcome" && msg.content && (
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy response text"
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

          {/* Active Generation Loading Indicator */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-border/50 text-muted-foreground text-xs animate-pulse max-w-[80%]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Thinking & reasoning…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Elegant Card-Style Input Box with Inline Model Dropdown */}
        <div className="p-3 border-t border-border/60 bg-muted/10">
          <div className="relative flex flex-col rounded-2xl bg-background border border-border/80 shadow-xs focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-2.5">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                apiKey
                  ? `Ask Copilot about ${currentNoteTitle || "your notes"}... (Enter to send)`
                  : "Connect API key to begin chatting..."
              }
              className="w-full bg-transparent resize-none text-xs text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed min-h-[44px] max-h-32 px-1"
            />

            {/* Bottom Toolbar: Model Dropdown + Send Button */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40 mt-1.5">
              {/* Left: Model Selector Dropdown Button */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setShowModelMenu((v) => !v)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[11px] font-medium text-foreground transition-colors border border-border/40"
                  title="Switch Gemini Model"
                >
                  <Sparkles className="w-3 h-3 text-primary shrink-0" />
                  <span className="font-semibold text-[10px] tracking-tight">
                    {activeModelMeta.name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                </button>

                {/* Dropdown Menu */}
                {showModelMenu && (
                  <div className="absolute bottom-full mb-1.5 left-0 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-1 animate-in fade-in zoom-in-95 backdrop-blur-md">
                    <div className="px-2 py-1 text-[10px] font-mono text-muted-foreground border-b border-border/40 mb-1">
                      SELECT GEMINI MODEL
                    </div>
                    {GEMINI_MODELS.map((m) => {
                      const isSelected = m.id === model;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectModel(m.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col ${
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-foreground hover:bg-muted/60"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{m.name}</span>
                            {isSelected && <Check className="w-3 h-3 text-primary" />}
                          </div>
                          <span className="text-[10px] text-muted-foreground/80 font-normal">
                            {m.tag}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Send Button */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-40 transition-all cursor-pointer shadow-xs"
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

export default GeminiCopilotSidebar;
