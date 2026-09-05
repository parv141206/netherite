"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface DeleteTarget {
  type: "note" | "folder" | "batch";
  id?: string;
  name?: string;
  ids?: string[];
  count?: number;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  target: DeleteTarget | null;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  target,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  // Auto-focus cancel button on open & handle Escape
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !target) return null;

  const getDetails = () => {
    switch (target.type) {
      case "folder":
        return {
          title: "Move Folder to Trash?",
          name: target.name || "Untitled Folder",
          description:
            "This folder and any documents or nested subfolders inside it will be moved to your Google Drive Trash. You can still restore them from your Google Drive.",
          warning: "Any active notes inside this folder will be closed.",
        };
      case "batch":
        return {
          title: `Move ${target.count || target.ids?.length || 0} items to Trash?`,
          name: `${target.count || target.ids?.length || 0} selected files & folders`,
          description:
            "All selected items will be moved to your Google Drive Trash. They will remain recoverable in your Google Drive Bin.",
          warning: undefined,
        };
      case "note":
      default:
        return {
          title: "Move Note to Trash?",
          name: target.name || "Untitled Note",
          description:
            "This document will be moved to your Google Drive Trash. You can recover it within 30 days directly from your Google Drive.",
          warning: undefined,
        };
    }
  };

  const details = getDetails();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 relative flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <button
          onClick={onCancel}
          disabled={isPending}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
          title="Cancel (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <h2 id="confirm-delete-title" className="text-base font-semibold text-foreground">
              {details.title}
            </h2>
            <p className="text-xs font-mono text-foreground/80 truncate bg-muted/60 px-2 py-1 rounded-md border border-border/40 mt-1">
              {details.name}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {details.description}
        </p>

        {details.warning && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{details.warning}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-medium text-foreground bg-muted hover:bg-accent border border-border/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isPending ? (
              <span>Moving to Trash...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
