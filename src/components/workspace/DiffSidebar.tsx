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
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  computeLineDiff,
  computeApollonSemanticDiff,
  loadChangelog,
  type ChangelogEntry,
  type DiffLine,
  type SemanticChange,
} from "./diffUtils";

interface DiffSidebarProps {
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

export function DiffSidebar({
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
}: DiffSidebarProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "semantic" | "history">("diff");
  const [diffDisplayMode, setDiffDisplayMode] = useState<"compact" | "full">("compact");
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

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

  // Group unchanged lines for compact view with fold bars
  const displayItems = useMemo<DiffDisplayItem[]>(() => {
    if (diffDisplayMode === "full" || diff.lines.length <= 12) {
      return diff.lines.map((line, idx) => ({ type: "line", line, index: idx }));
    }

    const items: DiffDisplayItem[] = [];
    let unchangedBuffer: DiffLine[] = [];
    let blockIndex = 0;

    const flushBuffer = () => {
      if (unchangedBuffer.length === 0) return;
      if (unchangedBuffer.length <= 4) {
        unchangedBuffer.forEach((line) => {
          items.push({ type: "line", line, index: items.length });
        });
      } else {
        const key = `block-${blockIndex++}`;
        if (expandedBlocks.has(key)) {
          unchangedBuffer.forEach((line) => {
            items.push({ type: "line", line, index: items.length });
          });
        } else {
          // Keep 2 lines context before and after
          items.push({ type: "line", line: unchangedBuffer[0]!, index: items.length });
          items.push({ type: "line", line: unchangedBuffer[1]!, index: items.length });

          const collapsedLines = unchangedBuffer.slice(2, unchangedBuffer.length - 2);
          if (collapsedLines.length > 0) {
            items.push({
              type: "collapsed",
              key,
              count: collapsedLines.length,
              lines: collapsedLines,
            });
          }

          items.push({
            type: "line",
            line: unchangedBuffer[unchangedBuffer.length - 2]!,
            index: items.length,
          });
          items.push({
            type: "line",
            line: unchangedBuffer[unchangedBuffer.length - 1]!,
            index: items.length,
          });
        }
      }
      unchangedBuffer = [];
    };

    for (const line of diff.lines) {
      if (line.type === "unchanged") {
        unchangedBuffer.push(line);
      } else {
        flushBuffer();
        items.push({ type: "line", line, index: items.length });
      }
    }
    flushBuffer();

    return items;
  }, [diff.lines, diffDisplayMode, expandedBlocks]);

  const toggleBlock = (key: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCopyRawDiff = () => {
    const text = diff.lines
      .map((l) => `${l.type === "added" ? "+" : l.type === "removed" ? "-" : " "} ${l.content}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <aside
      className="w-80 sm:w-96 border-l border-border/80 bg-card flex flex-col h-full shrink-0 shadow-xl z-30 transition-all select-none overflow-hidden"
      aria-label="Git Diff Inspector"
    >
      {/* Header Bar */}
      <div className="p-3 border-b border-border/80 flex items-center justify-between gap-2 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shrink-0">
            <GitCompare className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">Diff Inspector</span>
            <span className="text-[10px] text-muted-foreground truncate font-mono">{noteTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyRawDiff}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Copy Unified Diff"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close Diff Inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status & Stats Pill Banner */}
      <div className="px-3 py-2 border-b border-border/40 bg-muted/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {diff.hasChanges ? (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                +{diff.additions}
              </span>
              <span className="text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                -{diff.deletions}
              </span>
              <span className="text-muted-foreground text-[10px]">
                ({diff.totalChanges} {diff.totalChanges === 1 ? "change" : "changes"})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-500 font-medium text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>In sync with Google Drive</span>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <button
          onClick={() => setDiffDisplayMode((m) => (m === "compact" ? "full" : "compact"))}
          className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/40 cursor-pointer"
          title="Toggle collapsed unchanged lines"
        >
          {diffDisplayMode === "compact" ? "Folded" : "Full"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/60 bg-muted/30 p-1 gap-1 text-xs">
        <button
          onClick={() => setActiveTab("diff")}
          className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "diff"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Code2 className="w-3 h-3" />
          <span>Unified Diff</span>
        </button>

        {isUml && (
          <button
            onClick={() => setActiveTab("semantic")}
            className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "semantic"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>UML Model</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === "history"
              ? "bg-background text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-3 h-3" />
          <span>History ({changelog.length})</span>
        </button>
      </div>

      {/* Diff Body Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 text-xs font-mono">
        {activeTab === "diff" && (
          <div className="space-y-0.5">
            {!diff.hasChanges ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/70" />
                <p className="text-xs font-sans">No local modifications.</p>
                <p className="text-[11px] font-sans text-muted-foreground/70">
                  Your local workspace draft matches the saved file in Google Drive.
                </p>
              </div>
            ) : (
              displayItems.map((item, i) => {
                if (item.type === "collapsed") {
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleBlock(item.key)}
                      className="w-full my-1 py-1 px-2.5 rounded bg-muted/40 hover:bg-muted text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 border border-dashed border-border/60 transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span>{item.count} unchanged lines folded</span>
                    </button>
                  );
                }

                const { line } = item;
                const isAdd = line.type === "added";
                const isDel = line.type === "removed";

                return (
                  <div
                    key={`line-${i}`}
                    className={`flex items-start rounded px-1.5 py-0.5 text-[11px] leading-tight font-mono whitespace-pre-wrap break-all ${
                      isAdd
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-l-2 border-emerald-500"
                        : isDel
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-l-2 border-rose-500"
                        : "text-muted-foreground/80 hover:bg-muted/20"
                    }`}
                  >
                    <span className="w-5 shrink-0 text-[10px] text-muted-foreground/50 select-none text-right mr-1.5 font-mono">
                      {line.lineNumAfter || line.lineNumBefore || " "}
                    </span>
                    <span className="w-3 shrink-0 select-none font-bold">
                      {isAdd ? "+" : isDel ? "-" : " "}
                    </span>
                    <span className="flex-1 min-w-0">{line.content || " "}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "semantic" && (
          <div className="space-y-2 p-1 font-sans">
            {semanticChanges.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No structural UML modifications detected.
              </p>
            ) : (
              semanticChanges.map((change, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-xs"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>{change.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                      {change.category}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">{change.description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-2 p-1 font-sans">
            {changelog.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No session edit history recorded for this file yet.
              </p>
            ) : (
              changelog.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">{entry.dateStr}</span>
                    <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Synced to Drive
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-emerald-500 font-bold">+{entry.additions}</span>
                    <span className="text-rose-500 font-bold">-{entry.deletions}</span>
                    <span className="text-muted-foreground truncate">{entry.summary}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="p-3 border-t border-border/80 bg-muted/30 flex flex-col gap-2 font-sans select-none">
        <button
          onClick={onSaveToDrive}
          disabled={isSaving || !diff.hasChanges}
          className="w-full py-2 px-3 rounded-xl bg-foreground text-background font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all shadow-sm cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving to Google Drive...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes to Drive (Ctrl+S)</span>
            </>
          )}
        </button>

        {diff.hasChanges && onDiscardAndSync && (
          <button
            onClick={onDiscardAndSync}
            disabled={isSyncing}
            className="w-full py-1.5 px-3 rounded-lg border border-rose-500/40 text-rose-500 hover:bg-rose-500/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Discard Local Draft & Revert</span>
          </button>
        )}
      </div>
    </aside>
  );
}
