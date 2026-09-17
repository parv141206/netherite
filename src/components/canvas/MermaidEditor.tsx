"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useId,
} from "react";
import { renderMermaidQueued, postProcessSvg } from "~/components/editor/mermaidQueue";
import {
  Download,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Columns,
  Eye,
  Code2,
  AlertCircle,
  Copy,
  Check,
  FileCode,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import { MermaidExportModal } from "./MermaidExportModal";

interface MermaidEditorProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
  title?: string;
}

export const MERMAID_TEMPLATES = [
  {
    name: "Flowchart (TD)",
    category: "Workflow",
    code: `flowchart TD
    Start([Start]) --> Process[Process Data]
    Process --> Decision{Is Valid?}
    Decision -- Yes --> Success[Operation Complete]
    Decision -- No --> Error[Log Error]
    Success --> End([Finish])
    Error --> End`,
  },
  {
    name: "Sequence Diagram",
    category: "Interaction",
    code: `sequenceDiagram
    autonumber
    actor User as Client App
    participant API as Netherite API
    participant Drive as Google Drive
    
    User->>API: Save Note Content
    API->>Drive: Check Existing Metadata
    Drive-->>API: 200 OK (Revision Token)
    API->>Drive: Multipart Upload (.md / .mmd)
    Drive-->>API: 200 OK (New ID)
    API-->>User: Synced Successfully`,
  },
  {
    name: "Class Diagram",
    category: "Architecture",
    code: `classDiagram
    class Note {
        +String id
        +String title
        +String content
        +Date modifiedTime
        +save() void
        +export() Blob
    }
    class Workspace {
        +List~Note~ notes
        +Note activeNote
        +openNote(id)
        +syncAll()
    }
    Workspace "1" *-- "many" Note : contains`,
  },
  {
    name: "State Diagram",
    category: "Workflow",
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Editing : User Input
    Editing --> Dirty : Local Debounce
    Dirty --> Syncing : Auto Save / Ctrl+S
    Syncing --> Idle : Drive Confirmed
    Syncing --> Conflict : Stale Token
    Conflict --> Idle : User Resolution`,
  },
  {
    name: "Entity Relationship (ER)",
    category: "Data",
    code: `erDiagram
    USER ||--o{ NOTE : creates
    NOTE ||--o{ ATTACHMENT : embeds
    NOTE ||--o{ CHANGELOG_ENTRY : records
    USER {
        string id PK
        string email
        string name
    }
    NOTE {
        string id PK
        string title
        string mimeType
    }`,
  },
  {
    name: "Git Graph",
    category: "VCS",
    code: `gitGraph
    commit id: "Initial commit"
    branch feature/apollon
    checkout feature/apollon
    commit id: "Add UML Studio"
    commit id: "Fix diff tracking"
    checkout main
    merge feature/apollon id: "Release UML"
    branch feature/mermaid
    checkout feature/mermaid
    commit id: "Add Mermaid Canvas"
    checkout main
    merge feature/mermaid id: "Release Mermaid"`,
  },
  {
    name: "Gantt Roadmap",
    category: "Planning",
    code: `gantt
    title Netherite Engineering Roadmap
    dateFormat YYYY-MM-DD
    section Core Engine
    Sovereign Google Drive API  :done, 2026-08-01, 2026-08-15
    KaTeX Math Typesetting      :done, 2026-08-16, 2026-08-25
    section Modeling & Vectors
    Excalidraw Vector Canvas    :done, 2026-08-26, 2026-09-02
    Apollon 13 UML Suites       :done, 2026-09-03, 2026-09-07
    Mermaid Real-Time Studio    :active, 2026-09-08, 2026-09-12`,
  },
  {
    name: "Pie Distribution",
    category: "Metrics",
    code: `pie title Netherite Asset Breakdown
    "Markdown Notes (.md)" : 45
    "Architecture Diagrams (.apollon)" : 25
    "Vector Canvases (.excalidraw)" : 20
    "Mermaid Charts (.mmd)" : 10`,
  },
  {
    name: "Mindmap",
    category: "Ideation",
    code: `mindmap
  root((Netherite))
    Sovereignty
      Zero Database
      Google Drive Native
      Standard File Formats
    Creative Modalities
      Markdown + KaTeX
      Apollon UML Studio
      Excalidraw Whiteboard
      Mermaid Code Studio
    Ergonomics
      0ms Latency
      Trimmed LCS Diff Engine
      Minimalist Dark UI`,
  },
  {
    name: "User Journey",
    category: "Experience",
    code: `journey
    title Note Taking & Sync Journey
    section Inspiration
      Launch Netherite: 5: User
      Select Diagram Type: 4: User
    section Authoring
      Live Code Typing: 5: User
      Real-Time Preview: 5: Netherite
    section Storage
      Press Ctrl+S: 5: User
      Background Drive Sync: 5: Netherite`,
  },
];

const DEFAULT_MERMAID_CODE = MERMAID_TEMPLATES[0]!.code;

export default function MermaidEditor({
  initialContent = "",
  theme: propTheme,
  onChange,
  onSave,
  title = "diagram",
}: MermaidEditorProps) {
  const { isDark: globalDark } = useTheme();
  const activeTheme = propTheme ?? (globalDark ? "dark" : "light");
  const isDark = activeTheme === "dark";

  const [code, setCode] = useState<string>(() => {
    if (typeof initialContent === "string" && initialContent.trim() !== "") {
      return initialContent;
    }
    return DEFAULT_MERMAID_CODE;
  });

  // Synchronize code if initialContent arrives asynchronously from Google Drive
  useEffect(() => {
    if (initialContent && initialContent.trim().length > 0) {
      setCode((prev) => {
        if (prev === DEFAULT_MERMAID_CODE || prev.trim() === "") {
          return initialContent;
        }
        return prev;
      });
    }
  }, [initialContent]);

  const [svgContent, setSvgContent] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<"split" | "preview" | "code">("split");
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Pan and zoom states for preview
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Touch pinch-to-zoom for canvas preview
  const lastTouchDistRef = useRef<number>(0);
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistRef.current = Math.hypot(dx, dy);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastTouchDistRef.current > 0) {
          const scale = dist / lastTouchDistRef.current;
          setZoom((z) =>
            Math.min(3.5, Math.max(0.2, parseFloat((z * scale).toFixed(2))))
          );
        }
        lastTouchDistRef.current = dist;
      }
    };

    const onTouchEnd = () => {
      lastTouchDistRef.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Debounced rendering using shared serial queue
  useEffect(() => {
    let isCancelled = false;
    const renderTimer = setTimeout(async () => {
      if (!code || code.trim() === "") {
        setSvgContent("");
        setParseError(null);
        return;
      }

      setIsRendering(true);
      const uniqueId = `mermaid-studio-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const { svg } = await renderMermaidQueued(uniqueId, code, isDark);
        if (!isCancelled) {
          setSvgContent(postProcessSvg(svg, isDark));
          setParseError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          // Keep prior valid SVG if present and set error banner
          const msg = err?.message || err?.str || String(err);
          setParseError(msg.replace(/^Error:\s*/i, ""));
        }
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(renderTimer);
    };
  }, [code, isDark]);

  // Handle Code Changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (onChangeRef.current) {
      onChangeRef.current(newCode);
    }
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const updated = val.substring(0, start) + "  " + val.substring(end);
      handleCodeChange(updated);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  // Keyboard Shortcuts (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (onSaveRef.current) {
          onSaveRef.current();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Native non-passive wheel listener for smooth trackpad pinch-to-zoom
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const factor = 1 - e.deltaY * 0.005;
        setZoom((prev) => Math.max(0.2, Math.min(parseFloat((prev * factor).toFixed(2)), 4)));
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetTransform = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full flex flex-col bg-background text-foreground select-none overflow-hidden font-sans">
      {/* Top Floating Action Toolbar */}
      <div className="h-12 border-b border-border/60 bg-muted/25 px-4 flex items-center justify-between shrink-0 gap-2 flex-wrap z-10">
        {/* Left: Branding & Template Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mermaid Studio</span>
          </div>

          {/* Template Preset Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                const selected = MERMAID_TEMPLATES.find((t) => t.name === e.target.value);
                if (selected) handleCodeChange(selected.code);
              }}
              value=""
              className="text-xs px-2.5 py-1 rounded-lg bg-card hover:bg-accent border border-border/60 text-foreground cursor-pointer focus:outline-none transition-colors"
              title="Insert a Mermaid Template"
            >
              <option value="" disabled>
                Templates ▾
              </option>
              {MERMAID_TEMPLATES.map((tmpl) => (
                <option key={tmpl.name} value={tmpl.name} className="bg-card text-foreground py-1">
                  {tmpl.name} ({tmpl.category})
                </option>
              ))}
            </select>
          </div>

          {/* Syntax Status */}
          {parseError ? (
            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-mono font-medium max-w-[200px] sm:max-w-xs truncate" title={parseError}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">Syntax Error</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-500 font-mono font-medium">
              <CheckCircle2 className="w-3 h-3" />
              <span>Valid Diagram</span>
            </div>
          )}
        </div>

        {/* Right: Layout Switcher & Actions */}
        <div className="flex items-center gap-2">
          {/* Layout Mode Segmented Control */}
          <div className="flex items-center p-0.5 bg-background border border-border/60 rounded-lg text-xs">
            <button
              onClick={() => setLayoutMode("split")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layoutMode === "split"
                  ? "bg-muted text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Split View (Code & Preview)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode("code")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layoutMode === "code"
                  ? "bg-muted text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Code Editor Only"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutMode("preview")}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                layoutMode === "preview"
                  ? "bg-muted text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Preview Only"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-xl bg-card hover:bg-accent border border-border/60 text-foreground shadow-xs transition-all cursor-pointer"
            title="Export Diagram (PNG, SVG, Clipboard)"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export...</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Pane: Code Editor */}
        {(layoutMode === "split" || layoutMode === "code") && (
          <div
            className={`h-full flex flex-col bg-card border-r border-border/60 ${
              layoutMode === "split" ? "w-full md:w-1/2 lg:w-5/12" : "w-full"
            }`}
          >
            <div className="px-4 py-2 border-b border-border/40 bg-muted/20 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
              <span>Mermaid Definition (.mmd)</span>
              <span>{code.split("\n").length} lines</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDownTextarea}
              placeholder="Type your Mermaid diagram syntax here..."
              spellCheck={false}
              className="flex-1 w-full p-4 font-mono text-xs leading-relaxed bg-transparent text-foreground resize-none focus:outline-none select-text selection:bg-teal-500/30 overflow-y-auto"
            />
          </div>
        )}

        {/* Right Pane: Interactive Live Preview */}
        {(layoutMode === "split" || layoutMode === "preview") && (
          <div
            ref={previewContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`h-full flex-1 flex flex-col relative overflow-hidden bg-background select-none cursor-${
              isDragging ? "grabbing" : "grab"
            }`}
          >
            {/* Floating Zoom / Pan Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 bg-card/90 backdrop-blur-md border border-border/70 rounded-xl shadow-md">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.15, 3.5))}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom In (or Ctrl + Scroll)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.15, 0.2))}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom Out (or Ctrl + Scroll)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={resetTransform}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset Zoom & Position"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-2 text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Error Overlay Toast if parsing failed */}
            {parseError && (
              <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-md text-xs text-rose-600 dark:text-rose-400 shadow-lg max-w-md animate-in fade-in duration-200 select-text">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold font-mono">Mermaid Syntax Warning</span>
                    <p className="font-mono text-[11px] mt-0.5 whitespace-pre-wrap break-all leading-tight opacity-90">
                      {parseError}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rendered SVG Canvas Container */}
            <div className="flex-1 w-full h-full flex items-center justify-center p-6 overflow-hidden">
              {svgContent ? (
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.08s ease-out",
                  }}
                  className="max-w-none max-h-none flex items-center justify-center select-text"
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs font-medium">Type Mermaid code on the left</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    Your diagram will render dynamically here
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <MermaidExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        svgContent={svgContent}
        mermaidCode={code}
        diagramTitle={title}
        isDark={isDark}
      />
    </div>
  );
}
