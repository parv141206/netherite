"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Code2,
  Eye,
  Columns,
  Download,
  Copy,
  Check,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  AlertCircle,
  Maximize2,
  Minimize2,
  FileCode,
  Layers,
  Cpu,
  Share2,
  Activity,
  Workflow,
  HelpCircle,
} from "lucide-react";
import { renderTikzQueued, normalizeTikzCode } from "~/components/editor/tikzQueue";
import { AppleSpinner } from "~/components/ui/AppleSpinner";

export interface TikzTemplate {
  id: string;
  name: string;
  description: string;
  category: "Computer Science" | "Machine Learning" | "Mathematics" | "Systems";
  code: string;
}

export const TIKZ_TEMPLATES: TikzTemplate[] = [
  {
    id: "neural-network",
    name: "Neural Network Architecture",
    description: "Deep MLP with input, hidden, and output layers with weight connections",
    category: "Machine Learning",
    code: `\\begin{tikzpicture}[
  node distance=1.5cm,
  every node/.style={circle, draw=black!70, thick, minimum size=7mm},
  invis/.style={draw=none, fill=none}
]
  % Input Nodes
  \\node[draw=blue!80, fill=blue!15] (x1) at (0, 1.5) {$x_1$};
  \\node[draw=blue!80, fill=blue!15] (x2) at (0, 0.5) {$x_2$};
  \\node[draw=blue!80, fill=blue!15] (x3) at (0, -0.5) {$x_3$};
  \\node[draw=blue!80, fill=blue!15] (x4) at (0, -1.5) {$x_4$};

  % Hidden Nodes
  \\node[draw=purple!80, fill=purple!15] (h1) at (2.5, 1.5) {$h_1$};
  \\node[draw=purple!80, fill=purple!15] (h2) at (2.5, 0.5) {$h_2$};
  \\node[draw=purple!80, fill=purple!15] (h3) at (2.5, -0.5) {$h_3$};
  \\node[draw=purple!80, fill=purple!15] (h4) at (2.5, -1.5) {$h_4$};

  % Output Nodes
  \\node[draw=emerald!80, fill=emerald!15] (y1) at (5, 0.5) {$y_1$};
  \\node[draw=emerald!80, fill=emerald!15] (y2) at (5, -0.5) {$y_2$};

  % Connections
  \\foreach \\i in {1,2,3,4}
    \\foreach \\j in {1,2,3,4}
      \\draw[->, gray!60] (x\\i) -- (h\\j);

  \\foreach \\i in {1,2,3,4}
    \\foreach \\j in {1,2}
      \\draw[->, thick, purple!70] (h\\i) -- (y\\j);

  % Layer Headers
  \\node[invis] at (0, 2.3) {\\textbf{Input}};
  \\node[invis] at (2.5, 2.3) {\\textbf{Hidden}};
  \\node[invis] at (5, 2.3) {\\textbf{Output}};
\\end{tikzpicture}`,
  },
  {
    id: "fsm-automata",
    name: "Finite State Machine (DFA)",
    description: "State transition diagram with initial, accepting, and error states",
    category: "Computer Science",
    code: `\\begin{tikzpicture}[>=latex, node distance=2.8cm, thick]
  \\node[circle, draw=blue!80, fill=blue!10, minimum size=1cm] (q0) {$q_0$};
  \\node[circle, draw=blue!80, fill=blue!10, minimum size=1cm, right of=q0] (q1) {$q_1$};
  \\node[circle, draw=emerald!80, fill=emerald!10, double, double distance=2pt, minimum size=1cm, right of=q1] (q2) {$q_2$};
  \\node[circle, draw=rose!80, fill=rose!10, minimum size=1cm, below of=q1, node distance=2.2cm] (q3) {$q_{err}$};

  \\draw[->] (q0) edge[loop above] node {0} (q0);
  \\draw[->] (q0) edge node[above] {1} (q1);
  \\draw[->] (q1) edge node[above] {0} (q2);
  \\draw[->] (q1) edge[bend left] node[right] {1} (q3);
  \\draw[->] (q2) edge[bend left=45] node[above] {0, 1} (q0);
  \\draw[->] (q3) edge[loop below] node {0, 1} (q3);
  \\draw[<-, dashed] (q0) -- ++(-1.2, 0) node[left] {start};
\\end{tikzpicture}`,
  },
  {
    id: "binary-tree",
    name: "Binary Search Tree",
    description: "Hierarchical binary tree with root, branches, and leaf nodes",
    category: "Computer Science",
    code: `\\begin{tikzpicture}[
  every node/.style={circle, draw=indigo!80, fill=indigo!15, thick, minimum size=8mm},
  level 1/.style={sibling distance=36mm},
  level 2/.style={sibling distance=18mm},
  level 3/.style={sibling distance=10mm},
  edge from parent/.style={draw=gray!70, ->, thick}
]
  \\node {50}
    child { node {30}
      child { node {20}
        child { node[draw=rose!80, fill=rose!20] {10} }
        child { node[draw=rose!80, fill=rose!20] {25} }
      }
      child { node {40}
        child[missing]
        child { node[draw=rose!80, fill=rose!20] {45} }
      }
    }
    child { node {70}
      child { node {60} }
      child { node {80}
        child { node[draw=rose!80, fill=rose!20] {75} }
        child { node[draw=rose!80, fill=rose!20] {90} }
      }
    };
\\end{tikzpicture}`,
  },
  {
    id: "memory-layout",
    name: "Process Memory & Stack Layout",
    description: "Virtual memory address space with Stack, Heap, BSS, Data, and Text",
    category: "Systems",
    code: `\\begin{tikzpicture}[
  box/.style={draw=black!70, thick, minimum width=4.5cm, minimum height=0.9cm, align=center},
  addr/.style={font=\\ttfamily\\footnotesize, anchor=west}
]
  \\node[box, fill=rose!20]  (stack) at (0, 3.2) {\\textbf{Stack Segment} (Local Vars)};
  \\node[addr] at (2.4, 3.2) {0x7FFF FFFF};

  \\node at (0, 2.4) {$\\Downarrow$ \\small Stack Growth $\\Downarrow$};
  \\node at (0, 1.6) {$\\Uparrow$ \\small Heap Growth $\\Uparrow$};

  \\node[box, fill=amber!20]  (heap)  at (0, 0.8) {\\textbf{Heap Segment} (\\texttt{malloc})};
  \\node[box, fill=blue!15]   (bss)   at (0, -0.2) {\\textbf{BSS} (Uninitialized)};
  \\node[box, fill=teal!15]   (data)  at (0, -1.2) {\\textbf{Data} (Initialized Globals)};
  \\node[box, fill=purple!15] (text)  at (0, -2.2) {\\textbf{Text / Code} (Instructions)};
  \\node[addr] at (2.4, -2.2) {0x0040 0000};
\\end{tikzpicture}`,
  },
  {
    id: "math-coordinate-plane",
    name: "Vector Geometry & Coordinate Plane",
    description: "2D Cartesian coordinate plane with orthogonal vectors and parallelogram",
    category: "Mathematics",
    code: `\\begin{tikzpicture}[>=latex, scale=1.1]
  \\draw[step=1cm, gray!25, very thin] (-1,-1) grid (4,4);
  \\draw[->, thick] (-1.2,0) -- (4.2,0) node[right] {$x$};
  \\draw[->, thick] (0,-1.2) -- (0,4.2) node[above] {$y$};

  \\draw[->, ultra thick, blue!80] (0,0) -- (3,1) node[midway, below right] {$\\vec{u} = (3,1)$};
  \\draw[->, ultra thick, purple!80] (0,0) -- (1,3) node[midway, above left] {$\\vec{v} = (1,3)$};
  \\draw[->, thick, dashed, emerald!80] (0,0) -- (4,4) node[above right] {$\\vec{u} + \\vec{v}$};

  \\draw[dashed, gray!70] (3,1) -- (4,4);
  \\draw[dashed, gray!70] (1,3) -- (4,4);

  \\filldraw[black] (0,0) circle (1.5pt) node[below left] {$O(0,0)$};
\\end{tikzpicture}`,
  },
];

