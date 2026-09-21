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
  Palette,
  Network,
  Workflow,
  Calendar,
  GitCompare,
  RotateCw,
  Activity,
  Download,
  Archive,
  History,
} from "lucide-react";
import JSZip from "jszip";
import { useTheme } from "~/components/ThemeProvider";
import { api } from "~/trpc/react";
import { signOut } from "next-auth/react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { WindowControls } from "./WindowControls";
import { AppleSpinner } from "~/components/ui/AppleSpinner";

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
      className="bg-background border-foreground text-foreground w-full rounded border px-1 font-sans text-xs shadow-sm focus:outline-none"
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
    bgClass:
      "bg-rose-500/15 dark:bg-rose-500/25 text-foreground border border-rose-500/30 font-medium shadow-2xs",
    iconClass: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "orange",
    name: "Peach Orange",
    dotColor: "bg-orange-500",
    bgClass:
      "bg-orange-500/15 dark:bg-orange-500/25 text-foreground border border-orange-500/30 font-medium shadow-2xs",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "amber",
    name: "Warm Amber",
    dotColor: "bg-amber-500",
    bgClass:
      "bg-amber-500/15 dark:bg-amber-500/25 text-foreground border border-amber-500/30 font-medium shadow-2xs",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  {
    id: "green",
    name: "Mint Green",
    dotColor: "bg-emerald-500",
    bgClass:
      "bg-emerald-500/15 dark:bg-emerald-500/25 text-foreground border border-emerald-500/30 font-medium shadow-2xs",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "teal",
    name: "Soft Teal",
    dotColor: "bg-teal-500",
    bgClass:
      "bg-teal-500/15 dark:bg-teal-500/25 text-foreground border border-teal-500/30 font-medium shadow-2xs",
    iconClass: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "blue",
    name: "Pastel Blue",
    dotColor: "bg-blue-500",
    bgClass:
      "bg-blue-500/15 dark:bg-blue-500/25 text-foreground border border-blue-500/30 font-medium shadow-2xs",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "indigo",
    name: "Indigo",
    dotColor: "bg-indigo-500",
    bgClass:
      "bg-indigo-500/15 dark:bg-indigo-500/25 text-foreground border border-indigo-500/30 font-medium shadow-2xs",
    iconClass: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "purple",
    name: "Lavender Purple",
    dotColor: "bg-purple-500",
    bgClass:
      "bg-purple-500/15 dark:bg-purple-500/25 text-foreground border border-purple-500/30 font-medium shadow-2xs",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "pink",
    name: "Blush Pink",
    dotColor: "bg-pink-500",
    bgClass:
      "bg-pink-500/15 dark:bg-pink-500/25 text-foreground border border-pink-500/30 font-medium shadow-2xs",
    iconClass: "text-pink-600 dark:text-pink-400",
  },
];

interface SidebarProps {
  userSession?: any;
  notes: DriveItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onCreateNote: (parentId?: string) => void;
  onCreateDrawing?: (parentId?: string) => void;
  onCreateUml?: (parentId?: string) => void;
  onCreateMermaid?: (parentId?: string) => void;
  onCreateTikz?: (parentId?: string) => void;
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
  onManualSync?: () => void;
  isSyncing?: boolean;
  onDeepSync?: () => void;
  isDeepSyncing?: boolean;
  onToggleDiff?: () => void;
  isDiffOpen?: boolean;
  onOpenCalendar?: () => void;
  isCalendarActive?: boolean;
  onOpenGlobalSearch?: () => void;
  loadingNoteId?: string;
  folderToExpand?: string | null;
  activeNoteContent?: string;
  onToast?: (msg: string) => void;
  onOpenVersionHistory?: (noteId: string, noteTitle: string) => void;
}

