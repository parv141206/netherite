"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
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
  Activity,
  Terminal,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "~/components/ThemeProvider";
import { mermaidToAscii } from "~/lib/mermaidToAscii";
import { renderMermaidQueued, postProcessSvg } from "./mermaidQueue";
import { renderTikzQueued } from "./tikzQueue";

/* ─── Component ─── */

export function CodeBlockView({
  node,
  updateAttributes,
  editor,
  getPos,
}: NodeViewProps) {
  const language = (node.attrs.language || "").toLowerCase().trim();
  const isMermaid = language === "mermaid";
  const isTikz = language === "tikz" || language === "latex-tikz" || language === "pgf";
  const isDiagram = isMermaid || isTikz;
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
  const [mode, setMode] = useState<"preview" | "edit">(() => {
    return rawCode.trim() === "" ? "edit" : "preview";
  });

  const [svgContent, setSvgContent] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedAscii, setCopiedAscii] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Diagram Customization State
  const mermaidTheme = node.attrs.mermaidTheme || "auto";
  const mermaidBg = node.attrs.mermaidBg || "card";

  // Height Resizing & Persistence State
  const parseHeight = useCallback((code: string): number | null => {
    const match = code.match(/%%\s*height:\s*(\d+)px?\s*%%/i);
    if (match) return parseInt(match[1], 10);
    if (typeof node.attrs.mermaidHeight === "number" && node.attrs.mermaidHeight > 0) {
      return node.attrs.mermaidHeight;
    }
    return null;
  }, [node.attrs.mermaidHeight]);

  const [customHeight, setCustomHeight] = useState<number | null>(() => parseHeight(rawCode));
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const resizeStartYRef = useRef<number>(0);
  const resizeStartHeightRef = useRef<number>(0);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const h = parseHeight(rawCode);
    if (h !== null && h !== customHeight) {
      setCustomHeight(h);
    }
  }, [rawCode, parseHeight]);

  const saveHeight = useCallback(
    (newHeight: number | null) => {
      updateAttributes({ mermaidHeight: newHeight });

      let newCode = rawCode;
      const heightRegex = /%%\s*height:\s*\d+px?\s*%%\n?/i;
      if (newHeight) {
        const heightComment = `%% height: ${Math.round(newHeight)}px %%\n`;
        if (heightRegex.test(newCode)) {
          newCode = newCode.replace(heightRegex, heightComment);
        } else {
          newCode = heightComment + newCode;
        }
      } else {
        newCode = newCode.replace(heightRegex, "");
      }

      if (newCode !== rawCode && typeof getPos === "function") {
        const pos = getPos();
        if (typeof pos === "number" && editor && !editor.isDestroyed) {
          try {
            editor.commands?.focus(pos + 1);
          } catch {}
        }
      }
    },
    [editor, getPos, rawCode, updateAttributes]
  );

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartYRef.current = e.clientY;

      const currentH =
        previewBoxRef.current?.getBoundingClientRect().height ||
        customHeight ||
        280;
      resizeStartHeightRef.current = currentH;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - resizeStartYRef.current;
        const newH = Math.max(120, Math.min(1200, Math.round(resizeStartHeightRef.current + deltaY)));
        setCustomHeight(newH);
      };

      const onMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        setIsResizing(false);

        const deltaY = upEvent.clientY - resizeStartYRef.current;
        const finalH = Math.max(120, Math.min(1200, Math.round(resizeStartHeightRef.current + deltaY)));
        setCustomHeight(finalH);
        saveHeight(finalH);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [customHeight, saveHeight]
  );

  // Zoom and Pan State
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);

  const enterEditMode = useCallback(() => {
    setMode("edit");
    setTimeout(() => {
      if (typeof getPos === "function" && editor && !editor.isDestroyed) {
        const pos = getPos();
        if (typeof pos === "number") {
          try {
            editor.commands?.focus(pos + 1);
          } catch {}
        }
      }
    }, 40);
  }, [editor, getPos]);

  // Click outside listener to exit edit mode
  useEffect(() => {
    if (!isDiagram || mode !== "edit") return;
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
  }, [isDiagram, mode]);

  // ────────────────────────────────────
  // Diagram Rendering Effect (Mermaid + TikZ)
  // ────────────────────────────────────
  useEffect(() => {
    if (!isDiagram) return;

    if (!rawCode || rawCode.trim() === "") {
      setSvgContent("");
      setParseError(null);
      return;
    }

    let isCancelled = false;
    const renderTimer = setTimeout(async () => {
      try {
        if (isTikz) {
          const { svg } = await renderTikzQueued(rawCode, isDark);
          if (!isCancelled) {
            setSvgContent(svg);
            setParseError(null);
          }
        } else if (isMermaid) {
          const uniqueId = `mermaid-md-${Math.random().toString(36).substring(2, 9)}`;
          const { svg: rawSvg } = await renderMermaidQueued(uniqueId, rawCode, isDark);
          if (!isCancelled) {
            const processedSvg = postProcessSvg(rawSvg, isDark);
            setSvgContent(processedSvg);
            setParseError(null);
          }
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
  }, [isDiagram, isMermaid, isTikz, rawCode, isDark, mermaidTheme]);

  // ────────────────────────────────────
  // Actions
  // ────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(rawCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [rawCode]);

  const handleCopyAscii = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const ascii = mermaidToAscii(rawCode);
      navigator.clipboard.writeText(ascii).then(() => {
        setCopiedAscii(true);
        toast.success("Mermaid diagram copied as ASCII art!");
        setTimeout(() => setCopiedAscii(false), 2000);
      });
    }
  }, [rawCode]);

  const handleDownloadSvg = useCallback(() => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${isTikz ? "tikz" : "mermaid"}-diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgContent, isTikz]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isFullscreen && e.key === "Escape") {
        e.preventDefault();
        setIsFullscreen(false);
        return;
      }
      if (!isDiagram) return;
      if (
        e.key === "Escape" ||
        ((e.ctrlKey || e.metaKey) && e.key === "Enter")
      ) {
        e.preventDefault();
        setMode("preview");
      }
    },
    [isFullscreen, isDiagram]
  );

  // ────────────────────────────────────
  // Zoom & Pan (for fullscreen inspector)
  // ────────────────────────────────────
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.min(5, parseFloat((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom((z) => Math.max(0.2, parseFloat((z - 0.25).toFixed(2))));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Non-passive wheel for Ctrl+Scroll zoom in both inline and fullscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isDiagram) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const factor = 1 - e.deltaY * 0.005;
        setZoom((z) =>
          Math.min(4, Math.max(0.25, parseFloat((z * factor).toFixed(2))))
        );
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isDiagram]);

  useEffect(() => {
    const el = fullscreenContainerRef.current;
    if (!el || !isFullscreen) return;

    const onWheel = (e: WheelEvent) => {
      // In fullscreen, all scroll zooms (not just Ctrl)
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      setZoom((z) =>
        Math.min(5, Math.max(0.2, parseFloat((z + delta).toFixed(2))))
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [isFullscreen]);

  // Touch pinch-to-zoom for mobile
  const lastTouchDistRef = useRef<number>(0);
  useEffect(() => {
    const el = isFullscreen
      ? fullscreenContainerRef.current
      : containerRef.current;
    if (!el || !isMermaid) return;

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
            Math.min(5, Math.max(0.2, parseFloat((z * scale).toFixed(2))))
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
  }, [isMermaid, isFullscreen]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Reset zoom/pan when entering fullscreen
  useEffect(() => {
    if (isFullscreen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isFullscreen]);

  const getBgClass = (bg: string) => {
    switch (bg) {
      case "transparent":
        return "bg-transparent";
      case "contrast":
        return isDark
          ? "bg-zinc-900 border-t border-b border-border/80"
          : "bg-zinc-100 border-t border-b border-border/80";
      case "warm":
        return isDark
          ? "bg-amber-950/20"
          : "bg-amber-50/60";
      case "card":
      default:
        return "bg-background/50";
    }
  };

  // ==========================================
  // CASE 1: Standard Code Block (non-diagram)
  // ==========================================
  if (!isDiagram) {
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

  // ==========================================
  // Fullscreen Inspector Portal
  // ==========================================
  const fullscreenModal =
    isFullscreen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] bg-background/95 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-150"
            onKeyDown={handleKeyDown}
          >
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm select-none">
              <div className="flex items-center gap-2">
                {isTikz ? (
                  <Activity className="w-4 h-4 text-primary" />
                ) : (
                  <Workflow className="w-4 h-4 text-emerald-500" />
                )}
                <span className="font-semibold text-sm text-foreground">
                  {isTikz ? "TikZ LaTeX Inspector" : "Diagram Inspector"}
                </span>
                <span className="text-xs font-mono text-muted-foreground ml-2 bg-muted/60 px-2 py-0.5 rounded-md">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/50">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
                    title="Zoom Out (−)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2.5 py-1 text-xs font-mono hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
                    title="Reset to 100%"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 hover:text-foreground hover:bg-background rounded transition-colors text-muted-foreground"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  title="Download SVG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                {isMermaid && (
                  <button
                    type="button"
                    onClick={handleCopyAscii}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    title="Copy as ASCII Diagram"
                  >
                    {copiedAscii ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5" />
                    )}
                    <span>Copy ASCII</span>
                  </button>
                )}

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
              onMouseLeave={handleMouseUp}
              className={`flex-1 w-full h-full overflow-hidden flex items-center justify-center select-none ${getBgClass(
                mermaidBg
              )} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.15s ease-out",
                  willChange: "transform",
                }}
                className="flex items-center justify-center p-8"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>

            {/* Fullscreen Footer Hint */}
            <div className="px-4 py-2 border-t border-border/40 bg-card/40 text-center text-xs font-mono text-muted-foreground select-none">
              Scroll to zoom • Click &amp; drag to pan • Press Esc to close
            </div>
          </div>,
          document.body
        )
      : null;

  // ==========================================
  // CASE 2: Diagram Block (Mermaid or TikZ)
  // ==========================================
  const diagramTitle = isTikz ? "TikZ LaTeX" : "Mermaid";

  return (
    <NodeViewWrapper
      ref={containerRef}
      onKeyDown={handleKeyDown}
      data-mermaid-container="true"
      className="relative group/mermaid my-3 rounded-lg border border-border/40 hover:border-border/70 transition-all bg-card/20"
    >
      {/* Edit Mode Header Bar (Only shown when editing) */}
      {mode === "edit" && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/60 text-xs select-none gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Code2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Editing {diagramTitle}</span>
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
              title={`Copy ${diagramTitle} Code`}
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

      {/* ==========================================
           1. CODE AREA (NodeViewContent)
           In preview mode: invisible but in DOM
           In edit mode: fully visible code editor
         ========================================== */}
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
            <NodeViewContent
              as="div"
              className="outline-none block w-full min-h-[4rem]"
            />
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
              className="w-full flex justify-center items-center py-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="text-xs font-mono text-muted-foreground/60 text-center py-4">
              Type valid {diagramTitle} diagram code above…
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
           2. PREVIEW MODE CONTAINER
         ========================================== */}
      {mode === "preview" && (
        <div
          onDoubleClick={enterEditMode}
          title={`Double-click to edit ${diagramTitle} code`}
          className={`w-full relative select-none min-h-[100px] flex flex-col justify-center ${getBgClass(
            mermaidBg
          )}`}
        >
          {/* Floating Hover Controls Bar */}
          {svgContent && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 right-2 z-20 opacity-0 group-hover/mermaid:opacity-100 transition-opacity duration-150 flex items-center gap-1 p-1 rounded-lg bg-background/90 dark:bg-card/90 backdrop-blur-md border border-border/70 shadow-md text-xs select-none"
            >
              {/* Reset Zoom indicator/button if zoomed */}
              {zoom !== 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono bg-muted text-emerald-600 dark:text-emerald-400 hover:bg-accent transition-colors cursor-pointer font-medium"
                  title="Reset Zoom to 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{Math.round(zoom * 100)}%</span>
                </button>
              )}

              {/* Reset Height button if custom height is active */}
              {customHeight && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomHeight(null);
                    saveHeight(null);
                  }}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  title="Reset height to auto"
                >
                  <span>Auto H</span>
                </button>
              )}

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
                title={`Copy ${diagramTitle} Code`}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Copy as ASCII Art */}
              {isMermaid && (
                <button
                  type="button"
                  onClick={handleCopyAscii}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Copy as ASCII Diagram"
                >
                  {copiedAscii ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Terminal className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

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
            <div
              ref={previewBoxRef}
              className="w-full overflow-x-auto p-4 sm:p-6 flex items-center justify-center relative group/box"
              style={{
                height: customHeight ? `${customHeight}px` : "auto",
                minHeight: "120px",
                maxHeight: "1200px",
              }}
            >
              <div
                className="mermaid-viewport flex justify-center items-center select-none"
                style={{
                  maxWidth: "100%",
                  maxHeight: customHeight ? "100%" : "none",
                  overflow: "visible",
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isResizing ? "none" : "transform 0.05s ease-out",
                  willChange: "transform",
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />

              {/* Bottom Drag Handle Bar */}
              <div
                onMouseDown={startResize}
                className="absolute bottom-0 left-10 right-10 h-3 cursor-ns-resize flex items-center justify-center z-10 group/handle opacity-0 group-hover/mermaid:opacity-100 transition-opacity select-none"
                title="Drag to resize height (Double-click to reset)"
                onDoubleClick={() => {
                  setCustomHeight(null);
                  saveHeight(null);
                }}
              >
                <div className="w-12 h-1 rounded-full bg-border/80 group-hover/handle:bg-primary transition-colors" />
              </div>

              {/* Bottom-Right Corner Handle */}
              <div
                onMouseDown={startResize}
                className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize flex items-center justify-center text-muted-foreground/40 hover:text-primary opacity-0 group-hover/mermaid:opacity-100 transition-all z-20 select-none"
                title="Drag corner to resize height"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
                  <circle cx="8" cy="8" r="1.3" />
                  <circle cx="8" cy="4" r="1.3" />
                  <circle cx="4" cy="8" r="1.3" />
                </svg>
              </div>

              {/* Bottom-Left Corner Handle */}
              <div
                onMouseDown={startResize}
                className="absolute bottom-1 left-1 w-5 h-5 cursor-sw-resize flex items-center justify-center text-muted-foreground/40 hover:text-primary opacity-0 group-hover/mermaid:opacity-100 transition-all z-20 select-none"
                title="Drag corner to resize height"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="fill-current">
                  <circle cx="2" cy="8" r="1.3" />
                  <circle cx="2" cy="4" r="1.3" />
                  <circle cx="6" cy="8" r="1.3" />
                </svg>
              </div>

              {/* Height Indicator Tooltip when Resizing */}
              {isResizing && customHeight && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-foreground text-background text-[11px] font-mono font-medium shadow-md z-30 pointer-events-none animate-in fade-in select-none">
                  Height: {Math.round(customHeight)}px
                </div>
              )}
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
              {isTikz ? (
                <Activity className="w-6 h-6 opacity-40" />
              ) : (
                <Workflow className="w-6 h-6 opacity-40" />
              )}
              <span className="text-xs font-medium">
                Empty {diagramTitle} Diagram
              </span>
              <span className="text-[11px] opacity-70">
                {isTikz
                  ? "Click to write TikZ LaTeX code (e.g. \\begin{tikzpicture}...\\end{tikzpicture})"
                  : "Click to write Mermaid code (e.g. flowchart TD, sequenceDiagram)"}
              </span>
            </div>
          )}

          {/* Floating Double-Click Hint Bar */}
          {svgContent && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover/mermaid:opacity-100 transition-opacity bg-background/90 dark:bg-background/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-muted-foreground border border-border/60 shadow-xs pointer-events-none flex items-center gap-2">
              <span>Click Inspect to zoom</span>
              <span>•</span>
              <span className="text-primary font-medium">
                Double-click to edit
              </span>
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
