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
  plain/.style={
    draw=none,
    fill=none,
  },
  netnode/.style={
    circle,
    draw=indigo!80,
    fill=indigo!15,
    minimum size=8mm,
    inner sep=0pt,
    thick
  },
  hiddennode/.style={
    circle,
    draw=purple!80,
    fill=purple!15,
    minimum size=8mm,
    inner sep=0pt,
    thick
  },
  outnode/.style={
    circle,
    draw=emerald!80,
    fill=emerald!15,
    minimum size=8mm,
    inner sep=0pt,
    thick
  }
]

  % Input Layer
  \\foreach \\y [count=\\i] in {1.5, 0.5, -0.5, -1.5}
    \\node[netnode] (I-\\i) at (0,\\y) {$x_\\i$};

  % Hidden Layer 1
  \\foreach \\y [count=\\i] in {2, 1, 0, -1, -2}
    \\node[hiddennode] (H1-\\i) at (2.5,\\y) {$h_\\i^{(1)}$};

  % Hidden Layer 2
  \\foreach \\y [count=\\i] in {1.5, 0.5, -0.5, -1.5}
    \\node[hiddennode] (H2-\\i) at (5,\\y) {$h_\\i^{(2)}$};

  % Output Layer
  \\foreach \\y [count=\\i] in {0.8, -0.8}
    \\node[outnode] (O-\\i) at (7.5,\\y) {$\\hat{y}_\\i$};

  % Connect Input to Hidden 1
  \\foreach \\i in {1,...,4}
    \\foreach \\j in {1,...,5}
      \\draw[->, draw=gray!40] (I-\\i) -- (H1-\\j);

  % Connect Hidden 1 to Hidden 2
  \\foreach \\i in {1,...,5}
    \\foreach \\j in {1,...,4}
      \\draw[->, draw=gray!40] (H1-\\i) -- (H2-\\j);

  % Connect Hidden 2 to Output
  \\foreach \\i in {1,...,4}
    \\foreach \\j in {1,...,2}
      \\draw[->, draw=gray!50, thick] (H2-\\i) -- (O-\\j);

  % Layer Labels
  \\node[above=0.3cm of I-1, font=\\bfseries\\small] {Input Layer};
  \\node[above=0.3cm of H1-1, font=\\bfseries\\small] {Hidden Layer 1};
  \\node[above=0.3cm of H2-1, font=\\bfseries\\small] {Hidden Layer 2};
  \\node[above=0.3cm of O-1, font=\\bfseries\\small] {Output $\\hat{y}$};

\\end{tikzpicture}`,
  },
  {
    id: "fsm-automata",
    name: "Finite State Machine (DFA/NFA)",
    description: "State transition diagram with initial and accepting states",
    category: "Computer Science",
    code: `\\begin{tikzpicture}[
  >=stealth,
  node distance=3cm,
  thick,
  state/.style={circle, draw=blue!70, fill=blue!10, minimum size=1.2cm, font=\\sffamily\\bfseries},
  accepting/.style={state, double, double distance=2pt, draw=emerald!70, fill=emerald!10},
  initial/.style={state, draw=indigo!70, fill=indigo!10}
]

  \\node[initial]   (q0)                {$q_0$};
  \\node[state]     (q1) [right of=q0]  {$q_1$};
  \\node[accepting] (q2) [right of=q1]  {$q_2$};
  \\node[state]     (q3) [below of=q1]  {$q_{err}$};

  \\draw[->] (q0) edge[loop above] node {$0$} (q0)
            (q0) edge[above]      node {$1$} (q1)
            (q1) edge[above]      node {$0$} (q2)
            (q1) edge[bend left]  node {$1$} (q3)
            (q2) edge[bend left]  node {$0, 1$} (q0)
            (q3) edge[loop below] node {$0, 1$} (q3);

  \\draw[->, dashed] (-1.5,0) -- node[above] {start} (q0);

\\end{tikzpicture}`,
  },
  {
    id: "binary-tree",
    name: "Binary Search Tree",
    description: "Hierarchical binary tree with left and right child pointers",
    category: "Computer Science",
    code: `\\begin{tikzpicture}[
  every node/.style={circle, draw=indigo!80, fill=indigo!15, thick, minimum size=8mm, font=\\bfseries},
  level 1/.style={sibling distance=40mm},
  level 2/.style={sibling distance=20mm},
  level 3/.style={sibling distance=10mm},
  edge from parent/.style={draw=gray!70, -latex, thick}
]

  \\node (root) {$50$}
    child { node {$30$}
      child { node {$20$}
        child { node[fill=rose!20, draw=rose!70] {$10$} }
        child { node[fill=rose!20, draw=rose!70] {$25$} }
      }
      child { node {$40$}
        child[missing]
        child { node[fill=rose!20, draw=rose!70] {$45$} }
      }
    }
    child { node {$70$}
      child { node {$60$} }
      child { node {$80$}
        child { node[fill=rose!20, draw=rose!70] {$75$} }
        child { node[fill=rose!20, draw=rose!70] {$90$} }
      }
    };

