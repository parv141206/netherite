"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  FileText,
  Workflow,
  Palette,
  Network,
  Folder,
  CornerDownLeft,
  X,
  Calendar,
  Sparkles,
  Loader2,
  FileSearch,
} from "lucide-react";
import type { DriveItem } from "~/components/workspace/Sidebar";
import { api } from "~/trpc/react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: DriveItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onSelectFolder?: (id: string) => void;
  onCreateNote?: () => void;
  onOpenCalendar?: () => void;
}

interface SearchResultItem {
  id: string;
  name: string;
  mimeType?: string;
  parents?: string[] | null;
  matchType: "title" | "content" | "folder";
  snippet?: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
  notes,
  activeNoteId,
  onSelectNote,
  onSelectFolder,
  onCreateNote,
  onOpenCalendar,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce query for server-side full text content search (350ms to avoid API churn)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setDebouncedQuery("");
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

  // Server-side deep Google Drive full-text search
  const { data: serverSearchResults, isLoading: isServerSearching } =
    api.notes.searchContent.useQuery(
      { query: debouncedQuery },
      {
        enabled: isOpen && debouncedQuery.length >= 2,
        staleTime: 30000,
      }
    );

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

  const getBreadcrumb = (parents?: string[] | null): string => {
    if (!parents || parents.length === 0) return "";
    const parentId = parents[0];
    return folderMap.get(parentId) || "";
  };

  // Helper: Find text snippet in local storage drafts
  const getLocalDraftSnippet = (id: string, searchTerm: string): string | null => {
    if (typeof window === "undefined" || !searchTerm) return null;
    try {
      const draft = localStorage.getItem(`netherite_draft_${id}`);
      if (!draft) return null;
      const lower = draft.toLowerCase();
      const idx = lower.indexOf(searchTerm.toLowerCase());
      if (idx === -1) return null;

      const start = Math.max(0, idx - 45);
      const end = Math.min(draft.length, idx + searchTerm.length + 65);
      const prefix = start > 0 ? "…" : "";
      const suffix = end < draft.length ? "…" : "";
      return `${prefix}${draft.substring(start, end).replace(/\n+/g, " ")}${suffix}`;
    } catch {
      return null;
    }
  };