interface TikzCanvasProps {
  initialContent?: string;
  theme?: "light" | "dark";
  title?: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export function TikzCanvas({
  initialContent = "",
  theme = "dark",
  title = "Diagram.tikz",
  onChange,
  onSave,
}: TikzCanvasProps) {
  const isDark = theme === "dark";
  const [code, setCode] = useState<string>(() => {
    return initialContent.trim() ? initialContent : TIKZ_TEMPLATES[0]!.code;
  });

  const [svgContent, setSvgContent] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(true);
  const [compileError, setCompileError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"split" | "code" | "preview">("split");
  const [copied, setCopied] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const templatesRef = useRef<HTMLDivElement | null>(null);

  // Zoom & Pan Canvas Transform State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Close templates dropdown on outside click
  useEffect(() => {
    if (!isTemplatesOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setIsTemplatesOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isTemplatesOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2000);
  };

  // Compile TikZ on code / theme change with debounce
  useEffect(() => {
    let active = true;
    setIsCompiling(true);
    setCompileError(null);

    const timer = setTimeout(async () => {
      try {
        const { svg } = await renderTikzQueued(code, isDark);
        if (active) {
          setSvgContent(svg);
          setCompileError(null);
          setIsCompiling(false);
        }
      } catch (err: any) {
        if (active) {
          setCompileError(err?.message || "TikZ compilation error. Check syntax.");
          setIsCompiling(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code, isDark]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (onChange) onChange(newCode);
  };

  const handleApplyTemplate = (template: TikzTemplate) => {
    handleCodeChange(template.code);
    setIsTemplatesOpen(false);
    showToast(`Template applied: ${template.name}`);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast("LaTeX code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopySvg = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
      showToast("Vector SVG copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleExportSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\.[^/.]+$/, "") || "tikz-diagram"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("SVG exported successfully");
  };

  const handleExportPng = () => {
    if (!svgContent) return;
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scaleFactor = 3; // Ultra crisp 300 DPI
      canvas.width = (img.width || 800) * scaleFactor;
      canvas.height = (img.height || 600) * scaleFactor;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = isDark ? "#09090b" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = `${title.replace(/\.[^/.]+$/, "") || "tikz-diagram"}.png`;
        a.click();
        showToast("PNG exported successfully");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Keyboard Shortcuts (Save: Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave) onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  // Pan Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.min(3, Math.max(0.3, z + delta)));
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Studio Top Control Bar */}
      <div className="h-11 px-3 border-b border-border/60 bg-muted/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>TikZ LaTeX Studio</span>
          </div>

          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            {title}
          </span>
        </div>

        {/* Templates Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-1.5">
          {/* Preset Templates */}
          <div className="relative" ref={templatesRef}>
            <button
              onClick={() => setIsTemplatesOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isTemplatesOpen
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-accent/60 hover:bg-accent text-foreground"
              }`}
              title="Insert LaTeX TikZ Template"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Templates</span>
            </button>

            {isTemplatesOpen && (
              <div className="absolute right-0 top-9 w-72 p-2 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl z-50 flex flex-col gap-1 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 flex items-center justify-between border-b border-border/40 pb-1.5 mb-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Publication Presets
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    5 Templates
                  </span>
                </div>

                {TIKZ_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent hover:text-foreground transition-colors flex flex-col gap-0.5 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground group-hover:text-primary">
                        {tpl.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                        {tpl.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {tpl.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/40 text-xs">
            <button
              onClick={() => setViewMode("code")}
              className={`p-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                viewMode === "code"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Code Only"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("split")}
              className={`p-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                viewMode === "split"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Split Code & Preview"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("preview")}
              className={`p-1 px-2 rounded-md font-medium transition-all cursor-pointer ${
                viewMode === "preview"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Interactive Canvas Only"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions: Copy & Export */}
          <button
            onClick={handleCopySvg}
            className="flex items-center gap-1 p-1.5 px-2 rounded-lg text-xs font-medium hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Copy SVG code to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">{copied ? "Copied" : "Copy SVG"}</span>
          </button>

          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1 p-1.5 px-2 rounded-lg text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-all shadow-xs cursor-pointer"
            title="Export as Vector SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Main Studio Body */}
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden relative">
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-xl bg-foreground text-background text-xs font-medium shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Left: LaTeX Code Editor */}
        {(viewMode === "split" || viewMode === "code") && (
          <div
            className={`flex flex-col h-full bg-background border-r border-border/60 overflow-hidden ${
              viewMode === "split" ? "w-1/2" : "w-full"
            }`}
          >
            <div className="px-3 py-1.5 border-b border-border/40 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-mono text-[11px]">LaTeX TikZ Source</span>
              <button
                onClick={handleCopyCode}
                className="hover:text-foreground flex items-center gap-1 text-[11px] font-mono cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy TeX
              </button>
            </div>

            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="\\begin{tikzpicture}\n  \\node {Hello};\n\\end{tikzpicture}"
              spellCheck={false}
              className="flex-1 w-full p-4 font-mono text-xs sm:text-sm bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none resize-none leading-relaxed overflow-y-auto"
            />
          </div>
        )}

        {/* Right: Interactive Live Canvas Viewport */}
        {(viewMode === "split" || viewMode === "preview") && (
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            className={`relative flex-1 h-full bg-muted/5 flex items-center justify-center overflow-hidden select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            } ${viewMode === "split" ? "w-1/2" : "w-full"}`}
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          >
            {/* Top Right Canvas Navigation Controls */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-1 p-1 rounded-xl bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/70 shadow-md text-xs select-none">
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
                className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono px-1 text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <div className="h-3 w-[1px] bg-border/60 mx-0.5" />
              <button
                onClick={handleResetView}
                className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportPng}
                className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Export as PNG Image"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compilation Spinner Overlay */}
            {isCompiling && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background/90 dark:bg-card/90 border border-border/70 shadow-sm text-xs font-mono text-muted-foreground animate-in fade-in duration-100">
                <AppleSpinner size="xs" className="text-foreground" />
                <span>Compiling TeX WebAssembly…</span>
              </div>
            )}

            {/* Error Diagnostics Banner */}
            {compileError && !isCompiling && (
              <div className="absolute bottom-3 left-3 right-3 max-w-lg z-30 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs shadow-lg animate-in slide-in-from-bottom-2 duration-150">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-semibold">LaTeX TikZ Syntax Error</span>
                    <span className="font-mono text-[11px] line-clamp-3 opacity-90">
                      {compileError}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rendered SVG Content with Drag & Zoom transform */}
            {svgContent ? (
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.1s ease-out",
                }}
                className="p-8 max-w-full max-h-full flex items-center justify-center transition-all"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : !isCompiling && !compileError ? (
              <div className="text-center text-xs font-mono text-muted-foreground/60 p-6">
                Type TikZ LaTeX code or choose a template to render
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