\\end{tikzpicture}`,
  },
  {
    id: "memory-layout",
    name: "Process Memory & Stack Layout",
    description: "Virtual memory address space with Text, Data, Heap, and Stack",
    category: "Systems",
    code: `\\begin{tikzpicture}[
  box/.style={draw=black!70, thick, minimum width=5cm, minimum height=1cm, align=center, font=\\sffamily},
  stack/.style={box, fill=rose!15},
  heap/.style={box, fill=amber!15},
  bss/.style={box, fill=blue!15},
  data/.style={box, fill=teal!15},
  text/.style={box, fill=purple!15}
]

  \\node[stack] (stack) at (0, 4) {\\textbf{Stack Frame} (Local Vars, Returns)};
  \\node[draw=none] (arrow1) at (0, 3.2) {$\\Downarrow$ Growth $\\Downarrow$};
  
  \\node[heap]  (heap)  at (0, 2.2) {\\textbf{Heap Segment} (\\texttt{malloc} / \\texttt{new})};
  \\node[draw=none] (arrow2) at (0, 1.4) {$\\Uparrow$ Growth $\\Uparrow$};

  \\node[bss]   (bss)   at (0, 0.4) {\\textbf{BSS Segment} (Uninitialized Globals)};
  \\node[data]  (data)  at (0, -0.6) {\\textbf{Data Segment} (Initialized Globals)};
  \\node[text]  (text)  at (0, -1.6) {\\textbf{Text / Code} (Binary Instructions)};

  % Addresses
  \\node[anchor=west, font=\\ttfamily\\small] at (2.7, 4) {0x7FFF FFFF (High)};
  \\node[anchor=west, font=\\ttfamily\\small] at (2.7, -1.6) {0x0040 0000 (Low)};

\\end{tikzpicture}`,
  },
  {
    id: "math-coordinate-plane",
    name: "Vector Geometry & Coordinate Plane",
    description: "2D Cartesian coordinate plane with orthogonal vectors and angle arc",
    category: "Mathematics",
    code: `\\begin{tikzpicture}[>=latex, scale=1.2]
  % Grid & Axes
  \\draw[help lines, color=gray!30] (-1,-1) grid (4,4);
  \\draw[->, thick] (-1.2,0) -- (4.2,0) node[right] {$x$};
  \\draw[->, thick] (0,-1.2) -- (0,4.2) node[above] {$y$};

  % Vectors
  \\draw[->, ultra thick, blue!80] (0,0) -- (3,1) node[midway, below right] {$\\vec{u} = (3, 1)$};
  \\draw[->, ultra thick, purple!80] (0,0) -- (1,3) node[midway, above left] {$\\vec{v} = (1, 3)$};
  \\draw[->, thick, dashed, emerald!80] (0,0) -- (4,4) node[above right] {$\\vec{u} + \\vec{v}$};

  % Parallelogram lines
  \\draw[dashed, gray] (3,1) -- (4,4);
  \\draw[dashed, gray] (1,3) -- (4,4);

  % Origin
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

  // Zoom & Pan Canvas Transform State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

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
    }, 300);

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
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleCopySvg = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopied(true);
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
          <div className="relative group/tpl">
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-accent/60 hover:bg-accent text-foreground transition-colors cursor-pointer"
              title="Insert LaTeX TikZ Template"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden md:inline">Templates</span>
            </button>

            <div className="absolute right-0 top-8 w-64 p-1.5 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-2xl z-50 hidden group-hover/tpl:flex flex-col gap-1 text-xs">
              <span className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Publication Presets
              </span>
              {TIKZ_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl)}
                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-accent hover:text-foreground transition-colors flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="font-semibold text-foreground">{tpl.name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {tpl.description}
                  </span>
                </button>
              ))}
            </div>
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
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
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
      <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden">
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
            className={`relative flex-1 h-full bg-muted/5 flex items-center justify-center overflow-hidden checkerboard-bg select-none ${
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
            {compileError && (
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
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
              className="p-8 max-w-full max-h-full flex items-center justify-center transition-all"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
