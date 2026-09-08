"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
          fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
          themeVariables: {
            darkMode: isDark,
            background: isDark ? "#121212" : "#ffffff",
            primaryColor: isDark ? "#2563eb" : "#3b82f6",
            primaryTextColor: isDark ? "#f3f4f6" : "#111827",
            lineColor: isDark ? "#9ca3af" : "#4b5563",
            secondaryColor: isDark ? "#1e293b" : "#f1f5f9",
            tertiaryColor: isDark ? "#0f172a" : "#e2e8f0",
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
  }, [isMermaid, rawCode, isDark]);

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
    link.download = `diagram-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgContent]);

  // Intercept Esc & Ctrl+Enter in edit mode
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isMermaid) return;
      if (e.key === "Escape" || ((e.ctrlKey || e.metaKey) && e.key === "Enter")) {
        e.preventDefault();
        setMode("preview");
      }
    },
    [isMermaid]
  );

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

  // ==========================================
  // CASE 2: Mermaid Diagram Block
  // ==========================================
  return (
    <NodeViewWrapper
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className="relative group/mermaid my-5 rounded-xl border border-border/80 bg-card/60 dark:bg-card/30 shadow-xs overflow-hidden transition-all focus-within:ring-1 focus-within:ring-primary/40"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/50 dark:bg-muted/30 border-b border-border/60 text-xs select-none">
        {/* Left: Mode Badge */}
        <div className="flex items-center gap-2">
          {mode === "preview" ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Workflow className="w-3.5 h-3.5" />
              <span>Mermaid Diagram</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <Code2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Editing Mermaid</span>
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
                (Press Esc or Ctrl+Enter to preview)
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {mode === "preview" ? (
            <>
              {svgContent && (
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors"
                  title="Download SVG Diagram"
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">SVG</span>
                </button>
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
          onClick={enterEditMode}
          title="Click diagram to edit Mermaid code"
          className="w-full p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/15 transition-all overflow-x-auto min-h-[120px] select-none rounded-b-xl group/preview"
        >
          {svgContent ? (
            <div className="relative w-full flex justify-center">
              <div
                className="mermaid-svg-display max-w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto transition-transform group-hover/preview:scale-[1.008]"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              {/* Subtle hover prompt */}
              <div className="absolute bottom-0 right-0 opacity-0 group-hover/preview:opacity-100 transition-opacity bg-background/90 dark:bg-background/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground border border-border/50 shadow-xs pointer-events-none">
                Click to edit
              </div>
            </div>
          ) : parseError ? (
            <div className="p-4 flex flex-col items-center justify-center gap-2 text-center text-red-500 dark:text-red-400">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-xs font-mono font-medium max-w-md break-all">
                {parseError}
              </span>
              <span className="text-[11px] underline opacity-80 mt-1">
                Click here to fix diagram syntax
              </span>
            </div>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Workflow className="w-6 h-6 opacity-40" />
              <span className="text-xs font-medium">Empty Mermaid Diagram</span>
              <span className="text-[11px] opacity-70">
                Click to write Mermaid code (e.g. flowchart TD, sequenceDiagram)
              </span>
            </div>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export default CodeBlockView;
