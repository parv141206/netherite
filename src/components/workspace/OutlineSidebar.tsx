"use client";

import React, { useEffect, useRef } from "react";
import { ListTree, X, AlignLeft, Hash } from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface OutlineSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  headings: HeadingItem[];
  activeHeadingId?: string;
  onSelectHeading: (text: string, level: number, id?: string) => void;
}

export function OutlineSidebar({
  isOpen,
  onClose,
  headings = [],
  activeHeadingId,
  onSelectHeading,
}: OutlineSidebarProps) {
  const { modernUi } = useTheme();
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll the sidebar topics list smoothly so the currently active title/subtitle stays visible
  useEffect(() => {
    if (!activeHeadingId) return;
    const activeEl = itemRefs.current.get(activeHeadingId);
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeHeadingId]);

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
        <div
          className={`px-3 py-2.5 border-b border-border/40 flex items-center justify-between ${
            modernUi ? "bg-background/40" : ""
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <ListTree className="w-3.5 h-3.5 text-foreground/70" />
            <span>Table of Contents</span>
            {headings.length > 0 && (
              <span className="text-[10px] font-normal text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded-full">
                {headings.length}
              </span>
            )}
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
        <div
          className={`flex-1 overflow-y-auto px-2 py-2 text-xs space-y-0.5 ${
            modernUi ? "modern-toc-guide" : ""
          }`}
        >
          {headings.length === 0 ? (
            <div className="px-3 py-8 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-2">
              <AlignLeft className="w-6 h-6 opacity-30" />
              <span>No headings in document</span>
            </div>
          ) : (
            headings.map((h, index) => {
              const isActive = h.id === activeHeadingId;
              const isMainTitle = h.level <= 2;

              const indentPadding =
                h.level === 1
                  ? "pl-2.5"
                  : h.level === 2
                  ? "pl-4"
                  : h.level === 3
                  ? "pl-6"
                  : "pl-8";

              const activeClasses = isActive
                ? "bg-primary/10 text-primary font-semibold shadow-xs border-l-2 border-primary dark:bg-primary/20"
                : "text-foreground/80 hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent";

              const levelWeightClass = isMainTitle
                ? "font-medium"
                : "text-muted-foreground font-normal text-[11.5px]";

              return (
                <button
                  key={`${h.id}-${index}`}
                  ref={(el) => {
                    if (el) {
                      itemRefs.current.set(h.id, el);
                    } else {
                      itemRefs.current.delete(h.id);
                    }
                  }}
                  onClick={() => {
                    onSelectHeading(h.text, h.level, h.id);
                    if (
                      typeof window !== "undefined" &&
                      window.innerWidth < 640
                    ) {
                      onClose();
                    }
                  }}
                  className={`w-full group text-left py-1.5 pr-2 rounded-r-lg truncate transition-all duration-150 font-sans flex items-center justify-between gap-1.5 ${indentPadding} ${activeClasses} ${levelWeightClass}`}
                  title={`H${h.level}: ${h.text}`}
                >
                  <span className="truncate flex items-center gap-1.5">
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                    )}
                    <span className="truncate">{h.text}</span>
                  </span>
                  <span className="opacity-0 group-hover:opacity-60 text-[9px] font-mono text-muted-foreground shrink-0 uppercase">
                    H{h.level}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}
