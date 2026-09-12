"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  Workflow,
  Palette,
  Network,
  Folder,
  ArrowRight,
  CornerDownLeft,
  X,
  Sparkles,
  Calendar,
} from "lucide-react";
import type { DriveItem } from "~/components/workspace/Sidebar";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: DriveItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onCreateNote?: () => void;
  onOpenCalendar?: () => void;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onOpenCalendar,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Folder map to resolve breadcrumbs
  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of notes) {
      if (item.mimeType === "application/vnd.google-apps.folder") {
        map.set(item.id, item.name);
      }
    }
    return map;
  }, [notes]);

  const getBreadcrumb = (item: DriveItem): string => {
    if (!item.parents || item.parents.length === 0) return "";
    const parentId = item.parents[0];
    return folderMap.get(parentId) || "";
  };

  // Filter notes by search query
  const filteredItems = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      // Show most recently modified files and non-folders
      return notes
        .filter((n) => !n.name?.startsWith(".") && n.name !== "assets")
        .slice(0, 15);
    }

    return notes
      .filter((n) => {
        if (n.name?.startsWith(".") || n.name === "assets") return false;
        const nameMatch = n.name.toLowerCase().includes(cleanQuery);
        const parentMatch = n.parents?.some((p) => {
          const pName = folderMap.get(p);
          return pName && pName.toLowerCase().includes(cleanQuery);
        });
        return nameMatch || parentMatch;
      })
      .slice(0, 25);
  }, [notes, query, folderMap]);

  // Handle arrow key navigation and Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
        const item = filteredItems[selectedIndex];
        onSelectNote(item.id);
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const getItemIcon = (item: DriveItem) => {
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";
    if (isFolder) return <Folder className="w-4 h-4 text-amber-500 shrink-0" />;
    if (item.name.endsWith(".mmd") || item.name.endsWith(".mermaid")) {
      return <Workflow className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (item.name.endsWith(".excalidraw")) {
      return <Palette className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
    if (item.name.endsWith(".apollon") || item.name.endsWith(".uml")) {
      return <Network className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  const getItemTypeBadge = (item: DriveItem) => {
    if (item.mimeType === "application/vnd.google-apps.folder") return "Folder";
    if (item.name.endsWith(".mmd") || item.name.endsWith(".mermaid")) return "Mermaid";
    if (item.name.endsWith(".excalidraw")) return "Whiteboard";
    if (item.name.endsWith(".apollon") || item.name.endsWith(".uml")) return "UML";
    return "Note";
  };

  const getCleanName = (name: string) => {
    return name.replace(/\.(md|mmd|mermaid|excalidraw|apollon|uml)$/i, "");
  };

  return (
    <div
      className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-md flex items-start justify-center pt-[10vh] px-4 animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3 bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all notes, diagrams & folders... (Type to filter)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border/50 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Try searching for chapter names, protocols, or diagrams
              </p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const breadcrumb = getBreadcrumb(item);
              const cleanName = getCleanName(item.name);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectNote(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-accent text-accent-foreground font-medium shadow-xs"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getItemIcon(item)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-foreground flex items-center gap-2">
                        <span>{cleanName}</span>
                        {item.id === activeNoteId && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-mono">
                            Current
                          </span>
                        )}
                      </div>
                      {breadcrumb && (
                        <div className="text-[11px] text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
                          <span>in</span>
                          <span className="font-medium text-muted-foreground">{breadcrumb}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground border border-border/40">
                      {getItemTypeBadge(item)}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Quick Shortcuts */}
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background border border-border/60 rounded font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-background border border-border/60 rounded font-mono text-[10px]">
                ↓
              </kbd>
              <span className="text-[11px]">Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-background border border-border/60 rounded font-mono text-[10px]">
                ↵
              </kbd>
              <span className="text-[11px]">Open</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onCreateNote && (
              <button
                type="button"
                onClick={() => {
                  onCreateNote();
                  onClose();
                }}
                className="text-[11px] hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>New Note</span>
              </button>
            )}
            {onOpenCalendar && (
              <button
                type="button"
                onClick={() => {
                  onOpenCalendar();
                  onClose();
                }}
                className="text-[11px] hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer ml-2"
              >
                <Calendar className="w-3 h-3 text-blue-500" />
                <span>Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
