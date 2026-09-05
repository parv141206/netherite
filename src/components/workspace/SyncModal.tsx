"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, X, CloudDownload } from "lucide-react";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteTitle: string;
  isDirty: boolean;
  diffSummary?: string;
  isSyncing: boolean;
  onConfirmSync: (clearAllDrafts: boolean) => Promise<void>;
}

export function SyncModal({
  isOpen,
  onClose,
  noteTitle,
  isDirty,
  diffSummary = "",
  isSyncing,
  onConfirmSync,
}: SyncModalProps) {
  const [clearAllDrafts, setClearAllDrafts] = useState(false);
  const actionBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      actionBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSyncing) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSyncing, onClose]);

  if (!isOpen) return null;

  const handleAction = async () => {
    try {
      await onConfirmSync(clearAllDrafts);
      onClose();
    } catch {
      // Handled in parent
    }
  };

  const cleanTitle = noteTitle.replace(/\.(md|excalidraw)$/i, "");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={() => {
        if (!isSyncing) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-foreground select-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-modal-title"
      >
        <button
          onClick={onClose}
          disabled={isSyncing}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              isDirty
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            }`}
          >
            {isDirty ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : (
              <CloudDownload className="w-5 h-5 text-emerald-500" />
            )}
          </div>

          <div className="flex flex-col gap-1 pr-6">
            <h3 id="sync-modal-title" className="text-base font-semibold text-foreground tracking-tight">
              {isDirty ? "Discard changes & pull from Drive?" : "Sync with Google Drive"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isDirty ? (
                <>
                  Unsaved local edits detected on this device for{" "}
                  <span className="font-semibold text-foreground">
                    {cleanTitle || "current file"}
                  </span>{" "}
                  {diffSummary && (
                    <span className="font-mono text-amber-500 font-semibold">({diffSummary})</span>
                  )}
                  .
                </>
              ) : (
                <>
                  Force a fresh pull of all files and active document contents directly from Google Drive.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Description / Confirmation Box */}
        {isDirty ? (
          <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 text-xs space-y-2 text-muted-foreground">
            <p className="font-medium text-foreground">
              &ldquo;Discard your changes, I am bringing the latest stuff from Drive!&rdquo;
            </p>
            <p className="text-[11px] leading-relaxed">
              This will discard all un-synced edits on this device and fetch the exact latest content stored in your Google Drive (e.g. notes saved from your laptop).
            </p>
            <div className="pt-2 border-t border-border/30">
              <label className="flex items-center gap-2 cursor-pointer select-none text-foreground">
                <input
                  type="checkbox"
                  checked={clearAllDrafts}
                  onChange={(e) => setClearAllDrafts(e.target.checked)}
                  className="rounded border-border text-foreground accent-foreground focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  Also clear any other local drafts on this device
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="bg-muted/40 border border-border/50 rounded-xl p-3.5 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Current note is in sync locally</span>
            </div>
            <p className="text-[11px]">
              Netherite will re-fetch the explorer file tree and retrieve the latest document version from Google Drive.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={actionBtnRef}
            type="button"
            onClick={handleAction}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              isDirty
                ? "bg-amber-500 hover:bg-amber-600 text-black active:scale-95"
                : "bg-foreground text-background hover:opacity-90 active:scale-95"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>
              {isSyncing
                ? "Syncing from Drive..."
                : isDirty
                ? "Discard & Pull Latest"
                : "Sync from Drive"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
