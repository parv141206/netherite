"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  Moon,
  Sun,
  Settings,
  ChevronLeft,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderPlus,
  Copy,
  RefreshCw,
  LogOut,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import { api } from "~/trpc/react";
import { signOut } from "next-auth/react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";

function InlineRenameInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string;
  onCommit: (val: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initialValue);
  const committedRef = useRef(false);

  const handleCommit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = val.trim();
    if (trimmed && trimmed !== initialValue) {
      onCommit(trimmed);
    } else {
      onCancel();
    }
  };

  return (
    <input
      autoFocus
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleCommit();
        } else if (e.key === "Escape") {
          committedRef.current = true;
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="bg-background border border-foreground rounded px-1 text-xs text-foreground focus:outline-none w-full font-sans shadow-sm"
    />
  );
}

export interface DriveItem {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  parents?: string[] | null;
}

export const FOLDER_COLOR_PALETTE: {
  id: string;
  name: string;
  dotColor: string;
  bgClass: string;
  iconClass: string;
}[] = [
  {
    id: "default",
    name: "Default",
    dotColor: "bg-muted-foreground",
    bgClass: "",
    iconClass: "",
  },
  {
    id: "red",
    name: "Rose Red",
    dotColor: "bg-rose-500",
    bgClass: "bg-rose-500/15 dark:bg-rose-500/25 text-foreground border border-rose-500/30 font-medium shadow-2xs",
    iconClass: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "orange",
    name: "Peach Orange",
    dotColor: "bg-orange-500",
    bgClass: "bg-orange-500/15 dark:bg-orange-500/25 text-foreground border border-orange-500/30 font-medium shadow-2xs",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "amber",
    name: "Warm Amber",
    dotColor: "bg-amber-500",
    bgClass: "bg-amber-500/15 dark:bg-amber-500/25 text-foreground border border-amber-500/30 font-medium shadow-2xs",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "green",
    name: "Mint Green",
    dotColor: "bg-emerald-500",
    bgClass: "bg-emerald-500/15 dark:bg-emerald-500/25 text-foreground border border-emerald-500/30 font-medium shadow-2xs",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "teal",
    name: "Soft Teal",
    dotColor: "bg-teal-500",
    bgClass: "bg-teal-500/15 dark:bg-teal-500/25 text-foreground border border-teal-500/30 font-medium shadow-2xs",
    iconClass: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "blue",
    name: "Pastel Blue",
    dotColor: "bg-blue-500",
    bgClass: "bg-blue-500/15 dark:bg-blue-500/25 text-foreground border border-blue-500/30 font-medium shadow-2xs",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "indigo",
    name: "Indigo",
    dotColor: "bg-indigo-500",
    bgClass: "bg-indigo-500/15 dark:bg-indigo-500/25 text-foreground border border-indigo-500/30 font-medium shadow-2xs",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "purple",
    name: "Lavender Purple",
    dotColor: "bg-purple-500",
    bgClass: "bg-purple-500/15 dark:bg-purple-500/25 text-foreground border border-purple-500/30 font-medium shadow-2xs",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "pink",
    name: "Blush Pink",
    dotColor: "bg-pink-500",
    bgClass: "bg-pink-500/15 dark:bg-pink-500/25 text-foreground border border-pink-500/30 font-medium shadow-2xs",
    iconClass: "text-pink-600 dark:text-pink-400",
  },
];

