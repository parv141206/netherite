"use client";

import React, { useMemo, useState } from "react";
import {
  X,
  GitCompare,
  History,
  Save,
  CheckCircle2,
  Plus,
  Minus,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronRight,
  Code2,
  Sparkles,
  Edit3,
} from "lucide-react";
import {
  computeLineDiff,
  computeApollonSemanticDiff,
  loadChangelog,
  type ChangelogEntry,
  type DiffLine,
  type SemanticChange,
} from "./diffUtils";

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  noteId: string;
  baselineContent: string;
  currentContent: string;
  onSaveToDrive: () => void;
  isSaving: boolean;
  onDiscardAndSync?: () => void;
  isSyncing?: boolean;
}

type DiffDisplayItem =
  | { type: "line"; line: DiffLine; index: number }
  | { type: "collapsed"; key: string; count: number; lines: DiffLine[] };

export function DiffModal({
  isOpen,
  onClose,
  noteTitle,
  noteId,
  baselineContent,
  currentContent,
  onSaveToDrive,
  isSaving,
  onDiscardAndSync,
  isSyncing = false,
}: DiffModalProps) {
  const [activeView, setActiveView] = useState<"diff" | "history">("diff");
  const [diffDisplayMode, setDiffDisplayMode] = useState<"compact" | "full">("compact");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [isSemanticExpanded, setIsSemanticExpanded] = useState<boolean>(true);

  const diff = useMemo(() => {
    if (!isOpen) {
      return {
        hasChanges: false,
        additions: 0,
        deletions: 0,
        totalChanges: 0,
        summary: "0 changes",
        lines: [],
      };
    }
    return computeLineDiff(baselineContent, currentContent);
  }, [isOpen, baselineContent, currentContent]);

  const semanticChanges = useMemo(() => {
    if (!isOpen) return [];
    return computeApollonSemanticDiff(baselineContent, currentContent);
  }, [isOpen, baselineContent, currentContent]);

  const changelog = useMemo(() => {
    if (!isOpen) return [];
    return loadChangelog(noteId);
  }, [isOpen, noteId]);

  const isUml = useMemo(() => {
    return (
      noteTitle.endsWith(".apollon") ||
      noteTitle.endsWith(".uml") ||
      semanticChanges.length > 0
    );
  }, [noteTitle, semanticChanges.length]);

  const isMermaid = useMemo(() => {
    return noteTitle.endsWith(".mmd") || noteTitle.endsWith(".mermaid");
  }, [noteTitle]);

  // Group unchanged lines for compact view with fold bars
  const displayItems = useMemo<DiffDisplayItem[]>(() => {
    if (!isOpen) return [];
    if (diffDisplayMode === "full") {
      return diff.lines.map((line, index) => ({ type: "line", line, index }));
    }

    const items: DiffDisplayItem[] = [];
    let unchangedRun: DiffLine[] = [];
    let runStartIndex = 0;

    const flushUnchanged = () => {
      if (unchangedRun.length === 0) return;
      const count = unchangedRun.length;
      const blockKey = `${runStartIndex}-${count}`;

      // Only fold if there are more than 6 consecutive unchanged lines
      if (count <= 6 || expandedBlocks.has(blockKey)) {
        for (let i = 0; i < unchangedRun.length; i++) {
          items.push({
            type: "line",
            line: unchangedRun[i]!,
            index: runStartIndex + i,
          });
        }
      } else {
        // Keep 2 leading context lines
        items.push({
          type: "line",
          line: unchangedRun[0]!,
          index: runStartIndex,
        });
        items.push({
          type: "line",
          line: unchangedRun[1]!,
          index: runStartIndex + 1,
        });

        // Middle folded block
        const middleLines = unchangedRun.slice(2, count - 2);
        items.push({
          type: "collapsed",
          key: blockKey,
          count: middleLines.length,
          lines: middleLines,
        });

        // Keep 2 trailing context lines
        items.push({
          type: "line",
          line: unchangedRun[count - 2]!,
          index: runStartIndex + count - 2,
        });
        items.push({
          type: "line",
          line: unchangedRun[count - 1]!,
          index: runStartIndex + count - 1,
        });
      }
      unchangedRun = [];
    };

    for (let idx = 0; idx < diff.lines.length; idx++) {
      const line = diff.lines[idx]!;
      if (line.type === "unchanged") {
        if (unchangedRun.length === 0) runStartIndex = idx;
        unchangedRun.push(line);
      } else {
        flushUnchanged();
        items.push({ type: "line", line, index: idx });
      }
    }
    flushUnchanged();
    return items;
  }, [isOpen, diff.lines, diffDisplayMode, expandedBlocks]);

  const toggleBlockExpand = (key: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header Row 1: Title & Close */}
        <div className="px-6 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent text-foreground shrink-0">
              <GitCompare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground truncate">
                  Changes & Diff: {noteTitle.replace(/\.(md|excalidraw|apollon|uml|mmd|mermaid)$/i, "")}
                </span>
                {isUml && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium border border-sky-500/20 shrink-0">
                    Apollon UML
                  </span>
                )}
                {isMermaid && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
                    Mermaid Diagram
                  </span>
                )}
                {diff.hasChanges ? (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20 shrink-0">
                    {diff.summary}
                  </span>
                ) : (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Up to date
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Local changes vs Google Drive baseline (sovereign sync)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Header Row 2: Sub-toolbar Controls */}
        <div className="px-6 py-2.5 border-b border-border/60 flex items-center justify-between bg-muted/40 shrink-0 flex-wrap gap-2">
          {/* View Switcher Segmented Control */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-1 bg-background/80 border border-border/60 rounded-xl text-xs shadow-2xs">
              <button
                onClick={() => setActiveView("diff")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "diff"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" /> Live Diff
              </button>
              <button
                onClick={() => setActiveView("history")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === "history"
                    ? "bg-card text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="w-3.5 h-3.5" /> Changelog ({changelog.length})
              </button>
            </div>

            {/* Line Diff Filter (Compact / Changes Only vs Full File) */}
            {activeView === "diff" && diff.hasChanges && (
              <div className="flex items-center p-0.5 bg-background/60 border border-border/50 rounded-lg text-[11px]">
                <button
                  onClick={() => setDiffDisplayMode("compact")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    diffDisplayMode === "compact"
                      ? "bg-card text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Show modified lines with context (hides unchanged boilerplate)"
                >
                  Compact
                </button>
                <button
                  onClick={() => setDiffDisplayMode("full")}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    diffDisplayMode === "full"
                      ? "bg-card text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Show entire file including all unchanged lines"
                >
                  Full File
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {diff.hasChanges && onDiscardAndSync && (
              <button
                onClick={() => {
                  onDiscardAndSync();
                }}
                disabled={isSaving || isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer disabled:opacity-50"
                title="Discard your changes and pull latest from Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Discard & Pull</span>
              </button>
            )}

            <button
              onClick={() => {
                onSaveToDrive();
              }}
              disabled={isSaving || !diff.hasChanges}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                diff.hasChanges
                  ? "bg-foreground text-background hover:opacity-90 shadow-sm active:scale-95"
                  : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Saving..." : "Save to Drive"}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-background min-h-[350px]">
          {activeView === "diff" ? (
            <div className="space-y-3">
              {!diff.hasChanges ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-foreground text-sm">No Unsaved Diffs</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Your local diagram edits are identical to the Google Drive baseline.
                  </p>
                </div>
              ) : (
                <>
                  {/* Semantic Diagram Changes Card (When available for UML diagrams) */}
                  {semanticChanges.length > 0 && (
                    <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
                      <button
                        onClick={() => setIsSemanticExpanded(!isSemanticExpanded)}
                        className="w-full px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-medium cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-semibold text-foreground">
                            Diagram Changes Overview ({semanticChanges.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="text-[11px]">
                            {isSemanticExpanded ? "Collapse" : "Expand"}
                          </span>
                          {isSemanticExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>

                      {isSemanticExpanded && (
                        <div className="p-3 divide-y divide-border/30 max-h-48 overflow-y-auto">
                          {semanticChanges.map((change) => {
                            const isAdd = change.action === "added";
                            const isDel = change.action === "removed";

                            return (
                              <div
                                key={change.id}
                                className="py-1.5 first:pt-0 last:pb-0 flex items-start justify-between text-xs gap-3"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                      isAdd
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : isDel
                                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {isAdd ? "+" : isDel ? "-" : "~"}
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-medium text-foreground">
                                      {change.title}
                                    </span>
                                    {change.description && (
                                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                                        {change.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground shrink-0">
                                  {change.category}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw Code / Model Line Diff */}
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/40 bg-card">
                    <div className="px-3.5 py-2 bg-muted/60 text-[11px] text-muted-foreground flex justify-between items-center font-sans">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{noteTitle}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono">
                          <span className="text-emerald-500 font-bold">+{diff.additions}</span>{" "}
                          <span className="text-rose-500 font-bold">-{diff.deletions}</span>
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/20 max-h-[460px] overflow-y-auto font-mono text-xs">
                      {displayItems.map((item, idx) => {
                        if (item.type === "collapsed") {
                          return (
                            <div
                              key={item.key}
                              onClick={() => toggleBlockExpand(item.key)}
                              className="py-1.5 px-4 bg-muted/20 hover:bg-muted/50 text-[11px] font-mono text-muted-foreground/80 flex items-center justify-center gap-2 cursor-pointer transition-colors border-y border-border/30 select-none"
                            >
                              <ChevronDown className="w-3 h-3" />
                              <span>
                                ··· Expand {item.count} unchanged line{item.count > 1 ? "s" : ""} ···
                              </span>
                            </div>
                          );
                        }

                        const line = item.line;
                        const isAdded = line.type === "added";
                        const isRemoved = line.type === "removed";

                        return (
                          <div
                            key={idx}
                            className={`flex items-start text-xs py-0.5 px-2 select-text transition-colors ${
                              isAdded
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium"
                                : isRemoved
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 line-through opacity-80"
                                : "text-muted-foreground hover:bg-muted/20"
                            }`}
                          >
                            <span className="w-10 text-right pr-3 select-none text-[10px] text-muted-foreground/60 shrink-0">
                              {line.lineNumBefore || line.lineNumAfter || ""}
                            </span>
                            <span className="w-5 select-none text-center shrink-0 font-bold">
                              {isAdded ? "+" : isRemoved ? "-" : " "}
                            </span>
                            <span className="whitespace-pre-wrap break-all flex-1">
                              {line.content || " "}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Recent local modifications & save events recorded for this note:
              </div>

              {changelog.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <History className="w-8 h-8 opacity-40 mb-2" />
                  <p className="text-xs">No recorded changelog entries yet for this note.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {changelog.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-lg ${
                            entry.syncedToDrive
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {entry.syncedToDrive ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <GitCompare className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{entry.summary}</span>
                            {entry.syncedToDrive && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-normal">
                                Synced to Google Drive
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.dateStr}
                          </div>
                        </div>
                      </div>

                      <div className="font-mono text-xs">
                        <span className="text-emerald-500 font-bold">+{entry.additions}</span> /{" "}
                        <span className="text-rose-500 font-bold">-{entry.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 border-t border-border bg-muted/40 flex justify-between items-center text-xs text-muted-foreground shrink-0">
          <span>Keyboard Shortcut: Press Ctrl+S to save</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-border hover:bg-accent text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
