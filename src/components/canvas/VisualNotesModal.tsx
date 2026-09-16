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
  const [copied, setCopied] = useState(false);

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
      const scene = markdownToExcalidraw(markdown, { theme, roughness });
      navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
      setCopied(true);
      toast.success("Excalidraw JSON copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err: any) {
      toast.error("Failed to serialize Excalidraw JSON");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                Visual Notes Engine
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-medium">
                  Markdown → Excalidraw
                </span>
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Automatic radial cluster layout, dashed flow boxes, branching notes &amp; collision-free ASCII diagrams
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metrics Bar */}
        <div className="flex items-center gap-3 px-6 py-2.5 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800 text-xs">
          <span className="text-neutral-500 font-medium">Detected Structure:</span>
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-semibold">
            {docStats.topics} Topic{docStats.topics === 1 ? "" : "s"}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
            {docStats.subtopics} Subtopics &amp; Flows
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-semibold">
            {docStats.notes} Notes
          </span>
          {docStats.diagrams > 0 && (
            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold">
              {docStats.diagrams} ASCII / Code Diagram
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-neutral-400">Presets:</span>
            <button
              type="button"
              onClick={() => setMarkdown(CN_STUDY_TEMPLATE)}
              className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
              title="Load full Computer Networks notes (IPv4, TCP, UDP)"
            >
              CN Study Guide
            </button>
            <button
              type="button"
              onClick={() => setMarkdown(REFERENCE_SKETCH_TEMPLATE)}
              className="px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
              title="Load original reference sketch template"
            >
              Reference Layout
            </button>
          </div>
        </div>

        {/* Body Editor */}
        <div className="flex-1 min-h-[360px] p-6 flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Markdown Notes Source</span>
            <span className="text-neutral-400">
              Supports <code># Topic [color: green]</code>, <code>## Subtopic</code>, <code>### [flow] Step</code>, bullets &amp; <code>```ascii</code>
            </span>
          </div>

          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-xs leading-relaxed rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            placeholder="Paste or write hierarchical markdown notes here..."
          />

          {/* Options Strip */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Theme:</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Style:</span>
                <select
                  value={roughness}
                  onChange={(e) => setRoughness(Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium"
                >
                  <option value={1}>Sketchy (Hand-drawn)</option>
                  <option value={0}>Crisp (Architectural)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied JSON!" : "Copy Excalidraw JSON"}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <HelpCircle className="w-4 h-4" />
            <span>Arrows, coordinates, and spacing are handled with automatic zero-overlap math.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleApplyToCanvas(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors"
            >
              Append to Canvas
            </button>
            <button
              type="button"
              onClick={() => handleApplyToCanvas(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Generate on Canvas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
