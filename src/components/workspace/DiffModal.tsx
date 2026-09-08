"use client";

import React, { useState } from "react";
import {
  X,
  GitCompare,
  History,
  Save,
  CheckCircle2,
  FileText,
  Plus,
  Minus,
  RefreshCw,
} from "lucide-react";
import {
  computeLineDiff,
  loadChangelog,
  type ChangelogEntry,
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

  if (!isOpen) return null;

  const diff = computeLineDiff(baselineContent, currentContent);
  const changelog = loadChangelog(noteId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header Row 1: Title & Close */}
        <div className="px-6 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-accent text-foreground shrink-0">
              <GitCompare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground truncate">
                  Changes & Diff: {noteTitle.replace(/\.(md|excalidraw|apollon|uml)$/i, "")}
                </span>
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
                In-browser changelog diff against latest Google Drive version
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
            <div className="space-y-2 font-mono text-xs">
              {!diff.hasChanges ? (
                <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-foreground text-sm">No Unsaved Diffs</p>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Your local edits are in sync with Google Drive. Edit the note to track new diffs.
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden divide-y divide-border/40 bg-card">
                  <div className="px-3 py-1.5 bg-muted/60 text-[11px] text-muted-foreground flex justify-between font-sans">
                    <span>File: {noteTitle}</span>
                    <span>
                      <span className="text-emerald-500 font-bold">+{diff.additions}</span>{" "}
                      <span className="text-rose-500 font-bold">-{diff.deletions}</span>
                    </span>
                  </div>

                  <div className="divide-y divide-border/20 max-h-[500px] overflow-y-auto">
                    {diff.lines.map((line, idx) => {
                      const isAdded = line.type === "added";
                      const isRemoved = line.type === "removed";

                      return (
                        <div
                          key={idx}
                          className={`flex items-start text-xs py-0.5 px-2 select-text ${
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
                          <span className="w-5 select-none text-center shrink-0">
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
                      className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-md ${
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
                        <span className="text-emerald-500">+{entry.additions}</span> /{" "}
                        <span className="text-rose-500">-{entry.deletions}</span>
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
            className="px-3 py-1 rounded-lg border border-border hover:bg-accent text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
