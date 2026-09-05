"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar, type DriveItem } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";
import { Editor } from "~/components/editor/Editor";
import { SettingsModal } from "./SettingsModal";
import { OutlineSidebar, type HeadingItem } from "./OutlineSidebar";
import { DiffModal } from "./DiffModal";
import { MobileBottomBar } from "./MobileBottomBar";
import { computeLineDiff, saveChangelogEntry, type ChangelogEntry } from "./diffUtils";
import { LandingPage } from "~/components/landing/LandingPage";
import { api } from "~/trpc/react";
import {
  FileText,
  Plus,
  Sparkles,
  LogIn,
  X,
  GitCompare,
  ChevronRight,
  Columns,
  CheckCircle2,
  Search,
} from "lucide-react";
import { signIn } from "next-auth/react";

interface WorkspaceLayoutProps {
  session: any;
  initialNotes?: DriveItem[];
  initialNoteId?: string;
  initialContent?: string;
  initialMetadata?: {
    version?: number;
    folderColors?: Record<string, string>;
    [key: string]: any;
  };
}

export function WorkspaceLayout({
  session,
  initialNotes = [],
  initialNoteId,
  initialContent = "",
  initialMetadata,
}: WorkspaceLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isOutlineOpen, setIsOutlineOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1280;
    }
    return false;
  });
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [editorFont, setEditorFont] = useState<"sans" | "serif" | "mono">("sans");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Local Optimistic Notes State for 0ms Latency
  const [localNotes, setLocalNotes] = useState<DriveItem[]>(() => {
    return (initialNotes || [])
      .map((n: any) => ({
        id: n.id || "",
        name: n.name || "Untitled.md",
        modifiedTime: n.modifiedTime || new Date().toISOString(),
        mimeType: n.mimeType,
        parents: n.parents,
      }))
      .filter((n) => Boolean(n.id) && !n.name?.startsWith("."));
  });

  // Folder Coloring & Workspace Metadata State (Persisted in .netherite.json in Google Drive)
  const [folderColors, setFolderColors] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("netherite_workspace_meta");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.folderColors) return parsed.folderColors;
        }
      } catch (e) {}
    }
    return initialMetadata?.folderColors || {};
  });

  const { data: serverMeta } = api.notes.getMetadata.useQuery(undefined, {
    enabled: !!session?.user,
    staleTime: 60000,
  });

  useEffect(() => {
    if (serverMeta?.folderColors) {
      setFolderColors(serverMeta.folderColors);
      if (typeof window !== "undefined") {
        localStorage.setItem("netherite_workspace_meta", JSON.stringify(serverMeta));
      }
    }
  }, [serverMeta]);

  const saveMetaMutation = api.notes.saveMetadata.useMutation();

  const handleSetFolderColor = (folderId: string, color: string | null) => {
    setFolderColors((prev) => {
      const next = { ...prev };
      if (!color) {
        delete next[folderId];
      } else {
        next[folderId] = color;
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("netherite_workspace_meta", JSON.stringify({ folderColors: next }));
      }
      saveMetaMutation.mutate({ folderColors: next });
      return next;
    });
  };

  // Multi-Tab & Split View State: strictly ensure folders and dotfiles are never opened as notes
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => {
    const firstFile = (initialNotes || []).find(
      (n) => n.mimeType !== "application/vnd.google-apps.folder" && !n.name?.startsWith(".") && Boolean(n.id)
    );
    const initialItem = (initialNotes || []).find((n) => n.id === initialNoteId);
    const validInitialId =
      initialItem &&
      initialItem.mimeType !== "application/vnd.google-apps.folder" &&
      !initialItem.name?.startsWith(".") &&
      !initialNoteId?.startsWith("temp-")
        ? initialNoteId
        : firstFile?.id;
    return validInitialId ? [validInitialId] : [];
  });

  const [activeTabId, setActiveTabId] = useState<string | undefined>(() => {
    const firstFile = (initialNotes || []).find(
      (n) => n.mimeType !== "application/vnd.google-apps.folder" && !n.name?.startsWith(".") && Boolean(n.id)
    );
    const initialItem = (initialNotes || []).find((n) => n.id === initialNoteId);
    return initialItem &&
      initialItem.mimeType !== "application/vnd.google-apps.folder" &&
      !initialItem.name?.startsWith(".") &&
      !initialNoteId?.startsWith("temp-")
      ? initialNoteId
      : firstFile?.id;
  });

  // Responsive mobile sidebar collapse on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarCollapsed(true);
      setIsOutlineOpen(false);
    }
  }, []);

  // Filter out any folders from openTabIds or activeTabId
  useEffect(() => {
    if (localNotes.length > 0) {
      const folderIds = new Set(
        localNotes.filter((n) => n.mimeType === "application/vnd.google-apps.folder").map((n) => n.id)
      );
      if (folderIds.size > 0) {
        setOpenTabIds((prev) => {
          const filtered = prev.filter((id) => !folderIds.has(id));
          return filtered.length !== prev.length ? filtered : prev;
        });

        if (activeTabId && folderIds.has(activeTabId)) {
          const firstFile = localNotes.find(
            (n) => n.mimeType !== "application/vnd.google-apps.folder" && Boolean(n.id)
          );
          if (firstFile) {
            openFileInTab(firstFile.id);
          } else {
            setActiveTabId(undefined);
            setNoteContent("");
          }
        }
      }
    }
  }, [localNotes, activeTabId]);

  const [isSplitView, setIsSplitView] = useState<boolean>(false);
  const [splitTabId, setSplitTabId] = useState<string | undefined>(undefined);

  // Drag & Drop Feedback State
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [isOverSplitTarget, setIsOverSplitTarget] = useState(false);

  // Note Content State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noteContent, setNoteContent] = useState<string>(initialContent);
  const [lastSavedContent, setLastSavedContent] = useState<string>(initialContent);
  const [noteTitle, setNoteTitle] = useState<string>("");

  const [splitNoteContent, setSplitNoteContent] = useState<string>("");

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const utils = api.useUtils();

  // Cached tRPC query for Google Drive syncing (staleTime = 60000ms)
  const { data: notesData } = api.notes.list.useQuery(undefined, {
    initialData: initialNotes as any,
    enabled: !!session?.user,
    staleTime: 60000,
  });

  // Sync Google Drive query into localNotes array
  useEffect(() => {
    if (notesData) {
      const serverItems: DriveItem[] = notesData
        .map((n: any) => ({
          id: n.id || "",
          name: n.name || "Untitled.md",
          modifiedTime: n.modifiedTime || new Date().toISOString(),
          mimeType: n.mimeType,
          parents: n.parents,
        }))
        .filter((n) => Boolean(n.id) && !n.name?.startsWith("."));

      setLocalNotes((prev) => {
        // Keep temp items that haven't finished server creation yet
        const tempItems = prev.filter((p) => p.id.startsWith("temp-"));
        return [...tempItems, ...serverItems];
      });
    }
  }, [notesData]);

  // Primary Active Note Content Query
  const { data: fetchedContent, isLoading: isLoadingContent } = api.notes.get.useQuery(
    { id: activeTabId! },
    {
      enabled: !!session?.user && !!activeTabId && !activeTabId.startsWith("temp-"),
      staleTime: 300000,
    }
  );

  // Split Active Note Content Query
  const { data: fetchedSplitContent } = api.notes.get.useQuery(
    { id: splitTabId! },
    {
      enabled: !!session?.user && !!splitTabId && !splitTabId.startsWith("temp-") && isSplitView,
      staleTime: 300000,
    }
  );

  const saveMutation = api.notes.save.useMutation({
    onMutate: () => setIsSaving(true),
    onSuccess: () => {
      setIsSaving(false);
      setLastSavedContent(noteContent);
      if (activeTabId && typeof window !== "undefined") {
        localStorage.removeItem(`netherite_draft_${activeTabId}`);
      }
    },
    onError: () => setIsSaving(false),
  });

  const renameMutation = api.notes.rename.useMutation({
    onSuccess: (_, variables) => {
      utils.notes.list.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.map((item: any) =>
          item.id === variables.id ? { ...item, name: variables.newName } : item
        );
      });
    },
  });

  const createMutation = api.notes.create.useMutation();
  const createFolderMutation = api.notes.createFolder.useMutation();
  const deleteMutation = api.notes.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.notes.list.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.filter((item: any) => item.id !== variables.id);
      });
    },
  });
  const moveMutation = api.notes.move.useMutation({
    onSuccess: (_, variables) => {
      utils.notes.list.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.map((item: any) =>
          item.id === variables.fileId
            ? { ...item, parents: [variables.targetFolderId] }
            : item
        );
      });
    },
  });
  const uploadAssetMutation = api.notes.uploadAsset.useMutation();

  useEffect(() => {
    if (!activeTabId) {
      setNoteContent("");
      setLastSavedContent("");
      setNoteTitle("");
      return;
    }
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(`netherite_draft_${activeTabId}`);
      if (draft !== null) {
        setNoteContent(draft);
        if (fetchedContent !== undefined) {
          setLastSavedContent(fetchedContent);
        }
        return;
      }
    }
    if (fetchedContent !== undefined) {
      setNoteContent(fetchedContent);
      setLastSavedContent(fetchedContent);
    }
  }, [fetchedContent, activeTabId]);

  useEffect(() => {
    if (fetchedSplitContent !== undefined) {
      setSplitNoteContent(fetchedSplitContent);
    }
  }, [fetchedSplitContent, splitTabId]);

  useEffect(() => {
    if (activeTabId && localNotes.length > 0) {
      const current = localNotes.find((n) => n.id === activeTabId);
      if (current && current.name) {
        setNoteTitle(current.name);
      }
    }
  }, [activeTabId, localNotes]);

  // Manual save ONLY: No background autosave timer and NO mutation on keystroke/cleanup!
  const unsavedRef = useRef(false);
  unsavedRef.current = !!activeTabId && !activeTabId.startsWith("temp-") && noteContent !== lastSavedContent;

  const pendingImagesRef = useRef<Map<string, File>>(new Map());
  const activeEditorRef = useRef<any>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        if (base64) resolve(base64);
        else reject(new Error("Failed to extract base64"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleManualSave = async () => {
    if (!activeTabId || !session?.user || activeTabId.startsWith("temp-")) return;

    let contentToSave = noteContent;
    let hasNewUploads = false;

    // Check if any pending local images are actually present in the saved note
    if (pendingImagesRef.current.size > 0) {
      const entries = Array.from(pendingImagesRef.current.entries());
      for (const [blobUrl, file] of entries) {
        if (contentToSave.includes(blobUrl)) {
          // User kept the image in the note! Upload to Drive now
          try {
            const base64 = await fileToBase64(file);
            const res = await uploadAssetMutation.mutateAsync({
              fileName: file.name,
              mimeType: file.type || "image/png",
              base64Data: base64,
            });

            if (res?.url) {
              contentToSave = contentToSave.replaceAll(blobUrl, res.url);
              hasNewUploads = true;

              // Update TipTap editor image node src from blobUrl to driveUrl
              if (activeEditorRef.current) {
                const editor = activeEditorRef.current;
                const { tr } = editor.state;
                let found = false;
                editor.state.doc.descendants((node: any, pos: number) => {
                  if (node.type.name === "image" && node.attrs.src === blobUrl) {
                    tr.setNodeMarkup(pos, undefined, {
                      ...node.attrs,
                      src: res.url,
                    });
                    found = true;
                  }
                });
                if (found) {
                  editor.view.dispatch(tr);
                }
              }
            }
          } catch (err) {
            console.error("Asset upload failed on save:", err);
          }
        }
        // Always revoke and cleanup local blob URL
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
        pendingImagesRef.current.delete(blobUrl);
      }

      if (hasNewUploads) {
        setNoteContent(contentToSave);
      }
    }

    const diff = computeLineDiff(lastSavedContent, contentToSave);
    if (!diff.hasChanges && !saveMutation.isPending) return;

    const currentNoteItem = localNotes.find((n) => n.id === activeTabId);
    const logEntry: ChangelogEntry = {
      id: `log-${Date.now()}`,
      noteId: activeTabId,
      noteTitle: currentNoteItem?.name || "Untitled.md",
      timestamp: Date.now(),
      dateStr: new Date().toLocaleTimeString(),
      additions: diff.additions,
      deletions: diff.deletions,
      summary: diff.summary,
      syncedToDrive: true,
    };
    saveChangelogEntry(logEntry);

    saveMutation.mutate({ id: activeTabId, content: contentToSave });
  };

  // 100% INSTANT OPTIMISTIC FILE CREATION (0ms response time!)
  const handleCreateFile = async (parentId?: string) => {
    const tempId = `temp-${Date.now()}`;
    const defaultName = `Untitled-${Date.now().toString().slice(-4)}.md`;

    const newItem: DriveItem = {
      id: tempId,
      name: defaultName,
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    // Update local state immediately
    setLocalNotes((prev) => [newItem, ...prev]);
    openFileInTab(tempId);
    setNoteContent("");
    setLastSavedContent("");
    setEditingId(tempId); // Focus inline name edit immediately!

    try {
      const realNote = await createMutation.mutateAsync({
        name: defaultName,
        parentId,
      });
      if (realNote?.id) {
        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter((n: any) => n.id !== tempId && n.id !== realNote.id);
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: realNote.id!, parents: realNote.parents }
              : item
          )
        );
        setOpenTabIds((prev) => prev.map((id) => (id === tempId ? realNote.id! : id)));
        setActiveTabId((current) => (current === tempId ? realNote.id! : current));
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background file creation failed:", err);
    }
  };

  // 100% INSTANT OPTIMISTIC FOLDER CREATION
  const handleCreateFolder = async (parentId?: string) => {
    const tempId = `temp-folder-${Date.now()}`;
    const folderName = `New Folder-${Date.now().toString().slice(-4)}`;

    const newFolder: DriveItem = {
      id: tempId,
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    setLocalNotes((prev) => [newFolder, ...prev]);
    setEditingId(tempId); // Focus inline name edit immediately!

    try {
      const realFolder = await createFolderMutation.mutateAsync({
        name: folderName,
        parentId,
      });
      if (realFolder?.id) {
        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter((n: any) => n.id !== tempId && n.id !== realFolder.id);
          return [realFolder, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: realFolder.id!, parents: realFolder.parents }
              : item
          )
        );
        setEditingId(realFolder.id!);
      }
    } catch (err) {
      console.error("Background folder creation failed:", err);
    }
  };

  // 100% INSTANT OPTIMISTIC RENAME
  const handleRenameFile = (id: string, newName: string) => {
    if (!id || !newName.trim()) return;

    const targetItem = localNotes.find((n) => n.id === id);
    const isFolder = targetItem?.mimeType === "application/vnd.google-apps.folder";
    const cleanName = newName.replace(/\.md$/i, "");
    const finalName = isFolder ? cleanName : `${cleanName}.md`;

    setLocalNotes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: finalName } : item))
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) => (item.id === id ? { ...item, name: finalName } : item));
    });

    if (activeTabId === id) {
      setNoteTitle(finalName);
    }

    if (!id.startsWith("temp-")) {
      renameMutation.mutate({ id, newName: finalName });
    }
  };

  // 100% INSTANT OPTIMISTIC DELETE
  const handleDeleteFile = (id: string) => {
    setLocalNotes((prev) => prev.filter((item) => item.id !== id));
    setOpenTabIds((prev) => prev.filter((t) => t !== id));
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.filter((item: any) => item.id !== id);
    });

    if (activeTabId === id) {
      const remaining = openTabIds.filter((t) => t !== id);
      if (remaining.length === 0) {
        setActiveTabId(undefined);
        setNoteContent("");
        setLastSavedContent("");
        setNoteTitle("");
      } else {
        const nextTab = remaining[remaining.length - 1];
        if (nextTab) {
          openFileInTab(nextTab);
        }
      }
    }

    if (!id.startsWith("temp-")) {
      deleteMutation.mutate({ id });
    }
  };

  // 100% INSTANT OPTIMISTIC BATCH DELETE
  const handleDeleteMultiple = async (ids: string[]) => {
    if (!ids.length) return;
    const idsSet = new Set(ids);

    setLocalNotes((prev) => prev.filter((item) => !idsSet.has(item.id)));
    setOpenTabIds((prev) => prev.filter((t) => !idsSet.has(t)));
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.filter((item: any) => !idsSet.has(item.id));
    });

    if (activeTabId && idsSet.has(activeTabId)) {
      const remaining = openTabIds.filter((t) => !idsSet.has(t));
      if (remaining.length === 0) {
        setActiveTabId(undefined);
        setNoteContent("");
        setLastSavedContent("");
        setNoteTitle("");
      } else {
        const nextTab = remaining[remaining.length - 1];
        if (nextTab) {
          openFileInTab(nextTab);
        }
      }
    }

    const realIds = ids.filter((id) => !id.startsWith("temp-"));
    await Promise.allSettled(realIds.map((id) => deleteMutation.mutateAsync({ id })));
  };

  // 100% INSTANT OPTIMISTIC MOVE TO FOLDER
  const handleMoveItem = (fileId: string, targetFolderId: string) => {
    setLocalNotes((prev) =>
      prev.map((item) =>
        item.id === fileId ? { ...item, parents: [targetFolderId] } : item
      )
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) =>
        item.id === fileId ? { ...item, parents: [targetFolderId] } : item
      );
    });

    if (!fileId.startsWith("temp-")) {
      moveMutation.mutate({ fileId, targetFolderId });
    }
  };

  // 100% INSTANT OPTIMISTIC BATCH MOVE
  const handleMoveMultiple = async (ids: string[], targetFolderId: string) => {
    if (!ids.length) return;
    const idsSet = new Set(ids);

    setLocalNotes((prev) =>
      prev.map((item) =>
        idsSet.has(item.id) ? { ...item, parents: [targetFolderId] } : item
      )
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) =>
        idsSet.has(item.id) ? { ...item, parents: [targetFolderId] } : item
      );
    });

    const realIds = ids.filter((id) => !id.startsWith("temp-"));
    await Promise.allSettled(
      realIds.map((id) => moveMutation.mutateAsync({ fileId: id, targetFolderId }))
    );
  };

  const openFileInTab = (fileId: string) => {
    const item = localNotes.find((n) => n.id === fileId);
    if (item?.mimeType === "application/vnd.google-apps.folder") return;

    if (!openTabIds.includes(fileId)) {
      setOpenTabIds([...openTabIds, fileId]);
    }

    // Hydrate note content immediately from localStorage draft or query cache
    let contentToSet = "";
    if (typeof window !== "undefined") {
      const draft = localStorage.getItem(`netherite_draft_${fileId}`);
      if (draft !== null) {
        contentToSet = draft;
      }
    }
    if (!contentToSet) {
      const cached = utils.notes.get.getData({ id: fileId });
      if (typeof cached === "string") {
        contentToSet = cached;
      }
    }
    setNoteContent(contentToSet);
    setLastSavedContent(contentToSet);
    setActiveTabId(fileId);
  };

  const closeTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const closedIndex = openTabIds.indexOf(fileId);
    const updated = openTabIds.filter((id) => id !== fileId);
    setOpenTabIds(updated);

    if (activeTabId === fileId) {
      if (updated.length === 0) {
        setActiveTabId(undefined);
        setNoteContent("");
        setLastSavedContent("");
        setNoteTitle("");
      } else {
        const nextIndex = Math.min(closedIndex, updated.length - 1);
        const nextTabId = updated[nextIndex >= 0 ? nextIndex : 0];
        if (nextTabId) {
          openFileInTab(nextTabId);
        }
      }
    }

    if (splitTabId === fileId) {
      const remainingSplit = updated.find((id) => id !== activeTabId);
      setSplitTabId(remainingSplit);
      if (!remainingSplit) {
        setIsSplitView(false);
      }
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const localUrl = URL.createObjectURL(file);
    pendingImagesRef.current.set(localUrl, file);
    return localUrl;
  };

  // Extract headings from active document for Outline sidebar
  const getHeadings = (content: string): HeadingItem[] => {
    if (!content) return [];
    const headings: HeadingItem[] = [];

    // 1. Match HTML headings <h1>..<h6>
    const htmlRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    let index = 0;

    while ((match = htmlRegex.exec(content)) !== null) {
      const level = parseInt(match[1] || "1", 10);
      const text = (match[2] || "").replace(/<[^>]*>/g, "").trim();
      if (text) {
        headings.push({
          id: `heading-html-${index++}`,
          text,
          level,
        });
      }
    }

    // 2. Match Markdown headings # .. ######
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      const mdMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (mdMatch && mdMatch[1] && mdMatch[2]) {
        const text = mdMatch[2].replace(/<[^>]*>/g, "").trim();
        if (text && !headings.some((h) => h.text === text)) {
          headings.push({
            id: `heading-md-${idx}`,
            text,
            level: mdMatch[1].length,
          });
        }
      }
    });

    return headings;
  };

  const documentHeadings = getHeadings(noteContent);

  // Unauthenticated Landing Page
  if (!session?.user) {
    return <LandingPage />;
  }

  const currentNote = localNotes.find((n) => n.id === activeTabId);
  const currentSplitNote = localNotes.find((n) => n.id === splitTabId);
  const liveDiff = computeLineDiff(lastSavedContent, noteContent);
  const isDirty = liveDiff.hasChanges;

  const handleExportMarkdown = () => {
    const blob = new Blob([noteContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = noteTitle || "note.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      {/* VS Code Style Left Sidebar */}
      <Sidebar
        userSession={session}
        notes={localNotes}
        activeNoteId={activeTabId}
        onSelectNote={(id) => openFileInTab(id)}
        onCreateNote={handleCreateFile}
        onCreateFolder={handleCreateFolder}
        onRenameNote={handleRenameFile}
        onDeleteNote={handleDeleteFile}
        onDeleteMultiple={handleDeleteMultiple}
        onMoveItem={handleMoveItem}
        onMoveMultiple={handleMoveMultiple}
        onOpenSettings={() => setIsSettingsOpen(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        editingId={editingId}
        setEditingId={setEditingId}
        folderColors={folderColors}
        onSetFolderColor={handleSetFolderColor}
        isMutating={
          createMutation.isPending ||
          renameMutation.isPending ||
          deleteMutation.isPending ||
          createFolderMutation.isPending ||
          moveMutation.isPending
        }
      />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <HeaderBar
          noteTitle={activeTabId && currentNote ? currentNote.name : ""}
          isSaving={isSaving}
          isDirty={isDirty}
          diffSummary={liveDiff.summary}
          onOpenDiff={() => setIsDiffModalOpen(true)}
          isSplitView={isSplitView}
          onToggleSplitView={() => {
            setIsSplitView(!isSplitView);
            if (!splitTabId && localNotes.length > 1) {
              const other = localNotes.find((n) => n.id !== activeTabId && n.mimeType !== "application/vnd.google-apps.folder");
              if (other) setSplitTabId(other.id);
            }
          }}
          onSave={handleManualSave}
          onExportMarkdown={handleExportMarkdown}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          wordCount={wordCount}
          charCount={charCount}
          editorFont={editorFont}
          onEditorFontChange={(font) => setEditorFont(font)}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
        />

        {/* VS Code / Antigravity Style Tab Management Bar */}
        {openTabIds.length > 0 && (
          <div className="h-9 border-b border-border bg-muted/30 flex items-center justify-between px-0 overflow-x-auto select-none shrink-0">
            <div className="flex items-center h-full overflow-x-auto scrollbar-none">
              {openTabIds.map((tabId) => {
                const note = localNotes.find((n) => n.id === tabId);
                const isActive = activeTabId === tabId;
                const hasLocalDiff = isActive ? isDirty : false;

                return (
                  <div
                    key={tabId}
                    draggable
                    onDragStart={() => setDraggedTabId(tabId)}
                    onDragEnd={() => setDraggedTabId(null)}
                    onClick={() => openFileInTab(tabId)}
                    className={`group flex items-center gap-2 px-3.5 h-full text-xs cursor-pointer border-r border-border/70 transition-all ${
                      isActive
                        ? "bg-card text-foreground font-medium border-t-2 border-t-foreground shadow-2xs"
                        : "bg-muted/15 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    }`}
                  >
                    <FileText className={`w-3.5 h-3.5 ${isActive ? "text-foreground" : "opacity-60"}`} />
                    <span className="truncate max-w-[130px]">
                      {(note?.name || "Untitled").replace(/\.md$/i, "")}
                    </span>
                    <div className="flex items-center ml-1">
                      {hasLocalDiff ? (
                        <button
                          onClick={(e) => closeTab(tabId, e)}
                          className="w-4 h-4 flex items-center justify-center rounded hover:bg-accent transition-colors"
                          title="Unsaved changes (Click to close)"
                        >
                          <span className="w-2 h-2 rounded-full bg-foreground group-hover:hidden" />
                          <X className="w-3 h-3 hidden group-hover:block" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => closeTab(tabId, e)}
                          className="w-4 h-4 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Close"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => handleCreateFile()}
                className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors mx-1"
                title="New File Tab"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Tab Bar Actions (VS Code Style) */}
            <div className="flex items-center gap-1 px-2 shrink-0">
              <button
                onClick={() => setIsDiffModalOpen(true)}
                className={`px-2 py-1 rounded hover:bg-accent transition-colors flex items-center gap-1 text-[11px] font-mono ${
                  isDirty ? "text-amber-500 font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Inspect Browser Diff & Changelog"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>{isDirty ? liveDiff.summary : "0 diff"}</span>
              </button>

              <button
                onClick={() => {
                  setIsSplitView(!isSplitView);
                  if (!splitTabId && localNotes.length > 1) {
                    const other = localNotes.find((n) => n.id !== activeTabId && n.mimeType !== "application/vnd.google-apps.folder");
                    if (other) setSplitTabId(other.id);
                  }
                }}
                className={`p-1.5 rounded hover:bg-accent transition-colors ${
                  isSplitView ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Split Editor Right"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Body (Editor + Right Outline Sidebar) */}
        <div className="flex-1 flex min-h-0 min-w-0 overflow-hidden pb-22 sm:pb-0">
          <main
            className={`flex-1 overflow-hidden bg-background ${
              isSplitView ? "grid grid-cols-2 divide-x divide-border/60" : "flex flex-col"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsOverSplitTarget(true);
            }}
            onDragLeave={() => setIsOverSplitTarget(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsOverSplitTarget(false);
              if (draggedTabId && isSplitView) {
                setSplitTabId(draggedTabId);
              }
            }}
          >
            {localNotes.filter((n) => n.mimeType !== "application/vnd.google-apps.folder").length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
                <h3 className="text-lg font-bold text-foreground mb-2">No Files Found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-6">
                  Your Netherite Google Drive folder is empty. Create a file to start writing!
                </p>
                <button
                  onClick={() => handleCreateFile()}
                  className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Create First Note
                </button>
              </div>
            ) : !activeTabId || openTabIds.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-8 select-none">
                <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center shadow-sm">
                    <FileText className="w-8 h-8 text-foreground/40" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xl font-semibold text-foreground tracking-tight">
                      No Note Open
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto">
                      Select a note from the sidebar to start writing, or create a new one.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCreateFile()}
                      className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Note
                    </button>
                    <button
                      onClick={() => setSidebarCollapsed(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-medium text-xs rounded-xl border border-border/60 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      Browse Notes
                    </button>
                  </div>

                  <div className="pt-6 border-t border-border/40 w-full max-w-xs flex flex-col gap-2 text-[11px] text-muted-foreground/80 font-mono">
                    <div className="flex items-center justify-between">
                      <span>Create note</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl + N</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Save note</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl + S</kbd>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Primary Pane */}
                <div className="h-full w-full overflow-hidden flex flex-col">
                  <Editor
                    key={activeTabId}
                    initialContent={noteContent}
                    title={currentNote?.name || "Untitled.md"}
                    editorFont={editorFont}
                    isLoading={isLoadingContent && !activeTabId?.startsWith("temp-")}
                    onTitleChange={(newTitle) => {
                      if (activeTabId) {
                        handleRenameFile(activeTabId, newTitle);
                      }
                    }}
                    onChange={(updatedContent) => {
                      setNoteContent(updatedContent);
                      if (activeTabId && typeof window !== "undefined") {
                        localStorage.setItem(`netherite_draft_${activeTabId}`, updatedContent);
                      }
                    }}
                    onSave={handleManualSave}
                    onImageUpload={handleImageUpload}
                    onEditorReady={(editor) => {
                      activeEditorRef.current = editor;
                    }}
                    onStatsChange={({ words, chars }) => {
                      setWordCount(words);
                      setCharCount(chars);
                    }}
                  />
                </div>

                {/* Secondary Split Pane */}
                {isSplitView && (
                  <div
                    className={`h-full w-full overflow-hidden flex flex-col rounded-xl transition-all ${
                      isOverSplitTarget
                        ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                        : ""
                    }`}
                  >
                    <Editor
                      key={splitTabId || "split-editor"}
                      initialContent={splitNoteContent}
                      title={currentSplitNote?.name || "Split Document.md"}
                      editorFont={editorFont}
                      onChange={(updatedContent) => setSplitNoteContent(updatedContent)}
                      onSave={() => {
                        if (splitTabId && !splitTabId.startsWith("temp-")) {
                          saveMutation.mutate({ id: splitTabId, content: splitNoteContent });
                        }
                      }}
                      onImageUpload={handleImageUpload}
                    />
                  </div>
                )}
              </>
            )}
          </main>

          {/* Right Outline Sidebar */}
          <OutlineSidebar
            isOpen={isOutlineOpen}
            onClose={() => setIsOutlineOpen(false)}
            headings={documentHeadings}
            onSelectHeading={(text) => {
              // Smooth scroll to heading element in editor
              const editorElements = Array.from(
                document.querySelectorAll("h1, h2, h3, h4, h5, h6, [data-type='heading']")
              );
              const match = editorElements.find((el) => {
                const elText = (el.textContent || "").trim().toLowerCase();
                const targetText = text.trim().toLowerCase();
                return elText.includes(targetText) || targetText.includes(elText);
              });
              if (match) {
                match.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          />
        </div>

        {/* VS Code / Antigravity IDE Bottom Status Bar (Desktop only) */}
        <footer className="hidden sm:flex h-6 border-t border-border bg-muted/40 px-3 items-center justify-between text-[11px] text-muted-foreground select-none font-mono shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDiffModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
              title="View live diff & changelog"
            >
              <GitCompare className="w-3 h-3" />
              <span>drive</span>
              <span>•</span>
              <span className={isDirty ? "text-amber-500 font-semibold" : "text-emerald-500"}>
                {isDirty ? liveDiff.summary : "in sync"}
              </span>
            </button>

            <span>•</span>

            <span className="flex items-center gap-1">
              {isSaving ? (
                <span className="text-amber-500 animate-pulse">Saving to Drive...</span>
              ) : isDirty ? (
                <span className="text-amber-500">Local diffs pending</span>
              ) : (
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Synced
                </span>
              )}
            </span>

            <span>•</span>

            <span className="hidden sm:inline opacity-60">0 ⊗ 0 ⚠</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Spaces: 2</span>
            <span>UTF-8</span>
            <span>LF</span>
            <span className="font-sans">Markdown + KaTeX</span>
          </div>
        </footer>

        {/* Mobile Bottom Bar for native app feel */}
        <MobileBottomBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCreateNote={() => handleCreateFile()}
          onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
          onToggleSplitView={() => {
            setIsSplitView(!isSplitView);
            if (!splitTabId && localNotes.length > 1) {
              const other = localNotes.find((n) => n.id !== activeTabId && n.mimeType !== "application/vnd.google-apps.folder");
              if (other) setSplitTabId(other.id);
            }
          }}
          isSplitView={isSplitView}
          isOutlineOpen={isOutlineOpen}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={handleManualSave}
          onOpenDiff={() => setIsDiffModalOpen(true)}
          diffSummary={liveDiff.summary}
        />
      </div>

      {/* Diff & Changelog Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        noteTitle={currentNote?.name || "Untitled.md"}
        noteId={activeTabId || ""}
        baselineContent={lastSavedContent}
        currentContent={noteContent}
        onSaveToDrive={handleManualSave}
        isSaving={isSaving}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userSession={session}
      />
    </div>
  );
}
