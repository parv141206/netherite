"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import mermaid from "mermaid";
import {
  Workflow,
  Code2,
  Eye,
  Pencil,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  X,
  Minimize2,
  SlidersHorizontal,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import { renderMermaidQueued } from "./mermaidQueue";

export function CodeBlockView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const language = (node.attrs.language || "").toLowerCase().trim();
  const isMermaid = language === "mermaid";
  const rawCode = node.textContent;

  const { isDark: globalDark } = useTheme();
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return globalDark;
  });

  useEffect(() => {
    setIsDark(globalDark);
  }, [globalDark]);

  // Track system / HTML class changes for theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // Mode: "preview" vs "edit"
  // Default to preview mode for existing diagrams, or edit mode if empty
  const [mode, setMode] = useState<"preview" | "edit">(() => {
    return rawCode.trim() === "" ? "edit" : "preview";
  });

  const [svgContent, setSvgContent] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Diagram Customization State
  const mermaidTheme = node.attrs.mermaidTheme || "auto";
  const mermaidBg = node.attrs.mermaidBg || "card";
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);

  // Zoom and Pan states for Mermaid preview
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<"readable" | "contain">("readable");

  // Focus helper to transition into edit mode
  const enterEditMode = useCallback(() => {
    setMode("edit");
    setTimeout(() => {
      if (typeof getPos === "function") {
        const pos = getPos();
        if (typeof pos === "number") {
          editor.commands.focus(pos + 1);
        }
      }
    }, 40);
  }, [editor, getPos]);

  // Click outside listener to exit edit mode
  useEffect(() => {
    if (!isMermaid || mode !== "edit") return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMode("preview");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMermaid, mode]);

  // Re-render Mermaid SVG whenever code or theme changes
  useEffect(() => {
    if (!isMermaid) return;

    if (!rawCode || rawCode.trim() === "") {
      setSvgContent("");
      setParseError(null);
      return;
    }

    let isCancelled = false;
    const renderTimer = setTimeout(async () => {
      const effectiveTheme =
        mermaidTheme === "auto" ? (isDark ? "dark" : "neutral") : mermaidTheme;

      try {
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: effectiveTheme,
          securityLevel: "loose",
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true,
            padding: 24,
            nodeSpacing: 50,
            rankSpacing: 50,
            curve: "basis",
          },
          themeVariables: effectiveTheme === "dark" ? {
            darkMode: true,
            background: "transparent",
            primaryColor: "#1e293b",
            primaryTextColor: "#f1f5f9",
            primaryBorderColor: "#475569",
            lineColor: "#94a3b8",
            secondaryColor: "#0f172a",
            tertiaryColor: "#1e293b",
            nodeBorder: "#475569",
            mainBkg: "#1e293b",
            nodeTextColor: "#f8fafc",
            clusterBkg: "#1e293b",
            clusterBorder: "#475569",
            titleColor: "#f8fafc",
            edgeLabelBackground: "#0f172a",
          } : {
            darkMode: false,
            background: "transparent",
            primaryColor: "#ffffff",
            primaryTextColor: "#0f172a",
            primaryBorderColor: "#cbd5e1",
            lineColor: "#64748b",
            secondaryColor: "#f8fafc",
            tertiaryColor: "#f1f5f9",
            nodeBorder: "#cbd5e1",
            mainBkg: "#ffffff",
            nodeTextColor: "#0f172a",
            clusterBkg: "#f8fafc",
            clusterBorder: "#cbd5e1",
            titleColor: "#0f172a",
            edgeLabelBackground: "#ffffff",
          },
        });
      } catch (err) {
        console.warn("Mermaid init warning:", err);
      }

      // If in light mode, dynamically sanitize hardcoded dark fills from legacy notes
      let codeToRender = rawCode;
      if (!isDark) {
        codeToRender = codeToRender
          .replace(/fill:#1e293b/gi, "fill:#f8fafc")
          .replace(/fill:#0f172a/gi, "fill:#f8fafc")
          .replace(/fill:#020617/gi, "fill:#f8fafc")
          .replace(/fill:#18181b/gi, "fill:#f8fafc")
          .replace(/fill:#111827/gi, "fill:#f8fafc")
          .replace(/color:#fff(fff)?\b/gi, "color:#0f172a");
      }

      const uniqueId = `mermaid-md-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const { svg } = await renderMermaidQueued(uniqueId, codeToRender);
        if (!isCancelled) {
          // Process SVG to ensure responsive scaling without width-clipping
          let processedSvg = svg;
          processedSvg = processedSvg.replace(/style="max-width:[^"]*"/i, 'style="max-width: 100%; height: auto;"');
          if (!processedSvg.includes("style=")) {
            processedSvg = processedSvg.replace(/<svg\s/i, '<svg style="max-width: 100%; height: auto;" ');
          }

          // Inject custom CSS inside SVG to guarantee elegant cluster backgrounds and clear text
          const customStyle = `<style>
            .cluster rect { fill: ${isDark ? "#1e293b" : "#f8fafc"} !important; stroke: ${isDark ? "#475569" : "#cbd5e1"} !important; rx: 8px !important; }
            .node rect, .node circle, .node ellipse, .node polygon, .node path { rx: 6px; }
            .node .label, .nodeLabel { font-family: Inter, system-ui, sans-serif !important; }
            text { font-family: Inter, system-ui, sans-serif !important; }
          </style>`;

          if (processedSvg.includes("</svg>")) {
            processedSvg = processedSvg.replace("</svg>", `${customStyle}</svg>`);
          }

          setSvgContent(processedSvg);
          setParseError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const msg = err?.message || err?.str || String(err);
          setParseError(msg.replace(/^Error:\s*/i, ""));
        }
      }
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(renderTimer);
    };
  }, [isMermaid, rawCode, isDark, mermaidTheme]);

  // Copy code handler
  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rawCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [rawCode]);

  // Download SVG handler
  const handleDownloadSvg = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mermaid-diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // Intercept Esc & Ctrl+Enter in edit mode & fullscreen modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isFullscreen && e.key === "Escape") {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
      if (!isMermaid) return;
      if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        setMode("preview");
      }
    },
    [isFullscreen, isMermaid]
  );

  // Zoom in / out / reset helpers
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.min(3.5, parseFloat((z + 0.2).toFixed(2))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.max(0.35, parseFloat((z - 0.2).toFixed(2))));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);

  // Native non-passive wheel listener for Mermaid container to intercept Ctrl+Wheel and prevent Chrome browser zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isMermaid) return;

    const onNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((z) => Math.min(4.0, Math.max(0.3, parseFloat((z + delta).toFixed(2)))));
      }
    };

    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onNativeWheel);
    };
  }, [isMermaid]);

  // Native non-passive wheel listener for Fullscreen modal
  useEffect(() => {
    const el = fullscreenContainerRef.current;
    if (!el || !isFullscreen) return;

    const onNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((z) => Math.min(4.0, Math.max(0.3, parseFloat((z + delta).toFixed(2)))));
      }
    };

    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onNativeWheel);
    };
  }, [isFullscreen]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left mouse button
    setIsDragging(true);
    dragMovedRef.current = false;
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx - pan.x, dy - pan.y) > 4) {
      dragMovedRef.current = true;
    }
    setPan({ x: dx, y: dy });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Close fullscreen on Esc
  useEffect(() => {
    if (!isFullscreen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isFullscreen]);

  // Click outside listener for customize popover
  useEffect(() => {
    if (!isCustomizeOpen) return;
    const handleClose = () => setIsCustomizeOpen(false);
    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, [isCustomizeOpen]);

  const getBgClass = (bg: string) => {
    switch (bg) {
      case "transparent":
        return "bg-transparent";
      case "contrast":
        return "bg-zinc-100 dark:bg-zinc-900 border-t border-b border-border/80";
      case "warm":
        return "bg-amber-50/60 dark:bg-amber-950/20";
      case "card":
      default:
        return "bg-background/50";
    }
  };

  // ==========================================
  // CASE 1: Standard Code Block (non-Mermaid)
  // ==========================================
  if (!isMermaid) {
    return (
      <NodeViewWrapper className="relative group/code my-4 rounded-xl border border-border/70 bg-muted/20 dark:bg-muted/10 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 dark:bg-muted/40 border-b border-border/50 text-xs font-mono text-muted-foreground select-none">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-foreground/80">
            {language || "code"}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-background/80 hover:text-foreground transition-all text-[11px]"
            title="Copy Code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500 text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>
        <pre className="p-3.5 font-mono text-xs overflow-x-auto leading-relaxed text-foreground">
          <NodeViewContent as="div" className="outline-none" />
        </pre>
      </NodeViewWrapper>
    );
  }

  // Render Fullscreen Lightbox via Portal so it escapes ProseMirror's stacking context completely
  const fullscreenModal = isFullscreen && typeof document !== "undefined" ? createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      {/* Fullscreen Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm select-none">
        <div className="flex items-center gap-2">
          <Workflow className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-sm text-foreground">
            Mermaid Studio Inspector
          </span>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            Zoom: {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
              title="Reset 100%"
            >
              100%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1.5 hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground border-l border-border/40"
              title="Reset Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
            title="Download SVG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export SVG</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Canvas Viewport */}
      <div
        ref={fullscreenContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center p-8 select-none ${getBgClass(
          mermaidBg
        )} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          className="flex items-center justify-center min-w-fit [&>svg]:min-w-[fit-content] [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </div>

      {/* Fullscreen Footer Hint */}
      <div className="px-4 py-2 border-t border-border/40 bg-card/40 text-center text-xs font-mono text-muted-foreground select-none">
        Click & drag to pan • Scroll or use buttons to zoom • Press Esc to close
      </div>
    </div>,
    document.body
  ) : null;

  // ==========================================
  // CASE 2: Mermaid Diagram Block
  // ==========================================
  return (
    <NodeViewWrapper
      ref={containerRef}
      onKeyDown={handleKeyDown}
      data-mermaid-container="true"
      className="relative group/mermaid my-3 rounded-lg border border-border/40 hover:border-border/70 transition-all overflow-hidden bg-card/20"
    >
      {/* Edit Mode Header Bar (Only shown when editing) */}
      {mode === "edit" && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/60 text-xs select-none gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Code2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Editing Mermaid</span>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                (Esc to preview)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
              title="Copy Mermaid Code"
            >
              {copied ? (
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
            <button
              type="button"
              onClick={() => setMode("preview")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
              title="Exit edit mode (Esc)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 1. CODE AREA (NodeViewContent)             */}
      {/* In preview mode: invisible but in DOM      */}
      {/* In edit mode: fully visible code editor    */}
      {/* ========================================== */}
      <div
        style={{
          position: mode === "preview" ? "absolute" : "relative",
          opacity: mode === "preview" ? 0 : 1,
          pointerEvents: mode === "preview" ? "none" : "auto",
          height: mode === "preview" ? 0 : "auto",
          overflow: "hidden",
        }}
      >
        <div className="p-3 bg-muted/20 dark:bg-muted/10">
          <pre className="p-3 font-mono text-xs leading-relaxed bg-background/80 dark:bg-background/60 border border-border/50 rounded-lg overflow-x-auto text-foreground focus-within:ring-1 focus-within:ring-primary/40">
            <NodeViewContent as="div" className="outline-none block w-full min-h-[4rem]" />
          </pre>
        </div>

        {/* Live Preview Bar while editing */}
        <div className="border-t border-border/50 bg-card/40 p-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-2 select-none">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3 h-3" />
              Live Preview
            </span>
            <span className="text-[10px] opacity-70">
              Updates in real-time as you type
            </span>
          </div>

          {parseError ? (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="break-all">{parseError}</div>
            </div>
          ) : svgContent ? (
            <div
              className="w-full flex justify-center items-center py-2 overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-xs font-mono text-muted-foreground/60 text-center py-4">
              Type valid Mermaid diagram code above…
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. PREVIEW MODE CONTAINER                  */}
      {/* ========================================== */}
      {mode === "preview" && (
        <div
          onDoubleClick={enterEditMode}
          title="Double-click to edit Mermaid code"
          className={`w-full relative overflow-hidden select-none min-h-[140px] flex flex-col justify-center ${getBgClass(
            mermaidBg
          )}`}
        >
          {/* Floating Hover Controls Bar */}
          {svgContent && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover/mermaid:opacity-100 transition-opacity duration-150 flex items-center gap-1 p-1 rounded-lg bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/70 shadow-md text-xs select-none"
            >
              {/* Fullscreen Expand Inspector */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-[11px] font-medium"
                title="Expand Interactive Inspector (Pan & Zoom)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Inspect</span>
              </button>

              <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />

              {/* Download SVG */}
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Download SVG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              {/* Copy Code */}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Copy Mermaid Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Edit Code */}
              <button
                type="button"
                onClick={enterEditMode}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer ml-0.5"
                title="Edit Diagram Code (or Double-Click)"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
          )}

          {svgContent ? (
            <div className="w-full overflow-x-auto p-4 sm:p-6 flex items-center justify-center">
              <div
                className="mermaid-viewport flex justify-center items-center max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto select-none"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          ) : parseError ? (
            <div
              onClick={enterEditMode}
              className="p-6 flex flex-col items-center justify-center gap-2 text-center text-red-500 dark:text-red-400 cursor-pointer"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-xs font-mono font-medium max-w-md break-all">
                {parseError}
              </span>
              <span className="text-[11px] underline opacity-80 mt-1">
                Click here to fix diagram syntax
              </span>
            </div>
          ) : (
            <div
              onClick={enterEditMode}
              className="p-8 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground cursor-pointer hover:bg-muted/10 transition-colors"
            >
              <Workflow className="w-6 h-6 opacity-40" />
              <span className="text-xs font-medium">Empty Mermaid Diagram</span>
              <span className="text-[11px] opacity-70">
                Click to write Mermaid code (e.g. flowchart TD, sequenceDiagram)
              </span>
            </div>
          )}

          {/* Floating Double-Click Hint Bar */}
          {svgContent && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover/mermaid:opacity-100 transition-opacity bg-background/90 dark:bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground border border-border/60 shadow-xs pointer-events-none flex items-center gap-2">
              <span>Click Inspect to zoom</span>
              <span>•</span>
              <span className="text-primary font-medium">Double-click to edit</span>
            </div>
          )}
        </div>
      )}

      {/* Render Fullscreen Modal via Portal */}
      {fullscreenModal}
    </NodeViewWrapper>
  );
}

export default CodeBlockView;