interface SidebarProps {
  userSession?: any;
  notes: DriveItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (parentId?: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameNote: (id: string, newName: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteMultiple?: (ids: string[]) => void;
  onMoveItem?: (fileId: string, targetFolderId: string) => void;
  onMoveMultiple?: (ids: string[], targetFolderId: string) => void;
  onOpenSettings: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMutating?: boolean;
  editingId?: string | null;
  setEditingId?: (id: string | null) => void;
  folderColors?: Record<string, string>;
  onSetFolderColor?: (folderId: string, color: string | null) => void;
}

export function Sidebar({
  userSession,
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onRenameNote,
  onDeleteNote,
  onDeleteMultiple,
  onMoveItem,
  onMoveMultiple,
  onOpenSettings,
  collapsed,
  onToggleCollapse,
  isMutating = false,
  editingId = null,
  setEditingId,
  folderColors = {},
  onSetFolderColor,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    root: true,
  });

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return activeNoteId ? new Set([activeNoteId]) : new Set();
  });
  const lastSelectedIdRef = useRef<string | null>(activeNoteId || null);

  // Sync activeNoteId into selectedIds when single selection
  useEffect(() => {
    if (activeNoteId && (!lastSelectedIdRef.current || selectedIds.size <= 1)) {
      setSelectedIds(new Set([activeNoteId]));
      lastSelectedIdRef.current = activeNoteId;
    }
  }, [activeNoteId]);

  // Inline Editing State
  const [editingName, setEditingName] = useState("");

  // Drag and Drop State
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [draggedIds, setDraggedIds] = useState<string[]>([]);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    itemId?: string;
    itemName?: string;
    isFolder?: boolean;
    isRootArea?: boolean;
  } | null>(null);

  const utils = api.useUtils();

  // Find all subfolder IDs excluding Netherite root folder itself and internal assets folder
  const subfolderIds = new Set(
    notes
      .filter((n) => n.mimeType === "application/vnd.google-apps.folder" && n.name !== "Netherite" && n.name !== "assets")
      .map((n) => n.id)
  );

  // Root items are non-Netherite items whose parents are NOT a subfolder inside Netherite
  const rootItems = notes.filter((n) => {
    if (n.name.startsWith(".")) return false;
    if (n.name === "assets") return false;
    if (n.mimeType === "application/vnd.google-apps.folder" && n.name === "Netherite") return false;
    if (!n.parents || n.parents.length === 0) return true;
    const isInsideSubfolder = n.parents.some((p) => subfolderIds.has(p));
    return !isInsideSubfolder;
  });

  const filterItem = (item: DriveItem): boolean => {
    if (item.name.startsWith(".")) return false;
    if (item.name === "assets") return false;
    if (!searchQuery.trim()) return true;
    const matchSelf = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (matchSelf) return true;
    if (item.mimeType === "application/vnd.google-apps.folder") {
      const children = notes.filter((c) => c.parents?.includes(item.id));
      return children.some((c) => filterItem(c));
    }
    return false;
  };

  // Flattened visible items list in top-down tree order (for Shift+Click range selection)
  const getVisibleItems = (): DriveItem[] => {
    const list: DriveItem[] = [];
    const visit = (items: DriveItem[]) => {
      for (const item of items) {
        if (!filterItem(item)) continue;
        list.push(item);
        if (
          item.mimeType === "application/vnd.google-apps.folder" &&
          expandedFolders[item.id]
        ) {
          const children = notes.filter((n) => n.parents?.includes(item.id));
          visit(children);
        }
      }
    };
    if (expandedFolders["root"]) {
      visit(rootItems);
    }
    return list;
  };

  // Global Click & Shortcut Listener
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setContextMenu(null);
        return;
      }

      if (e.key === "F2" && selectedIds.size === 1) {
        e.preventDefault();
        const singleId = Array.from(selectedIds)[0];
        const current = notes.find((n) => n.id === singleId);
        if (current) {
          startInlineEditing(current.id, current.name);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const activeElem = document.activeElement;
        if (
          activeElem &&
          (activeElem.tagName === "INPUT" ||
            activeElem.tagName === "TEXTAREA" ||
            activeElem.getAttribute("contenteditable") === "true")
        ) {
          return;
        }

        if (selectedIds.size > 1) {
          e.preventDefault();
          if (onDeleteMultiple) {
            onDeleteMultiple(Array.from(selectedIds));
          } else {
            selectedIds.forEach((id) => onDeleteNote(id));
          }
        } else if (selectedIds.size === 1) {
          e.preventDefault();
          const targetId = Array.from(selectedIds)[0];
          if (targetId) onDeleteNote(targetId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleGlobalClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeNoteId, notes, selectedIds, onDeleteMultiple, onDeleteNote]);

  const startInlineEditing = (id: string, name: string) => {
    if (setEditingId) setEditingId(id);
    setEditingName(name.replace(/\.md$/i, ""));
    setContextMenu(null);
  };

  const toggleFolder = (folderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const handleItemClick = (e: React.MouseEvent, item: DriveItem) => {
    const isFolder = item.mimeType === "application/vnd.google-apps.folder";

    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      const visible = getVisibleItems();
      const targetIdx = visible.findIndex((i) => i.id === item.id);
      const anchorId = lastSelectedIdRef.current;
      let anchorIdx = anchorId ? visible.findIndex((i) => i.id === anchorId) : -1;
      if (anchorIdx === -1) anchorIdx = 0;

      if (targetIdx !== -1) {
        const start = Math.min(anchorIdx, targetIdx);
        const end = Math.max(anchorIdx, targetIdx);
        const rangeIds = visible.slice(start, end + 1).map((i) => i.id);
        setSelectedIds(new Set([...selectedIds, ...rangeIds]));
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
      lastSelectedIdRef.current = item.id;
      return;
    }

    if (isFolder) {
      toggleFolder(item.id, e);
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (activeNoteId) {
          setSelectedIds(new Set([activeNoteId]));
        } else {
          setSelectedIds(new Set());
        }
      }
      return;
    }

    // Standard Click on a file
    setSelectedIds(new Set([item.id]));
    lastSelectedIdRef.current = item.id;
    onSelectNote(item.id);
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      onToggleCollapse();
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DriveItem) => {
    e.stopPropagation();
    let idsToDrag = [item.id];
    if (selectedIds.has(item.id) && selectedIds.size > 1) {
      idsToDrag = Array.from(selectedIds);
    } else {
      setSelectedIds(new Set([item.id]));
      lastSelectedIdRef.current = item.id;
    }
    setDraggedIds(idsToDrag);
    setDraggedItemId(item.id);
    e.dataTransfer.setData("text/plain", JSON.stringify(idsToDrag));
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    const idsToMove = draggedIds.length > 0 ? draggedIds : draggedItemId ? [draggedItemId] : [];
    const validIds = idsToMove.filter((id) => id !== targetFolderId);

    if (validIds.length > 0) {
      if (validIds.length > 1 && onMoveMultiple) {
        onMoveMultiple(validIds, targetFolderId);
      } else if (onMoveItem) {
        validIds.forEach((id) => onMoveItem(id, targetFolderId));
      }
      setExpandedFolders((prev) => ({ ...prev, [targetFolderId]: true }));
    }

    setDraggedItemId(null);
    setDraggedIds([]);
  };

  const handleItemContextMenu = (
    e: React.MouseEvent,
    itemId: string,
    itemName: string,
    isFolder: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-clicked item is not in current multi-selection, select it singly
    if (!selectedIds.has(itemId)) {
      setSelectedIds(new Set([itemId]));
      lastSelectedIdRef.current = itemId;
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      itemId,
      itemName,
      isFolder,
    });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isRootArea: true,
    });
  };

  // Clean minimal Notion page icon
  const getFileIcon = (name: string, mimeType?: string) => {
    if (mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)) {
      return <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-foreground shrink-0 transition-colors" />;
  };

  const renderTreeItem = (item: DriveItem) => {
    if (!filterItem(item)) return null;

    const isFolder = item.mimeType === "application/vnd.google-apps.folder";
    const isEditing = editingId === item.id;
    const isSelected = selectedIds.has(item.id);

    if (isFolder) {
      const isExpanded = expandedFolders[item.id];
      const children = notes.filter((n) => n.parents?.includes(item.id));
      const isTarget = dragOverFolderId === item.id;

      return (
        <div key={item.id} className="space-y-0.5">
          <div
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverFolderId(item.id);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverFolderId(null);
            }}
            onDrop={(e) => handleDropOnFolder(e, item.id)}
            onClick={(e) => handleItemClick(e, item)}
            onContextMenu={(e) => handleItemContextMenu(e, item.id, item.name, true)}
            className={`flex items-center justify-between px-1.5 py-1 rounded-md cursor-pointer group transition-all select-none ${
              isTarget
                ? "bg-accent border border-foreground text-foreground"
                : selectedIds.size > 1 && isSelected
                ? "bg-accent/60 text-foreground font-medium ring-1 ring-border/60 shadow-2xs"
                : (() => {
                    const assignedColor = folderColors[item.id];
                    const colorDef = assignedColor ? FOLDER_COLOR_PALETTE.find((c) => c.id === assignedColor) : null;
                    return colorDef?.bgClass || "text-muted-foreground hover:bg-accent/60 hover:text-foreground";
                  })()
            }`}
          >
            <div className="flex items-center gap-1.5 truncate w-full">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.id, e);
                }}
                className="p-0.5 hover:bg-accent/80 rounded transition-colors"
              >
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </span>
              {(() => {
                const assignedColor = folderColors[item.id];
                const colorDef = assignedColor ? FOLDER_COLOR_PALETTE.find((c) => c.id === assignedColor) : null;
                const iconColor = colorDef?.iconClass;
                return isExpanded ? (
                  <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${iconColor || "text-foreground"}`} />
                ) : (
                  <Folder className={`w-3.5 h-3.5 shrink-0 ${iconColor || "text-muted-foreground"}`} />
                );
              })()}

              {isEditing ? (
                <InlineRenameInput
                  initialValue={item.name.replace(/\.md$/i, "")}
                  onCommit={(newName) => {
                    onRenameNote(item.id, newName.replace(/\.md$/i, ""));
                    if (setEditingId) setEditingId(null);
                  }}
                  onCancel={() => {
                    if (setEditingId) setEditingId(null);
                  }}
                />
              ) : (
                <span className="truncate font-medium text-foreground">{item.name.replace(/\.md$/i, "")}</span>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="pl-3 ml-2 border-l border-border/40 space-y-0.5 mt-0.5">
              {children.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-muted-foreground/60 italic">
                  Empty folder
                </div>
              ) : (
                children.map((child) => renderTreeItem(child))
              )}
            </div>
          )}
        </div>
      );
    } else {
      const isActive = activeNoteId === item.id;
      const displayName = item.name.replace(/\.md$/i, "");

      return (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onClick={(e) => handleItemClick(e, item)}
          onContextMenu={(e) => handleItemContextMenu(e, item.id, item.name, false)}
          className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-all group select-none ${
            selectedIds.size > 1 && isSelected
              ? "bg-accent/60 text-foreground font-medium ring-1 ring-border/60 shadow-2xs"
              : isActive
              ? "bg-accent text-foreground font-semibold shadow-2xs"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2 truncate w-full">
            {getFileIcon(item.name, item.mimeType)}
            {isEditing ? (
              <InlineRenameInput
                initialValue={displayName}
                onCommit={(newName) => {
                  const finalName = newName.endsWith(".md") ? newName : `${newName}.md`;
                  onRenameNote(item.id, finalName);
                  if (setEditingId) setEditingId(null);
                }}
                onCancel={() => {
                  if (setEditingId) setEditingId(null);
                }}
              />
            ) : (
              <span className="truncate">{displayName}</span>
            )}
          </div>
        </div>
      );
    }
  };

  if (collapsed) {
    return (
      <aside className="hidden sm:flex w-14 border-r border-border bg-[var(--sidebar-bg)] flex-col items-center py-3 justify-between select-none">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-[var(--accent)] rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onCreateNote()}
            className="p-2 bg-foreground text-background hover:opacity-90 rounded-lg transition-all shadow-sm"
            title="New File (Ctrl+N)"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-border my-1" />

          <div className="flex flex-col gap-1.5">
            {notes
              .filter((n) => n.mimeType !== "application/vnd.google-apps.folder")
              .slice(0, 6)
              .map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelectNote(file.id)}
                  className={`p-2 rounded-lg transition-all ${
                    activeNoteId === file.id
                      ? "bg-accent text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                  title={file.name}
                >
                  {getFileIcon(file.name, file.mimeType)}
                </button>
              ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="sm:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onToggleCollapse}
      />

      <aside
        onContextMenu={handleRootContextMenu}
        className="fixed sm:relative inset-y-0 left-0 z-50 w-72 sm:w-64 border-r border-border bg-[var(--sidebar-bg)] flex flex-col h-full select-none shadow-2xl sm:shadow-none animate-in slide-in-from-left duration-200"
      >
      {/* Notion-Style Workspace Header */}
      <div className="px-3 py-2.5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <NetheriteLogo className="h-5 w-auto text-foreground shrink-0" />
          <span className="font-semibold text-xs text-foreground truncate">
            {userSession?.user?.name ? `${userSession.user.name.split(" ")[0]}'s Notes` : "Netherite"}
          </span>
          {isMutating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onCreateNote()}
            className="p-1 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="New Page (Ctrl+N)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onCreateFolder()}
            className="p-1 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => utils.notes.list.invalidate()}
            className="p-1 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1 hover:bg-accent/60 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Filter Search */}
      <div className="p-2 border-b border-border/30" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 bg-accent/40 hover:bg-accent/60 border border-transparent focus:border-border rounded-md text-xs focus:outline-none text-foreground placeholder:text-muted-foreground/60 font-sans transition-colors"
          />
        </div>
      </div>

      {/* Multi-Select Action Banner */}
      {selectedIds.size > 1 && (
        <div className="mx-2 my-1 px-2.5 py-1.5 bg-accent/90 border border-border/80 rounded-md flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-150 shadow-sm">
          <span className="font-semibold text-foreground text-[11px]">
            {selectedIds.size} items selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (onDeleteMultiple) {
                  onDeleteMultiple(Array.from(selectedIds));
                } else {
                  selectedIds.forEach((id) => onDeleteNote(id));
                }
                setSelectedIds(new Set());
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-red-500/15 text-red-500 hover:bg-red-500/25 font-semibold transition-colors"
              title="Delete selected items (Del)"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-background/40 transition-colors"
              title="Clear selection (Esc)"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* VS Code Recursive Tree File Navigation */}
      <div className="flex-1 overflow-y-auto px-1 py-1 text-xs">
        {/* Root Directory Node */}
        <div
          onClick={(e) => toggleFolder("root", e)}
          onContextMenu={(e) => handleRootContextMenu(e)}
          className={`flex items-center gap-1.5 px-1.5 py-1 font-bold rounded-md cursor-pointer transition-all ${
            (() => {
              const rootColor = folderColors["root"];
              const colorDef = rootColor ? FOLDER_COLOR_PALETTE.find((c) => c.id === rootColor) : null;
              return colorDef?.bgClass || "text-foreground hover:bg-accent/40";
            })()
          }`}
        >
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${
              expandedFolders["root"] ? "rotate-90" : ""
            }`}
          />
          {(() => {
            const rootColor = folderColors["root"];
            const colorDef = rootColor ? FOLDER_COLOR_PALETTE.find((c) => c.id === rootColor) : null;
            const iconColor = colorDef?.iconClass;
            return expandedFolders["root"] ? (
              <FolderOpen className={`w-4 h-4 shrink-0 ${iconColor || "text-foreground"}`} />
            ) : (
              <Folder className={`w-4 h-4 shrink-0 ${iconColor || "text-muted-foreground"}`} />
            );
          })()}
          <span className="truncate">netherite</span>
        </div>

        {/* Directory Items List */}
        {expandedFolders["root"] && (
          <div className="pl-3 ml-2 border-l border-border/40 space-y-0.5 mt-0.5">
            {rootItems.length === 0 ? (
              <div className="px-2 py-4 text-center text-[11px] text-muted-foreground">
                No files found
              </div>
            ) : (
              rootItems.map((item) => renderTreeItem(item))
            )}
          </div>
        )}
      </div>

      {/* VS Code Context Menu Popover */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed w-48 bg-card border border-border rounded-lg shadow-2xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isRootArea ? (
            <>
              <button
                onClick={() => {
                  onCreateNote();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> New File
              </button>
              <button
                onClick={() => {
                  onCreateFolder();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <FolderPlus className="w-3.5 h-3.5" /> New Folder
              </button>
              <div className="h-[1px] bg-border my-1" />
              {/* Root Folder Color Picker */}
              <div className="px-3 py-2 border-b border-border/40">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                  <span>Folder Color</span>
                  {folderColors["root"] && (
                    <button
                      onClick={() => {
                        if (onSetFolderColor) onSetFolderColor("root", null);
                        setContextMenu(null);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 py-0.5">
                  {FOLDER_COLOR_PALETTE.map((c) => {
                    const isSelected = (folderColors["root"] || "default") === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.name}
                        onClick={() => {
                          if (onSetFolderColor) onSetFolderColor("root", c.id === "default" ? null : c.id);
                          setContextMenu(null);
                        }}
                        className={`w-5 h-5 rounded-full ${c.dotColor} flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-foreground ring-offset-1 ring-offset-background scale-105"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {c.id === "default" && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => {
                  utils.notes.list.invalidate();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Explorer
              </button>
            </>
          ) : selectedIds.size > 1 ? (
            <>
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground border-b border-border/40">
                {selectedIds.size} items selected
              </div>
              <button
                onClick={() => {
                  if (onDeleteMultiple) {
                    onDeleteMultiple(Array.from(selectedIds));
                  } else {
                    selectedIds.forEach((id) => onDeleteNote(id));
                  }
                  setSelectedIds(new Set());
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-red-500/10 flex items-center gap-2 text-red-500 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedIds.size} items{" "}
                <span className="ml-auto text-[10px] text-red-400 font-mono">Del</span>
              </button>
              <button
                onClick={() => {
                  setSelectedIds(new Set());
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-muted-foreground"
              >
                Deselect all{" "}
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">Esc</span>
              </button>
            </>
          ) : contextMenu.isFolder ? (
            <>
              {/* Folder Color Picker */}
              <div className="px-3 py-2 border-b border-border/40">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
                  <span>Folder Color</span>
                  {contextMenu.itemId && folderColors[contextMenu.itemId] && (
                    <button
                      onClick={() => {
                        if (contextMenu.itemId && onSetFolderColor) {
                          onSetFolderColor(contextMenu.itemId, null);
                        }
                        setContextMenu(null);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 py-0.5">
                  {FOLDER_COLOR_PALETTE.map((c) => {
                    const isSelected =
                      (contextMenu.itemId ? folderColors[contextMenu.itemId] || "default" : "default") === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.name}
                        onClick={() => {
                          if (contextMenu.itemId && onSetFolderColor) {
                            onSetFolderColor(contextMenu.itemId, c.id === "default" ? null : c.id);
                          }
                          setContextMenu(null);
                        }}
                        className={`w-5 h-5 rounded-full ${c.dotColor} flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          isSelected
                            ? "ring-2 ring-foreground ring-offset-1 ring-offset-background scale-105"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {c.id === "default" && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  onCreateNote(contextMenu.itemId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <Plus className="w-3.5 h-3.5" /> New File in Folder
              </button>
              <button
                onClick={() => {
                  onCreateFolder(contextMenu.itemId);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <FolderPlus className="w-3.5 h-3.5" /> New Folder in Folder
              </button>
              <button
                onClick={() => {
                  if (contextMenu.itemId && contextMenu.itemName) {
                    startInlineEditing(contextMenu.itemId, contextMenu.itemName);
                  }
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <Edit3 className="w-3.5 h-3.5" /> Rename Folder
              </button>
              <div className="h-[1px] bg-border my-1" />
              <button
                onClick={() => contextMenu.itemId && onDeleteNote(contextMenu.itemId)}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Folder
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() =>
                  contextMenu.itemId &&
                  contextMenu.itemName &&
                  startInlineEditing(contextMenu.itemId, contextMenu.itemName)
                }
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <Edit3 className="w-3.5 h-3.5" /> Rename{" "}
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">F2</span>
              </button>

              <button
                onClick={() => {
                  if (contextMenu.itemName) {
                    navigator.clipboard.writeText(contextMenu.itemName);
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-foreground"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Name
              </button>

              <div className="h-[1px] bg-border my-1" />

              <button
                onClick={() => contextMenu.itemId && onDeleteNote(contextMenu.itemId)}
                className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-2 text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete{" "}
                <span className="ml-auto text-[10px] text-red-400 font-mono">Del</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Footer: User Account & Settings */}
      <div className="p-2 border-t border-border flex items-center justify-between bg-card/40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-bold uppercase">
            {userSession?.user?.name?.[0] || "U"}
          </div>
          <div className="truncate text-xs font-medium text-foreground">
            {userSession?.user?.name || "User"}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Light/Dark Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => signOut()}
            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-red-500 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  </>
  );
}
