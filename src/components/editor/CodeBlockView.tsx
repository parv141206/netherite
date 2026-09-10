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
        mermaidTheme === "auto" ? (isDark ? "dark" : "default") : mermaidTheme;

      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: effectiveTheme,
          securityLevel: "loose",
          fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
          themeVariables: {
            darkMode: effectiveTheme === "dark",
            background: effectiveTheme === "dark" ? "#121212" : "#ffffff",
            primaryColor: effectiveTheme === "dark" ? "#2563eb" : "#3b82f6",
            primaryTextColor: effectiveTheme === "dark" ? "#f3f4f6" : "#111827",
            lineColor: effectiveTheme === "dark" ? "#9ca3af" : "#4b5563",
            secondaryColor: effectiveTheme === "dark" ? "#1e293b" : "#f1f5f9",
            tertiaryColor: effectiveTheme === "dark" ? "#0f172a" : "#e2e8f0",
          },
        });
      } catch (err) {
        console.warn("Mermaid init warning:", err);
      }

      const uniqueId = `mermaid-md-${Math.random().toString(36).substring(2, 9)}`;

      try {
        const { svg } = await mermaid.render(uniqueId, rawCode);
        if (!isCancelled) {
          setSvgContent(svg);
          setParseError(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const msg = err?.message || err?.str || String(err);
          setParseError(msg.replace(/^Error:\s*/i, ""));
        }
      } finally {
        // Clean up phantom DOM nodes created by mermaid error handler
        if (typeof document !== "undefined") {
          const phantom = document.getElementById(uniqueId);
          if (phantom) phantom.remove();
          const errorEl = document.getElementById(`d${uniqueId}`);
          if (errorEl) errorEl.remove();
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

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      // If user simply clicked without panning, enter edit mode!
      if (!dragMovedRef.current && mode === "preview" && !isFullscreen) {
        enterEditMode();
      }
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
      className="relative group/mermaid my-5 rounded-xl border border-border/80 bg-card/60 dark:bg-card/30 shadow-xs overflow-hidden transition-all focus-within:ring-1 focus-within:ring-primary/40"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 dark:bg-muted/30 border-b border-border/60 text-xs select-none gap-2">
        {/* Left: Mode Badge & Zoom Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {mode === "preview" ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Workflow className="w-3.5 h-3.5" />
              <span>Mermaid</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Code2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Editing Mermaid</span>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                (Esc to preview)
              </span>
            </div>
          )}

          {/* Dedicated Zoom Controls in Preview Mode */}
          {mode === "preview" && svgContent && (
            <div className="flex items-center gap-0.5 ml-2 p-0.5 bg-background/80 dark:bg-background/60 border border-border/60 rounded-lg text-muted-foreground">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Zoom Out (or Ctrl + Wheel down)"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[10px] font-mono hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Reset Zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Zoom In (or Ctrl + Wheel up)"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 hover:text-foreground hover:bg-muted rounded transition-colors ml-0.5 border-l border-border/40"
                title="Reset Pan & Zoom"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {mode === "preview" ? (
            <>
              {svgContent && (
                <>
                  {/* Style Customizer Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomizeOpen(!isCustomizeOpen);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                        isCustomizeOpen
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                      }`}
                      title="Customize Theme & Canvas"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span className="hidden sm:inline">Style</span>
                    </button>

                    {isCustomizeOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1.5 z-50 w-56 p-2.5 rounded-xl bg-popover/95 backdrop-blur-md border border-border shadow-xl text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                            Mermaid Theme
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { id: "auto", label: "Auto" },
                              { id: "default", label: "Light" },
                              { id: "dark", label: "Dark" },
                              { id: "neutral", label: "Neutral" },
                              { id: "forest", label: "Forest" },
                              { id: "base", label: "Base" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  updateAttributes({ mermaidTheme: t.id });
                                }}
                                className={`px-2 py-1 rounded text-left text-[11px] font-medium transition-colors ${
                                  mermaidTheme === t.id
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "hover:bg-accent text-foreground"
                                }`}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="border-t border-border/50 pt-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                            Canvas Background
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {[
                              { id: "card", label: "Card" },
                              { id: "transparent", label: "Transparent" },
                              { id: "contrast", label: "Contrast" },
                              { id: "warm", label: "Warm" },
                            ].map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  updateAttributes({ mermaidBg: b.id });
                                }}
                                className={`px-2 py-1 rounded text-left text-[11px] font-medium transition-colors ${
                                  mermaidBg === b.id
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "hover:bg-accent text-foreground"
                                }`}
                              >
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                    title="Fullscreen Inspect & Pan"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Expand</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                    title="Download SVG Diagram"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">SVG</span>
                  </button>
                </>
              )}
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
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={enterEditMode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                title="Edit Diagram Code"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                title="Copy Mermaid Code"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                title="Done editing (Switch to Preview)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </>
          )}
        </div>
      </div>

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
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          title="Click diagram to edit • Drag to pan • Ctrl + Wheel to zoom"
          className={`w-full relative overflow-hidden select-none min-h-[160px] max-h-[580px] flex flex-col justify-center ${getBgClass(
            mermaidBg
          )}`}
        >
          {svgContent ? (
            <div
              className={`w-full h-full overflow-auto p-6 flex items-center justify-center ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{
                userSelect: "none",
              }}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.12s ease-out",
                }}
                className="mermaid-viewport flex justify-center items-center min-w-fit [&>svg]:min-w-[fit-content] [&>svg]:h-auto [&>svg]:overflow-visible"
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

          {/* Floating Pan & Zoom Hint Bar */}
          {svgContent && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover/mermaid:opacity-100 transition-opacity bg-background/90 dark:bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground border border-border/60 shadow-xs pointer-events-none flex items-center gap-2">
              <span>Drag to pan</span>
              <span>•</span>
              <span>Ctrl + Wheel to zoom</span>
              <span>•</span>
              <span className="text-primary font-medium">Click to edit</span>
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
