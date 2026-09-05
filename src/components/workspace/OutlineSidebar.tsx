"use client";

import React from "react";
import { ListTree, X, AlignLeft } from "lucide-react";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface OutlineSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  headings: HeadingItem[];
  onSelectHeading: (text: string, level: number) => void;
}

export function OutlineSidebar({
  isOpen,
  onClose,
  headings = [],
  onSelectHeading,
}: OutlineSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="sm:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
        onClick={onClose}
      />

      <aside className="fixed sm:relative inset-y-0 right-0 z-30 sm:z-20 w-72 sm:w-64 border-l border-border/40 bg-background/80 backdrop-blur-md flex flex-col h-full select-none shrink-0 shadow-2xl sm:shadow-none animate-in slide-in-from-right-full duration-150">
        {/* Outline Header Bar */}
        <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ListTree className="w-3.5 h-3.5 text-foreground/70" />
            <span>Table of Contents</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Headings List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 text-xs space-y-0.5">
          {headings.length === 0 ? (
            <div className="px-3 py-8 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-2">
              <AlignLeft className="w-6 h-6 opacity-30" />
              <span>No headings in document</span>
            </div>
          ) : (
            headings.map((h, index) => {
              const indentClass =
                h.level === 1
                  ? "pl-2 font-bold text-foreground"
                  : h.level === 2
                  ? "pl-5 font-semibold text-foreground/90"
                  : h.level === 3
                  ? "pl-8 text-muted-foreground"
                  : "pl-11 text-muted-foreground/80";

              return (
                <button
                  key={`${h.id}-${index}`}
                  onClick={() => {
                    onSelectHeading(h.text, h.level);
                    if (typeof window !== "undefined" && window.innerWidth < 640) {
                      onClose();
                    }
                  }}
                  className={`w-full text-left py-1.5 px-2 hover:bg-accent/60 rounded truncate transition-colors font-sans ${indentClass}`}
                  title={`H${h.level}: ${h.text}`}
                >
                  <span className="truncate">{h.text}</span>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
