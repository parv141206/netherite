"use client";

import React, { useState, useMemo } from "react";
import {
  Folder,
  ChevronRight,
  ChevronLeft,
  FileText,
  Palette,
  Network,
  Workflow,
  Search,
  Plus,
  FolderPlus,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import type { DriveItem } from "./Sidebar";
import { FOLDER_COLOR_PALETTE } from "./Sidebar";

interface MobileLibraryScreenProps {
  notes: DriveItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (parentId?: string) => void;
  onCreateFolder?: (parentId?: string) => void;
  onCreateDrawing?: (parentId?: string) => void;
  onClose: () => void;
  folderColors?: Record<string, string>;
}

export function MobileLibraryScreen({
  notes = [],
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onCreateDrawing,
  onClose,
  folderColors = {},
}: MobileLibraryScreenProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Separate folders and files
  const folders = useMemo(() => {
    return notes.filter((item) => item.mimeType === "application/vnd.google-apps.folder");
  }, [notes]);

  const folderMap = useMemo(() => {
    const map = new Map<string, DriveItem>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Current folder object (if inside a folder)
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) : null;

  // Filter items in the current view
  const visibleFolders = useMemo(() => {
    if (searchQuery.trim()) return [];
    if (currentFolderId === null) {
      // Root level folders: items with no parents or whose parent is not in folderMap
      return folders.filter(
        (f) => !f.parents || f.parents.length === 0 || !f.parents.some((p) => folderMap.has(p))
      );
    }
    // Subfolders inside current folder
    return folders.filter((f) => f.parents?.includes(currentFolderId));
  }, [folders, currentFolderId, folderMap, searchQuery]);

  const visibleNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      // Global search across all non-folder notes
      return notes.filter(
        (item) =>
          item.mimeType !== "application/vnd.google-apps.folder" &&
          item.name.toLowerCase().includes(query)
      );
    }

    if (currentFolderId === null) {
      // Root level notes
      return notes.filter(
        (item) =>
          item.mimeType !== "application/vnd.google-apps.folder" &&
          (!item.parents || item.parents.length === 0 || !item.parents.some((p) => folderMap.has(p)))
      );
    }

    // Notes inside the current folder
    return notes.filter(
      (item) =>
        item.mimeType !== "application/vnd.google-apps.folder" &&
        item.parents?.includes(currentFolderId)
    );
  }, [notes, currentFolderId, folderMap, searchQuery]);

  // Count items inside a folder
  const getFolderItemCount = (folderId: string) => {
    return notes.filter((item) => item.parents?.includes(folderId)).length;
  };

  // Helper to format date cleanly
  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getItemIcon = (name: string, mimeType?: string) => {
    if (name.endsWith(".excalidraw") || mimeType === "application/vnd.excalidraw+json") {
      return <Palette className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
    if (name.endsWith(".apollon") || name.endsWith(".uml") || mimeType === "application/vnd.apollon+json") {
      return <Network className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (name.endsWith(".mmd") || name.endsWith(".mermaid")) {
      return <Workflow className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const getCleanName = (name: string) => {
    return name.replace(/\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i, "");
  };

  return (
    <div
      data-mobile-overlay="true"
      className="flex-1 flex flex-col h-full bg-background select-none overflow-hidden pb-24 animate-in fade-in duration-150"
    >
      {/* Native Apple Notes Header Bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur-xl shrink-0">
        {currentFolder ? (
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium text-xs -ml-1 py-1 px-1.5 rounded-lg active:scale-95 transition-all"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Folders</span>
          </button>
        ) : (
          <h1 className="text-xl font-bold tracking-tight text-foreground">Library</h1>
        )}

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5">
          {onCreateFolder && (
            <button
              onClick={() => onCreateFolder(currentFolderId || undefined)}
              className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              title="New Folder"
              type="button"
            >
              <FolderPlus className="w-4.5 h-4.5" />
            </button>
          )}
          {activeNoteId && (
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-full bg-accent hover:bg-accent/80 text-foreground text-xs font-semibold active:scale-95 transition-all"
              type="button"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-2.5 shrink-0">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes and whiteboards…"
            className="w-full pl-9 pr-8 py-2 bg-muted/40 hover:bg-muted/60 focus:bg-muted/80 text-foreground placeholder:text-muted-foreground text-xs rounded-xl focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {/* Folders Section (Only when not actively searching) */}
        {!searchQuery && visibleFolders.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {currentFolder ? "Subfolders" : "Folders"}
            </h2>
            <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/50 divide-y divide-border/30 overflow-hidden shadow-xs">
              {visibleFolders.map((folder) => {
                const assignedColor = folderColors[folder.id];
                const colorDef = assignedColor
                  ? FOLDER_COLOR_PALETTE.find((c) => c.id === assignedColor)
                  : null;
                const iconColor = colorDef?.iconClass;
                const count = getFolderItemCount(folder.id);

                return (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/40 active:bg-accent/70 transition-colors text-left"
                    type="button"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-accent/60 flex items-center justify-center shrink-0">
                        <Folder className={`w-4 h-4 ${iconColor || "text-amber-500"}`} />
                      </div>
                      <span className="text-xs font-semibold text-foreground truncate">
                        {folder.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                      <span className="text-[11px] font-medium">{count}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {searchQuery
                ? `Search Results (${visibleNotes.length})`
                : currentFolder
                ? currentFolder.name
                : "Recent Notes"}
            </h2>
            <span className="text-[11px] text-muted-foreground font-medium">
              {visibleNotes.length} {visibleNotes.length === 1 ? "note" : "notes"}
            </span>
          </div>

          {visibleNotes.length === 0 ? (
            <div className="p-8 text-center bg-card/40 rounded-2xl border border-dashed border-border/60 flex flex-col items-center gap-2">
              <FileText className="w-7 h-7 text-muted-foreground/40" />
              <p className="text-xs font-medium text-muted-foreground">
                {searchQuery ? "No matching notes found" : "No notes in this folder yet"}
              </p>
              <button
                onClick={() => {
                  onCreateNote(currentFolderId || undefined);
                  onClose();
                }}
                className="mt-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold active:scale-95 transition-all"
                type="button"
              >
                + Create Note
              </button>
            </div>
          ) : (
            <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/50 divide-y divide-border/30 overflow-hidden shadow-xs">
              {visibleNotes.map((note) => {
                const isActive = note.id === activeNoteId;
                const isDrawing =
                  note.name.endsWith(".excalidraw") ||
                  note.mimeType === "application/vnd.excalidraw+json";

                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      onSelectNote(note.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 hover:bg-accent/40 active:bg-accent/70 transition-colors text-left ${
                      isActive ? "bg-accent/50" : ""
                    }`}
                    type="button"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-accent/50 flex items-center justify-center shrink-0">
                        {getItemIcon(note.name, note.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isActive ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {getCleanName(note.name)}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {formatTime(note.modifiedTime)}
                          <span>•</span>
                          <span>{isDrawing ? "Whiteboard" : "Markdown"}</span>
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