  // Unified Filter & Rank results (Title matches + Content matches)
  const results: SearchResultItem[] = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      // Default: recent non-dotfile items
      return notes
        .filter((n) => !n.name?.startsWith(".") && n.name !== "assets")
        .slice(0, 15)
        .map((n) => ({
          id: n.id,
          name: n.name,
          mimeType: n.mimeType,
          parents: n.parents,
          matchType:
            n.mimeType === "application/vnd.google-apps.folder" ? "folder" : "title",
        }));
    }

    const items: SearchResultItem[] = [];
    const seenIds = new Set<string>();

    // 1. Direct Title & Folder Matches (High priority)
    for (const n of notes) {
      if (n.name?.startsWith(".") || n.name === "assets") continue;
      const isFolder = n.mimeType === "application/vnd.google-apps.folder";
      const nameMatch = n.name.toLowerCase().includes(cleanQuery);
      const parentName = n.parents?.[0] ? folderMap.get(n.parents[0]) : "";
      const parentMatch = parentName ? parentName.toLowerCase().includes(cleanQuery) : false;

      if (nameMatch || parentMatch) {
        items.push({
          id: n.id,
          name: n.name,
          mimeType: n.mimeType,
          parents: n.parents,
          matchType: isFolder ? "folder" : "title",
          snippet: getLocalDraftSnippet(n.id, cleanQuery) || undefined,
        });
        seenIds.add(n.id);
      }
    }

    // 2. Client Local Storage Content Matches (0ms instant)
    for (const n of notes) {
      if (seenIds.has(n.id) || n.mimeType === "application/vnd.google-apps.folder") continue;
      const snippet = getLocalDraftSnippet(n.id, cleanQuery);
      if (snippet) {
        items.push({
          id: n.id,
          name: n.name,
          mimeType: n.mimeType,
          parents: n.parents,
          matchType: "content",
          snippet,
        });
        seenIds.add(n.id);
      }
    }

    // 3. Server Google Drive Full-Text Search Matches
    if (serverSearchResults && serverSearchResults.length > 0) {
      for (const serverItem of serverSearchResults) {
        if (!serverItem.id || seenIds.has(serverItem.id)) continue;
        if (serverItem.name?.startsWith(".") || serverItem.name === "assets") continue;

        // Check if note exists in client note list to preserve parents
        const existing = notes.find((n) => n.id === serverItem.id);
        const snippet = getLocalDraftSnippet(serverItem.id, cleanQuery) || undefined;

        items.push({
          id: serverItem.id,
          name: serverItem.name,
          mimeType: serverItem.mimeType,
          parents: existing?.parents || serverItem.parents,
          matchType: "content",
          snippet,
        });
        seenIds.add(serverItem.id);
      }
    }

    return items.slice(0, 30);
  }, [notes, query, folderMap, serverSearchResults]);

  // Selection handler with jump target persistence
  const handleCommitSelection = (item: SearchResultItem) => {
    if (item.matchType === "folder") {
      if (onSelectFolder) {
        onSelectFolder(item.id);
      }
      onClose();
      return;
    }
    if (query.trim()) {
      sessionStorage.setItem("netherite_search_jump", query.trim());
    }
    onSelectNote(item.id);
    onClose();
  };

  // Handle arrow keys and enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results.length > 0 && selectedIndex < results.length) {
        const item = results[selectedIndex];
        handleCommitSelection(item);
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

  const getItemIcon = (item: SearchResultItem) => {
    if (item.matchType === "folder" || item.mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (item.name.endsWith(".mmd") || item.name.endsWith(".mermaid")) {
      return <Workflow className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (item.name.endsWith(".excalidraw")) {
      return <Palette className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
    if (item.name.endsWith(".apollon") || item.name.endsWith(".uml")) {
      return <Network className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-primary shrink-0" />;
  };

  const getCleanName = (name: string) => {
    return name.replace(/\.(md|mmd|mermaid|excalidraw|apollon|uml)$/i, "");
  };

  // Highlight query term in text
  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.toLowerCase() ? (
            <mark
              key={i}
              className="bg-yellow-300/60 dark:bg-yellow-500/30 text-foreground font-semibold rounded-xs px-1 py-0.2"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
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
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border/60 gap-3 bg-muted/20">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search titles, full note content, formulas & diagrams..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none font-medium"
          />
          {isServerSearching && (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
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

        {/* Full-Text Drive Search Loader Status */}
        {query.trim().length >= 2 && (isServerSearching || query.trim() !== debouncedQuery) && (
          <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border/40 text-xs text-primary select-none animate-in fade-in duration-100">
            <div className="flex items-center gap-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-primary" />
              <span>Searching full note contents across Google Drive…</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">Deep Scan</span>
          </div>
        )}

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent"
        >
          {results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Searched note titles and full text across all documents
              </p>
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              const breadcrumb = getBreadcrumb(item.parents);
              const cleanName = getCleanName(item.name);

              return (
                <div
                  key={item.id}
                  onClick={() => handleCommitSelection(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex flex-col px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? "bg-accent text-accent-foreground shadow-2xs"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {getItemIcon(item)}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground flex items-center gap-2">
                          <span>{highlightMatch(cleanName, query)}</span>
                          {item.id === activeNoteId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-mono">
                              Active
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

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                          item.matchType === "content"
                            ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                            : "bg-muted/60 text-muted-foreground border-border/40"
                        }`}
                      >
                        {item.matchType === "content" ? "Content Match" : item.matchType === "folder" ? "Folder" : "Title Match"}
                      </span>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Contextual Content Snippet Preview */}
                  {item.snippet && (
                    <div className="mt-1.5 pl-7 text-[11px] text-muted-foreground/90 font-mono leading-relaxed truncate">
                      {highlightMatch(item.snippet, query)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
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
                className="text-[11px] hover:text-foreground transition-colors cursor-pointer"
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
                <Calendar className="w-3 h-3 text-primary" />
                <span>Calendar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