export function Sidebar({
  userSession,
  notes,
  activeNoteId,
  activeNoteContent,
  onToast,
  onOpenVersionHistory,
  onSelectNote,
  onCreateNote,
  onCreateDrawing,
  onCreateUml,
  onCreateMermaid,
  onCreateTikz,
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
  onManualSync,
  isSyncing = false,
  onDeepSync,
  isDeepSyncing = false,
  onToggleDiff,
  isDiffOpen = false,
  onOpenCalendar,
  isCalendarActive = false,
  onOpenGlobalSearch,
  loadingNoteId,
  folderToExpand,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({
    root: true,
  });

  useEffect(() => {
    if (folderToExpand) {
      setExpandedFolders((prev) => ({
        ...prev,
        [folderToExpand]: true,
      }));
    }
  }, [folderToExpand]);

  // Resizable Sidebar Width (saved in localStorage, strict minimum 280px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 280 && parsed <= 560) return parsed;
      }
    }
    return 290;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newWidth = Math.min(560, Math.max(280, e.clientX));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem("netherite_sidebar_width", String(sidebarWidth));
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return activeNoteId ? new Set([activeNoteId]) : new Set();
  });
  const lastSelectedIdRef = useRef<string | null>(activeNoteId || null);
  const sidebarContainerRef = useRef<HTMLElement | null>(null);

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
      .filter(
        (n) =>
          n.mimeType === "application/vnd.google-apps.folder" &&
          n.name !== "Netherite" &&
          n.name !== "assets",
      )
      .map((n) => n.id),
  );

  // Root items are non-Netherite items whose parents are NOT a subfolder inside Netherite
  const rootItems = notes.filter((n) => {
    if (n.name.startsWith(".")) return false;
    if (n.name === "assets") return false;
    if (
      n.mimeType === "application/vnd.google-apps.folder" &&
      n.name === "Netherite"
    )
      return false;
    if (!n.parents || n.parents.length === 0) return true;
    const isInsideSubfolder = n.parents.some((p) => subfolderIds.has(p));
    return !isInsideSubfolder;
  });

  const filterItem = (item: DriveItem): boolean => {
    if (item.name.startsWith(".")) return false;
    if (item.name === "assets") return false;
    if (!searchQuery.trim()) return true;
    const matchSelf = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
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
    const handleGlobalClick = (e: MouseEvent) => {
      setContextMenu(null);
      if (
        sidebarContainerRef.current &&
        !sidebarContainerRef.current.contains(e.target as Node)
      ) {
        // Clear multi-selection when clicking out into the workspace
        if (selectedIds.size > 1) {
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener("click", handleGlobalClick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setContextMenu(null);
        return;
      }

      // CRITICAL: Ensure the delete/rename key event originated strictly within the sidebar!
      // If user is working in Apollon UML, Excalidraw, Markdown Editor, or Mermaid preview,
      // NEVER intercept Delete or Backspace as a file deletion command!
      const isInsideSidebar =
        sidebarContainerRef.current &&
        (sidebarContainerRef.current.contains(e.target as Node) ||
          sidebarContainerRef.current.contains(document.activeElement));

      if (!isInsideSidebar) {
        return;
      }

      if (e.key === "F2") {
        const targetId =
          selectedIds.size === 1 ? Array.from(selectedIds)[0] : activeNoteId;
        if (targetId) {
          e.preventDefault();
          const current = notes.find((n) => n.id === targetId);
          if (current) {
            startInlineEditing(current.id, current.name);
          }
        }
      } else if (
        e.key === "Delete" ||
        ((e.metaKey || e.ctrlKey) && e.key === "Backspace")
      ) {
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
    setEditingName(
      name.replace(/\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i, ""),
    );
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
      let anchorIdx = anchorId
        ? visible.findIndex((i) => i.id === anchorId)
        : -1;
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

    const idsToMove =
      draggedIds.length > 0 ? draggedIds : draggedItemId ? [draggedItemId] : [];
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
    isFolder: boolean,
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

  const getFileContent = async (fileId: string): Promise<string> => {
    if (fileId === activeNoteId && activeNoteContent !== undefined) {
      return activeNoteContent;
    }
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(`netherite_draft_${fileId}`);
      if (draft) return draft;
      const cache = localStorage.getItem(`netherite_cache_${fileId}`);
      if (cache) return cache;
    }
    try {
      const fetched = await utils.notes.get.fetch({ id: fileId });
      return fetched ?? "";
    } catch (err) {
      console.warn(`Failed to fetch content for file ${fileId}:`, err);
      return "";
    }
  };

  const handleDownloadSingle = async (fileId: string, fileName: string) => {
    try {
      onToast?.(`Downloading ${fileName}…`);
      const content = await getFileContent(fileId);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast?.(`Downloaded ${fileName}`);
    } catch (err: any) {
      console.error("Download single failed:", err);
      onToast?.(`Failed to download ${fileName}`);
    }
  };

  const getDescendantsOfFolder = (
    folderId: string,
    currentPath = "",
  ): Array<{ item: DriveItem; relativePath: string }> => {
    const results: Array<{ item: DriveItem; relativePath: string }> = [];
    const children = notes.filter(
      (n) => n.parents && n.parents.includes(folderId),
    );
    for (const child of children) {
      const isFolder = child.mimeType === "application/vnd.google-apps.folder";
      const childPath = currentPath
        ? `${currentPath}/${child.name}`
        : child.name;
      if (isFolder) {
        results.push(...getDescendantsOfFolder(child.id, childPath));
      } else {
        results.push({ item: child, relativePath: childPath });
      }
    }
    return results;
  };

  const handleDownloadFolderAsZip = async (
    folderId: string,
    folderName: string,
  ) => {
    try {
      onToast?.(`Preparing ZIP for ${folderName}…`);
      const descendants = getDescendantsOfFolder(folderId);
      if (descendants.length === 0) {
        onToast?.(`Folder "${folderName}" is empty.`);
        return;
      }

      const zip = new JSZip();
      for (const { item, relativePath } of descendants) {
        const content = await getFileContent(item.id);
        zip.file(relativePath, content);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast?.(`Downloaded ${folderName}.zip`);
    } catch (err: any) {
      console.error("Folder zip download failed:", err);
      onToast?.(`Failed to download ${folderName}.zip`);
    }
  };

  const handleDownloadSelectionAsZip = async (ids: string[]) => {
    try {
      onToast?.(`Packaging ZIP for ${ids.length} items…`);
      const zip = new JSZip();
      const usedNames = new Map<string, number>();

      const getUniqueName = (name: string): string => {
        const count = usedNames.get(name) || 0;
        usedNames.set(name, count + 1);
        if (count === 0) return name;
        const lastDot = name.lastIndexOf(".");
        if (lastDot > 0) {
          const base = name.slice(0, lastDot);
          const ext = name.slice(lastDot);
          return `${base} (${count})${ext}`;
        }
        return `${name} (${count})`;
      };

      for (const id of ids) {
        const item = notes.find((n) => n.id === id);
        if (!item) continue;
        const isFolder = item.mimeType === "application/vnd.google-apps.folder";

        if (isFolder) {
          const descendants = getDescendantsOfFolder(item.id);
          for (const desc of descendants) {
            const content = await getFileContent(desc.item.id);
            zip.file(`${item.name}/${desc.relativePath}`, content);
          }
        } else {
          const content = await getFileContent(item.id);
          const uniqueName = getUniqueName(item.name);
          zip.file(uniqueName, content);
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `Netherite-Selection-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onToast?.("Downloaded ZIP archive");
    } catch (err: any) {
      console.error("Selection zip download failed:", err);
      onToast?.("Failed to download ZIP archive");
    }
  };

  // Clean minimal Notion page icon / drawing icon
  const getFileIcon = (name: string, mimeType?: string) => {
    if (
      mimeType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name)
    ) {
      return (
        <ImageIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      );
    }
    if (
      name.endsWith(".excalidraw") ||
      mimeType === "application/vnd.excalidraw+json"
    ) {
      return (
        <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
      );
    }
    if (
      name.endsWith(".apollon") ||
      name.endsWith(".uml") ||
      mimeType === "application/vnd.apollon+json"
    ) {
      return (
        <Network className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
      );
    }
    if (
      name.endsWith(".mmd") ||
      name.endsWith(".mermaid") ||
      mimeType === "text/vnd.mermaid"
    ) {
      return (
        <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
      );
    }
    if (
      name.endsWith(".tikz") ||
      name.endsWith(".tex") ||
      mimeType === "text/vnd.tikz"
    ) {
      return (
        <Activity className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
      );
    }
    return (
      <FileText className="text-muted-foreground/70 group-hover:text-foreground h-3.5 w-3.5 shrink-0 transition-colors" />
    );
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
            onContextMenu={(e) =>
              handleItemContextMenu(e, item.id, item.name, true)
            }
            className={`group flex cursor-pointer items-center justify-between rounded-md border-0 px-1.5 py-1 ring-0 transition-all select-none ${
              isTarget
                ? "bg-accent text-foreground"
                : selectedIds.size > 1 && isSelected
                  ? "bg-accent/60 text-foreground font-medium shadow-2xs"
                  : (() => {
                      const assignedColor = folderColors[item.id];
                      const colorDef = assignedColor
                        ? FOLDER_COLOR_PALETTE.find(
                            (c) => c.id === assignedColor,
                          )
                        : null;
                      return (
                        colorDef?.bgClass ||
                        "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      );
                    })()
            }`}
          >
            <div className="flex w-full items-center gap-1.5 truncate">
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(item.id, e);
                }}
                className="hover:bg-accent/80 rounded p-0.5 transition-colors"
              >
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </span>
              {(() => {
                const assignedColor = folderColors[item.id];
                const colorDef = assignedColor
                  ? FOLDER_COLOR_PALETTE.find((c) => c.id === assignedColor)
                  : null;
                const iconColor = colorDef?.iconClass;
                return isExpanded ? (
                  <FolderOpen
                    className={`h-3.5 w-3.5 shrink-0 ${iconColor || "text-foreground"}`}
                  />
                ) : (
                  <Folder
                    className={`h-3.5 w-3.5 shrink-0 ${iconColor || "text-muted-foreground"}`}
                  />
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
                <span className="text-foreground truncate font-medium">
                  {item.name.replace(/\.md$/i, "")}
                </span>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="border-border/40 mt-0.5 ml-2 space-y-0.5 border-l pl-3">
              {children.length === 0 ? (
                <div className="text-muted-foreground/60 px-2 py-1 text-[11px] italic">
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
      const isDrawing = item.name.endsWith(".excalidraw");
      const isUml =
        item.name.endsWith(".apollon") || item.name.endsWith(".uml");
      const isMermaid =
        item.name.endsWith(".mmd") || item.name.endsWith(".mermaid");
      const isTikz = item.name.endsWith(".tikz") || item.name.endsWith(".tex");
      const isImage =
        item.mimeType?.startsWith("image/") ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(item.name);
      const displayName = isImage
        ? item.name
        : item.name.replace(
            /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
            "",
          );

      return (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onClick={(e) => handleItemClick(e, item)}
          onContextMenu={(e) =>
            handleItemContextMenu(e, item.id, item.name, false)
          }
          className={`group flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 transition-all select-none ${
            selectedIds.size > 1 && isSelected
              ? "bg-accent/60 text-foreground ring-border/60 font-medium shadow-2xs ring-1"
              : isActive
                ? "bg-accent text-foreground font-semibold shadow-2xs"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          }`}
        >
          <div className="flex w-full items-center gap-2 truncate">
            {getFileIcon(item.name, item.mimeType)}
            {isEditing ? (
              <InlineRenameInput
                initialValue={displayName}
                onCommit={(newName) => {
                  if (isImage) {
                    onRenameNote(item.id, newName);
                  } else {
                    const clean = newName.replace(
                      /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
                      "",
                    );
                    const finalName = isDrawing
                      ? `${clean}.excalidraw`
                      : isUml
                        ? `${clean}.apollon`
                        : isMermaid
                          ? `${clean}.mmd`
                          : isTikz
                            ? `${clean}.tikz`
                            : `${clean}.md`;
                    onRenameNote(item.id, finalName);
                  }
                  if (setEditingId) setEditingId(null);
                }}
                onCancel={() => {
                  if (setEditingId) setEditingId(null);
                }}
              />
            ) : (
              <span className="truncate">{displayName}</span>
            )}
            {loadingNoteId === item.id && (
              <AppleSpinner
                size="xs"
                className="text-foreground ml-auto shrink-0"
              />
            )}
          </div>
        </div>
      );
    }
  };

  if (collapsed) {
    return (
      <aside
        ref={sidebarContainerRef}
        className="border-border hidden w-14 flex-col items-center justify-between border-r bg-[var(--sidebar-bg)] py-2.5 select-none sm:flex"
      >
        <div className="flex w-full flex-col items-center gap-3">
          {/* Top Window Drag Area with Traffic Lights */}
          <div
            className="flex w-full justify-center py-1"
            data-tauri-drag-region
          >
            <WindowControls />
          </div>

          <button
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors hover:bg-[var(--accent)]"
            title="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => onCreateNote()}
            className="bg-foreground text-background rounded-lg p-2 shadow-sm transition-all hover:opacity-90"
            title="New File (Ctrl+N)"
          >
            <Plus className="h-4 w-4" />
          </button>

          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className={`rounded-lg p-2 transition-all ${
                isCalendarActive
                  ? "bg-accent text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
              title="Google Calendar"
            >
              <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            </button>
          )}

          <div className="bg-border my-1 h-[1px] w-6" />

          <div className="flex flex-col gap-1.5">
            {notes
              .filter(
                (n) => n.mimeType !== "application/vnd.google-apps.folder",
              )
              .slice(0, 6)
              .map((file) => (
                <button
                  key={file.id}
                  onClick={() => onSelectNote(file.id)}
                  className={`rounded-lg p-2 transition-all ${
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
            className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onOpenSettings}
            className="hover:bg-accent text-muted-foreground hover:text-foreground rounded-lg p-2 transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <div
            className="cursor-default p-1"
            title={userSession?.user?.name || "Account"}
          >
            {userSession?.user?.image ? (
              <img
                src={userSession.user.image}
                alt={userSession?.user?.name || "User"}
                referrerPolicy="no-referrer"
                className="border-border/80 h-5 w-5 rounded-full border object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`bg-foreground text-background h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold uppercase ${
                userSession?.user?.image ? "hidden" : "flex"
              }`}
            >
              {userSession?.user?.name?.[0] || "U"}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="bg-background/80 animate-in fade-in fixed inset-0 z-40 backdrop-blur-sm duration-200 sm:hidden"
        onClick={onToggleCollapse}
      />

      <aside
        ref={sidebarContainerRef}
        onContextMenu={handleRootContextMenu}
        style={{ width: `${sidebarWidth}px` }}
        className={`border-border animate-in slide-in-from-left fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col border-r bg-[var(--sidebar-bg)] shadow-2xl duration-200 select-none sm:relative sm:shadow-none ${
          isResizing ? "transition-none select-none" : ""
        }`}
      >
        {/* Line 1: Top Bar with Mac Traffic Lights on Left & Workspace Action Icons on Right */}
        <div
          className="flex items-center justify-between gap-1 px-3 pt-3 pb-1.5"
          data-tauri-drag-region
        >
          <div className="flex shrink-0 items-center pl-0.5">
            <WindowControls />
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5"
            data-tauri-no-drag
          >
            <button
              onClick={() => onCreateNote()}
              disabled={isMutating}
              className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
              title="New Page (Ctrl+N)"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            {onCreateDrawing && (
              <button
                onClick={() => onCreateDrawing()}
                disabled={isMutating}
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
                title="New Whiteboard / Sketch"
              >
                <Palette className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              </button>
            )}
            {onCreateUml && (
              <button
                onClick={() => onCreateUml()}
                disabled={isMutating}
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
                title="New UML Diagram (Apollon)"
              >
                <Network className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              </button>
            )}
            {onCreateMermaid && (
              <button
                onClick={() => onCreateMermaid()}
                disabled={isMutating}
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
                title="New Mermaid Diagram"
              >
                <Workflow className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
              </button>
            )}
            {onCreateTikz && (
              <button
                onClick={() => onCreateTikz()}
                disabled={isMutating}
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
                title="New TikZ LaTeX Diagram"
              >
                <Activity className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              </button>
            )}
            <button
              onClick={() => onCreateFolder()}
              disabled={isMutating}
              className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
              title="New Folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            {onOpenCalendar && (
              <button
                onClick={onOpenCalendar}
                className={`hover:bg-accent/60 cursor-pointer rounded p-1 transition-colors ${
                  isCalendarActive
                    ? "bg-accent text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Google Calendar"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              </button>
            )}
            {onToggleDiff && (
              <button
                onClick={onToggleDiff}
                className={`hover:bg-accent/60 cursor-pointer rounded p-1 transition-colors ${
                  isDiffOpen
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Git Diff Inspector (Ctrl+Shift+D)"
              >
                <GitCompare className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => {
                if (onDeepSync) {
                  onDeepSync();
                } else if (onManualSync) {
                  onManualSync();
                } else {
                  utils.notes.list.invalidate();
                }
              }}
              disabled={isSyncing || isDeepSyncing}
              className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors disabled:opacity-50"
              title="Deep Sync & Repair Drive Workspace"
            >
              <RotateCw
                className={`h-3.5 w-3.5 ${isSyncing || isDeepSyncing ? "text-foreground animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Line 2: Full Width Workspace Title (Below Top Bar) */}
        <div className="border-border/40 flex items-center justify-between border-b px-3 py-2">
          <div className="flex w-full min-w-0 items-center gap-2.5">
            <NetheriteLogo className="text-foreground h-5 w-auto shrink-0" />
            <span className="text-foreground truncate text-xs font-semibold tracking-tight sm:text-sm">
              {userSession?.user?.name
                ? `${userSession.user.name.split(" ")[0]}'s Notes`
                : "Netherite"}
            </span>
            {(isMutating || isSyncing || isDeepSyncing) && (
              <AppleSpinner
                size="xs"
                className="text-muted-foreground ml-auto shrink-0"
              />
            )}
          </div>
        </div>

        {/* Quick Filter Search */}
        <div
          className="border-border/30 space-y-1.5 border-b p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="relative cursor-pointer"
            onClick={() => {
              if (onOpenGlobalSearch) onOpenGlobalSearch();
            }}
          >
            <Search className="text-muted-foreground/70 absolute top-2 left-2.5 h-3.5 w-3.5" />
            <input
              type="text"
              placeholder="Search notes (Ctrl+K)..."
              value={searchQuery}
              readOnly={!!onOpenGlobalSearch}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-accent/40 hover:bg-accent/60 focus:border-border text-foreground placeholder:text-muted-foreground/60 w-full cursor-pointer rounded-md border border-transparent py-1 pr-8 pl-7 font-sans text-xs transition-colors focus:outline-none"
            />
            <kbd className="text-muted-foreground/80 bg-muted/60 border-border/40 pointer-events-none absolute top-1.5 right-2 hidden items-center rounded border px-1.5 py-0.5 font-mono text-[9px] sm:inline-flex">
              ⌘K
            </kbd>
          </div>

          {/* Apple Pinned Item: Google Calendar Studio */}
          {onOpenCalendar && (
            <button
              onClick={onOpenCalendar}
              className={`flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-all ${
                isCalendarActive
                  ? "border border-blue-500/30 bg-blue-500/15 font-semibold text-blue-600 shadow-2xs dark:text-blue-400"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                <span className="truncate">Google Calendar</span>
              </div>
            </button>
          )}
        </div>

        {/* Multi-Select Action Banner */}
        {selectedIds.size > 1 && (
          <div className="bg-accent/90 border-border/80 animate-in fade-in slide-in-from-top-1 mx-2 my-1 flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs shadow-sm duration-150">
            <span className="text-foreground text-[11px] font-semibold">
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
                className="flex items-center gap-1 rounded bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-500 transition-colors hover:bg-red-500/25"
                title="Delete selected items (Del)"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-muted-foreground hover:text-foreground hover:bg-background/40 rounded px-1.5 py-0.5 text-[11px] transition-colors"
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
            className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 font-bold transition-all ${(() => {
              const rootColor = folderColors["root"];
              const colorDef = rootColor
                ? FOLDER_COLOR_PALETTE.find((c) => c.id === rootColor)
                : null;
              return colorDef?.bgClass || "text-foreground hover:bg-accent/40";
            })()}`}
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${
                expandedFolders["root"] ? "rotate-90" : ""
              }`}
            />
            {(() => {
              const rootColor = folderColors["root"];
              const colorDef = rootColor
                ? FOLDER_COLOR_PALETTE.find((c) => c.id === rootColor)
                : null;
              const iconColor = colorDef?.iconClass;
              return expandedFolders["root"] ? (
                <FolderOpen
                  className={`h-4 w-4 shrink-0 ${iconColor || "text-foreground"}`}
                />
              ) : (
                <Folder
                  className={`h-4 w-4 shrink-0 ${iconColor || "text-muted-foreground"}`}
                />
              );
            })()}
            <span className="truncate">netherite</span>
          </div>

          {/* Directory Items List */}
          {expandedFolders["root"] && (
            <div className="border-border/40 mt-0.5 ml-2 space-y-0.5 border-l pl-3">
              {rootItems.length === 0 ? (
                <div className="text-muted-foreground px-2 py-4 text-center text-[11px]">
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
            className="bg-card border-border animate-in fade-in zoom-in-95 fixed z-50 w-48 rounded-lg border py-1 text-xs shadow-2xl duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.isRootArea ? (
              <>
                <button
                  onClick={() => {
                    onCreateNote();
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Plus className="h-3.5 w-3.5" /> New Page
                </button>
                {onCreateDrawing && (
                  <button
                    onClick={() => {
                      onCreateDrawing();
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Palette className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />{" "}
                    New Whiteboard / Sketch
                  </button>
                )}
                {onCreateUml && (
                  <button
                    onClick={() => {
                      onCreateUml();
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Network className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />{" "}
                    New UML Diagram
                  </button>
                )}
                {onCreateMermaid && (
                  <button
                    onClick={() => {
                      onCreateMermaid();
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Workflow className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />{" "}
                    New Mermaid Diagram
                  </button>
                )}
                {onCreateTikz && (
                  <button
                    onClick={() => {
                      onCreateTikz();
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Activity className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />{" "}
                    New TikZ LaTeX Diagram
                  </button>
                )}
                <button
                  onClick={() => {
                    onCreateFolder();
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> New Folder
                </button>
                <div className="bg-border my-1 h-[1px]" />
                {/* Root Folder Color Picker */}
                <div className="border-border/40 border-b px-3 py-2">
                  <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-[11px] font-medium">
                    <span>Folder Color</span>
                    {folderColors["root"] && (
                      <button
                        onClick={() => {
                          if (onSetFolderColor) onSetFolderColor("root", null);
                          setContextMenu(null);
                        }}
                        className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 py-0.5">
                    {FOLDER_COLOR_PALETTE.map((c) => {
                      const isSelected =
                        (folderColors["root"] || "default") === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            if (onSetFolderColor)
                              onSetFolderColor(
                                "root",
                                c.id === "default" ? null : c.id,
                              );
                            setContextMenu(null);
                          }}
                          className={`h-5 w-5 rounded-full ${c.dotColor} flex cursor-pointer items-center justify-center transition-transform hover:scale-110 ${
                            isSelected
                              ? "ring-foreground ring-offset-background scale-105 ring-2 ring-offset-1"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {c.id === "default" && (
                            <span className="bg-background h-1.5 w-1.5 rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (onManualSync) {
                      onManualSync();
                    } else {
                      utils.notes.list.invalidate();
                    }
                    setContextMenu(null);
                  }}
                  disabled={isSyncing}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                  />{" "}
                  Refresh Explorer
                </button>
              </>
            ) : selectedIds.size > 1 ? (
              <>
                <div className="text-muted-foreground border-border/40 border-b px-3 py-1.5 text-[11px] font-semibold">
                  {selectedIds.size} items selected
                </div>
                <button
                  onClick={() => {
                    void handleDownloadSelectionAsZip(Array.from(selectedIds));
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left font-medium"
                >
                  <Archive className="text-primary h-3.5 w-3.5" /> Download as
                  ZIP ({selectedIds.size} items)
                </button>
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
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-medium text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete {selectedIds.size}{" "}
                  items{" "}
                  <span className="ml-auto font-mono text-[10px] text-red-400">
                    Del
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSelectedIds(new Set());
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-muted-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  Deselect all{" "}
                  <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                    Esc
                  </span>
                </button>
              </>
            ) : contextMenu.isFolder ? (
              <>
                {/* Folder Color Picker */}
                <div className="border-border/40 border-b px-3 py-2">
                  <div className="text-muted-foreground mb-1.5 flex items-center justify-between text-[11px] font-medium">
                    <span>Folder Color</span>
                    {contextMenu.itemId && folderColors[contextMenu.itemId] && (
                      <button
                        onClick={() => {
                          if (contextMenu.itemId && onSetFolderColor) {
                            onSetFolderColor(contextMenu.itemId, null);
                          }
                          setContextMenu(null);
                        }}
                        className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 py-0.5">
                    {FOLDER_COLOR_PALETTE.map((c) => {
                      const isSelected =
                        (contextMenu.itemId
                          ? folderColors[contextMenu.itemId] || "default"
                          : "default") === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.name}
                          onClick={() => {
                            if (contextMenu.itemId && onSetFolderColor) {
                              onSetFolderColor(
                                contextMenu.itemId,
                                c.id === "default" ? null : c.id,
                              );
                            }
                            setContextMenu(null);
                          }}
                          className={`h-5 w-5 rounded-full ${c.dotColor} flex cursor-pointer items-center justify-center transition-transform hover:scale-110 ${
                            isSelected
                              ? "ring-foreground ring-offset-background scale-105 ring-2 ring-offset-1"
                              : "opacity-80 hover:opacity-100"
                          }`}
                        >
                          {c.id === "default" && (
                            <span className="bg-background h-1.5 w-1.5 rounded-full" />
                          )}
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
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Plus className="h-3.5 w-3.5" /> New Page in Folder
                </button>
                {onCreateDrawing && (
                  <button
                    onClick={() => {
                      onCreateDrawing(contextMenu.itemId);
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Palette className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />{" "}
                    New Sketch in Folder
                  </button>
                )}
                {onCreateUml && (
                  <button
                    onClick={() => {
                      onCreateUml(contextMenu.itemId);
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Network className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />{" "}
                    New UML in Folder
                  </button>
                )}
                {onCreateMermaid && (
                  <button
                    onClick={() => {
                      onCreateMermaid(contextMenu.itemId);
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Workflow className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />{" "}
                    New Mermaid in Folder
                  </button>
                )}
                {onCreateTikz && (
                  <button
                    onClick={() => {
                      onCreateTikz(contextMenu.itemId);
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <Activity className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />{" "}
                    New TikZ in Folder
                  </button>
                )}
                <button
                  onClick={() => {
                    onCreateFolder(contextMenu.itemId);
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <FolderPlus className="h-3.5 w-3.5" /> New Folder in Folder
                </button>
                <button
                  onClick={() => {
                    if (contextMenu.itemId && contextMenu.itemName) {
                      startInlineEditing(
                        contextMenu.itemId,
                        contextMenu.itemName,
                      );
                    }
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Rename Folder
                </button>
                <button
                  onClick={() => {
                    if (contextMenu.itemId && contextMenu.itemName) {
                      void handleDownloadFolderAsZip(
                        contextMenu.itemId,
                        contextMenu.itemName,
                      );
                    }
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Archive className="text-primary h-3.5 w-3.5" /> Download as
                  ZIP
                </button>
                <div className="bg-border my-1 h-[1px]" />
                <button
                  onClick={() =>
                    contextMenu.itemId && onDeleteNote(contextMenu.itemId)
                  }
                  className="hover:bg-accent flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Folder
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
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Rename{" "}
                  <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                    F2
                  </span>
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.itemName) {
                      navigator.clipboard.writeText(contextMenu.itemName);
                    }
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Name
                </button>

                <button
                  onClick={() => {
                    if (contextMenu.itemId && contextMenu.itemName) {
                      void handleDownloadSingle(
                        contextMenu.itemId,
                        contextMenu.itemName,
                      );
                    }
                    setContextMenu(null);
                  }}
                  className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left"
                >
                  <Download className="text-primary h-3.5 w-3.5" /> Download
                </button>

                {onOpenVersionHistory && (
                  <button
                    onClick={() => {
                      if (contextMenu.itemId && contextMenu.itemName) {
                        onOpenVersionHistory(
                          contextMenu.itemId,
                          contextMenu.itemName,
                        );
                      }
                      setContextMenu(null);
                    }}
                    className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left"
                  >
                    <History className="text-primary h-3.5 w-3.5" /> Version
                    History
                    <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                      Ctrl+H
                    </span>
                  </button>
                )}

                <div className="bg-border my-1 h-[1px]" />

                <button
                  onClick={() =>
                    contextMenu.itemId && onDeleteNote(contextMenu.itemId)
                  }
                  className="hover:bg-accent flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete{" "}
                  <span className="ml-auto font-mono text-[10px] text-red-400">
                    Del
                  </span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer: User Account & Settings */}
        <div className="border-border bg-card/40 flex items-center justify-between border-t p-2">
          <div className="flex min-w-0 items-center gap-2">
            {userSession?.user?.image ? (
              <img
                src={userSession.user.image}
                alt={userSession?.user?.name || "User"}
                referrerPolicy="no-referrer"
                className="border-border/80 h-6 w-6 shrink-0 rounded-full border object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`bg-foreground text-background h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold uppercase ${
                userSession?.user?.image ? "hidden" : "flex"
              }`}
            >
              {userSession?.user?.name?.[0] || "U"}
            </div>
            <div className="text-foreground truncate text-xs font-medium">
              {userSession?.user?.name || "User"}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-accent text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
              title="Toggle Light/Dark Mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={onOpenSettings}
              className="hover:bg-accent text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hover:bg-accent text-muted-foreground rounded p-1 transition-colors hover:text-red-500"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Draggable Resize Handle */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          onDoubleClick={() => {
            setSidebarWidth(260);
            localStorage.setItem("netherite_sidebar_width", "260");
          }}
          title="Drag to resize sidebar • Double-click to reset"
          className="hover:bg-primary/50 group/resizer absolute top-0 right-[-3px] z-50 hidden h-full w-2 cursor-col-resize transition-colors sm:block"
        >
          <div className="group-hover/resizer:bg-primary/80 mx-auto h-full w-[1px]" />
        </div>
      </aside>
    </>
  );
}
