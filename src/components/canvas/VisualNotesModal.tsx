"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Sparkles,
  Layers,
  FileCode,
  Check,
  RotateCcw,
  Copy,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import {
  markdownToExcalidraw,
  markdownToExcalidrawElements,
  parseMarkdownNotes,
  CN_STUDY_TEMPLATE,
  REFERENCE_SKETCH_TEMPLATE,
  VISUAL_NOTES_CONVERSION_PROMPT,
} from "~/features/visual-notes";

interface VisualNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  api: ExcalidrawImperativeAPI | null;
  currentTheme?: "light" | "dark";
}

export function VisualNotesModal({
  isOpen,
  onClose,
  api,
  currentTheme = "light",
}: VisualNotesModalProps) {
  const [markdown, setMarkdown] = useState<string>(CN_STUDY_TEMPLATE);
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme);
  const [roughness, setRoughness] = useState<number>(1);
  const [columns, setColumns] = useState<number>(0);
  const [layoutMode, setLayoutMode] = useState<"grid" | "radial" | "vertical">("grid");
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(VISUAL_NOTES_CONVERSION_PROMPT);
    setPromptCopied(true);
    toast.success("AI Conversion Prompt copied to clipboard!");
    setTimeout(() => setPromptCopied(false), 2500);
  };

  // Live parsed document statistics
  const docStats = useMemo(() => {
    try {
      const parsed = parseMarkdownNotes(markdown);
      let subtopicCount = 0;
      let noteCount = 0;
      let diagramCount = 0;

      for (const t of parsed.topics) {
        noteCount += t.centerNotes.length;
        for (const s of t.subtopics) {
          subtopicCount++;
          noteCount += s.notes.length;
          diagramCount += s.diagrams.length;
          for (const c of s.children) {
            subtopicCount++;
            noteCount += c.notes.length;
            diagramCount += c.diagrams.length;
          }
        }
      }

      return {
        topics: parsed.topics.length,
        subtopics: subtopicCount,
        notes: noteCount,
        diagrams: diagramCount,
        valid: true,
      };
    } catch {
      return {
        topics: 0,
        subtopics: 0,
        notes: 0,
        diagrams: 0,
        valid: false,
      };
    }
  }, [markdown]);

  if (!isOpen) return null;

  const handleApplyToCanvas = (replace: boolean) => {
    if (!api || api.isDestroyed) {
      toast.error("Excalidraw canvas is not ready");
      return;
    }

    try {
      const elements = markdownToExcalidrawElements(markdown, {
        theme,
        roughness,
        columns,
        layoutMode,
      });

      if (elements.length === 0) {
        toast.warn("No visual elements could be generated from markdown");
        return;
      }

      if (replace) {
        api.updateScene({
          elements,
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        toast.success(`Generated ${elements.length} visual note elements!`);
      } else {
        const existing = api.getSceneElements();
        api.updateScene({
          elements: [...existing, ...elements],
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });
        toast.success(`Added ${elements.length} visual note elements to canvas!`);
      }

      requestAnimationFrame(() => {
        if (!api.isDestroyed) {
          api.refresh();
        }
      });

      onClose();
    } catch (err: any) {
      console.error("Failed to generate visual notes:", err);
      toast.error(`Generation failed: ${err.message || err}`);
    }
  };

  const handleCopyJson = () => {
    try {
      const scene = markdownToExcalidraw(markdown, {
        theme,
        roughness,
        columns,
        layoutMode,
      });
      navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
      setCopied(true);
      toast.success("Excalidraw JSON copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      toast.error("Failed to serialize Excalidraw JSON");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/70 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-muted text-foreground/80 border border-border/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">
                Visual Notes Engine
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Convert markdown structure into whiteboard elements
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Monochromatic Structure Bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-muted/30 border-b border-border/50 text-xs font-mono select-none">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <span className="text-foreground font-medium">{docStats.topics} {docStats.topics === 1 ? "topic" : "topics"}</span>
            <span>·</span>
            <span>{docStats.subtopics} subtopics</span>
            <span>·</span>
            <span>{docStats.notes} notes</span>
            {docStats.diagrams > 0 && (
              <>
                <span>·</span>
                <span>{docStats.diagrams} diagrams</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 font-sans">
            <button
              type="button"
              onClick={() => setShowPrompt(!showPrompt)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                showPrompt
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="View AI conversion prompt"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI Prompt</span>
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={() => setMarkdown(CN_STUDY_TEMPLATE)}
              className="px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Load Computer Networks notes template"
            >
              Study Guide
            </button>
            <button
              type="button"
              onClick={() => setMarkdown(REFERENCE_SKETCH_TEMPLATE)}
              className="px-2 py-0.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Load reference sketch layout template"
            >
              Reference
            </button>
          </div>
        </div>

        {/* Collapsible AI Prompt Drawer */}
        {showPrompt && (
          <div className="mx-5 mt-3 p-3.5 rounded-xl border border-border/70 bg-muted/20 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                AI Conversion Prompt
              </span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground text-background text-[11px] font-medium transition-all hover:opacity-90 cursor-pointer"
              >
                {promptCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{promptCopied ? "Copied" : "Copy Prompt"}</span>
              </button>
            </div>
            <pre className="max-h-28 overflow-y-auto p-2.5 text-[11px] font-mono leading-relaxed rounded-lg bg-background border border-border text-foreground/90 select-all whitespace-pre-wrap">
              {VISUAL_NOTES_CONVERSION_PROMPT}
            </pre>
          </div>
        )}

        {/* Body Editor */}
        <div className="flex-1 min-h-[300px] p-5 flex flex-col gap-2.5 overflow-hidden">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Markdown Notes Source</span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              # Topic · ## Subtopic · ### [flow] · #### Concept · ```ascii
            </span>
          </div>

          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="flex-1 w-full p-3.5 font-mono text-xs leading-relaxed rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Write or paste hierarchical markdown notes here..."
          />

          {/* Options Strip */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Theme:</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Style:</span>
                <select
                  value={roughness}
                  onChange={(e) => setRoughness(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none"
                >
                  <option value={1}>Sketchy</option>
                  <option value={0}>Architectural</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground text-[11px]">Layout:</span>
                <select
                  value={layoutMode}
                  onChange={(e) => setLayoutMode(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none"
                >
                  <option value="grid">2D Whiteboard</option>
                  <option value="radial">Radial Mindmap</option>
                  <option value="vertical">Column</option>
                </select>
              </div>

              {layoutMode === "grid" && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px]">Columns:</span>
                  <select
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    className="px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none"
                  >
                    <option value={0}>Auto</option>
                    <option value={1}>1 Col</option>
                    <option value={2}>2 Cols</option>
                    <option value={3}>3 Cols</option>
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy JSON"}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/70 bg-muted/20">
          <span className="text-[11px] text-muted-foreground/70">
            Auto-spaced layout engine
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleApplyToCanvas(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer"
            >
              Append to Canvas
            </button>
            <button
              type="button"
              onClick={() => handleApplyToCanvas(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <span>Generate on Canvas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
