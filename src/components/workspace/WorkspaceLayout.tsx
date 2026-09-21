"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Sidebar, type DriveItem } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";
import { Editor } from "~/components/editor/Editor";
import {
  DrawingCanvas,
  type DrawingCanvasHandle,
} from "~/components/canvas/DrawingCanvas";
import { UmlCanvas } from "~/components/canvas/UmlCanvas";
import { MermaidCanvas } from "~/components/canvas/MermaidCanvas";
import { TikzCanvas } from "~/components/canvas/TikzCanvas";
import { ImageViewer } from "./ImageViewer";
import { SettingsModal } from "./SettingsModal";
import { OutlineSidebar, type HeadingItem } from "./OutlineSidebar";
import { DiffModal } from "./DiffModal";
import { DiffSidebar } from "./DiffSidebar";
import { SyncModal } from "./SyncModal";
import { MobileBottomBar } from "./MobileBottomBar";
import { MobileLibraryScreen } from "./MobileLibraryScreen";
import {
  computeLineDiff,
  computeExcalidrawSemanticDiff,
  areExcalidrawScenesEquivalent,
  isDocumentContentEquivalent,
  saveChangelogEntry,
  clearChangelog,
  type ChangelogEntry,
} from "./diffUtils";
import {
  optimizeExcalidrawJson,
  optimizeMarkdownImages,
} from "~/lib/imageOptimization";
import {
  syncSingleNoteToDevice,
  CLOUD_AUTOSAVE_ENABLED_KEY,
  CLOUD_AUTOSAVE_CADENCE_KEY,
  LOCAL_AUTOSAVE_INTERVAL_KEY,
  type CloudCadence,
  type LocalAutoSaveInterval,
  CLOUD_AUTOSAVE_ENABLED_CHANGED_EVENT,
  CLOUD_CADENCE_CHANGED_EVENT,
  LOCAL_AUTOSAVE_INTERVAL_CHANGED_EVENT,
} from "~/lib/localDeviceSync";
import {
  safeLocalStorageSet,
  pruneLocalStorage,
  idbSetDoc,
  idbDeleteDoc,
  idbSaveSnapshot,
} from "~/lib/storageEngine";
import { LandingPage } from "~/components/landing/LandingPage";
import { ConfirmDeleteModal, type DeleteTarget } from "./ConfirmDeleteModal";
import { CreateDiagramModal } from "./CreateDiagramModal";
import { CalendarView } from "~/components/calendar/CalendarView";
import { type UMLDiagramType } from "@tumaet/apollon";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { GeminiCopilotSidebar } from "~/components/copilot/GeminiCopilotSidebar";
import { PdfExportModal } from "./PdfExportModal";
import { useTheme } from "~/components/ThemeProvider";
import { useCapacitorBackButton } from "~/hooks/useCapacitorBackButton";
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
  Palette,
  Network,
  Workflow,
  Activity,
  Loader2,
  Calendar,
  ArrowLeftRight,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { AppleSpinner } from "~/components/ui/AppleSpinner";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

interface WorkspaceLayoutProps {
  session?: any;
  initialNotes?: DriveItem[];
  initialNoteId?: string;
  initialContent?: string;
  initialMetadata?: {
    name?: string;
    mimeType?: string;
    modifiedTime?: string;
    parents?: string[];
    folderColors?: Record<string, string>;
    [key: string]: any;
  };
}

const isEmptyExcalidraw = (content?: string | null): boolean => {
  if (!content || !content.trim()) return true;
  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    const elems = Array.isArray(parsed) ? parsed : parsed?.elements;
    return !elems || !Array.isArray(elems) || elems.length === 0;
  } catch {
    return true;
  }
};

const isUmlFile = (item?: DriveItem | null): boolean => {
  if (!item) return false;
  return (
    item.name.endsWith(".apollon") ||
    item.name.endsWith(".uml") ||
    item.mimeType === "application/vnd.apollon+json"
  );
};

const isMermaidFile = (item?: DriveItem | null): boolean => {
  if (!item) return false;
  return (
    item.name.endsWith(".mmd") ||
    item.name.endsWith(".mermaid") ||
    item.mimeType === "text/vnd.mermaid"
  );
};

const isTikzFile = (item?: DriveItem | null): boolean => {
  if (!item) return false;
  return (
    item.name.endsWith(".tikz") ||
    item.name.endsWith(".tex") ||
    item.mimeType === "text/vnd.tikz" ||
    item.mimeType === "application/x-tex"
  );
};

const isEmptyApollon = (content?: string | null): boolean => {
  if (!content || !content.trim()) return true;
  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    const model = parsed && parsed.model ? parsed.model : parsed;
    return !model || (!model.type && !model.version);
  } catch {
    return true;
  }
};

export function WorkspaceLayout({
  session,
  initialNotes = [],
  initialNoteId,
  initialContent = "",
  initialMetadata,
}: WorkspaceLayoutProps) {
  const { theme, isDark, textOnlyClipboard } = useTheme();
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
  const [mobileScreen, setMobileScreen] = useState<"editor" | "library">(() => {
    if (
      typeof window !== "undefined" &&
      window.innerWidth < 640 &&
      !initialNoteId
    ) {
      return "library";
    }
    return "editor";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileScreen === "library") {
      document.body.classList.add("mobile-overlay-active");
      return () => {
        document.body.classList.remove("mobile-overlay-active");
      };
    }
  }, [mobileScreen]);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isCreateDiagramModalOpen, setIsCreateDiagramModalOpen] =
    useState(false);
  const [createDiagramParentId, setCreateDiagramParentId] = useState<
    string | undefined
  >(undefined);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editorFont, setEditorFont] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_global_font") || "system";
    }
    return "system";
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"editor" | "calendar">("editor");
  const [folderToExpand, setFolderToExpand] = useState<string | null>(null);

  // Global Search Dialog & Gemini AI Copilot Panel States
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [zenMode, setZenMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_zen_mode") === "true";
    }
    return false;
  });

  const handleToggleZenMode = () => {
    setZenMode((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("netherite_zen_mode", String(next));
      }
      return next;
    });
  };

  const [isDiffSidebarOpen, setIsDiffSidebarOpen] = useState<boolean>(false);

  const toggleDiffSidebar = () => {
    setIsDiffSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "d"
      ) {
        e.preventDefault();
        toggleDiffSidebar();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.altKey &&
        e.key.toLowerCase() === "z"
      ) {
        e.preventDefault();
        handleToggleZenMode();
      } else if (e.key === "Escape" && zenMode) {
        setZenMode(false);
        if (typeof window !== "undefined") {
          localStorage.setItem("netherite_zen_mode", "false");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [zenMode]);

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
  const [folderColors, setFolderColors] = useState<Record<string, string>>(
    () => {
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
    },
  );

  // Stable session tracking per tab to prevent component unmounting / flickering on ID promotion
  const tabSessionsRef = useRef<Record<string, string>>({});
  // Strictly tracks which file owns the current noteContent in memory to isolate drafts across tabs
  const contentFileIdRef = useRef<string | null>(initialNoteId || null);
  const tabBarRef = useRef<HTMLDivElement | null>(null);

  const { data: serverMeta } = api.notes.getMetadata.useQuery(undefined, {
    enabled: !!session?.user,
    staleTime: 60000,
  });

  useEffect(() => {
    if (serverMeta?.folderColors) {
      setFolderColors(serverMeta.folderColors);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "netherite_workspace_meta",
          JSON.stringify(serverMeta),
        );
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
        localStorage.setItem(
          "netherite_workspace_meta",
          JSON.stringify({ folderColors: next }),
        );
      }
      saveMetaMutation.mutate({ folderColors: next });
      return next;
    });
  };

  // Multi-Tab & Split View State: strictly ensure folders and dotfiles are never opened as notes
  const [openTabIds, setOpenTabIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("netherite_open_tabs");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    const firstFile = (initialNotes || []).find(
      (n) =>
        n.mimeType !== "application/vnd.google-apps.folder" &&
        !n.name?.startsWith(".") &&
        Boolean(n.id),
    );
    const initialItem = (initialNotes || []).find(
      (n) => n.id === initialNoteId,
    );
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
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_active_tab");
      if (saved) return saved;
    }
    const firstFile = (initialNotes || []).find(
      (n) =>
        n.mimeType !== "application/vnd.google-apps.folder" &&
        !n.name?.startsWith(".") &&
        Boolean(n.id),
    );
    const initialItem = (initialNotes || []).find(
      (n) => n.id === initialNoteId,
    );
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
        localNotes
          .filter((n) => n.mimeType === "application/vnd.google-apps.folder")
          .map((n) => n.id),
      );
      if (folderIds.size > 0) {
        setOpenTabIds((prev) => {
          const filtered = prev.filter((id) => !folderIds.has(id));
          return filtered.length !== prev.length ? filtered : prev;
        });

        if (activeTabId && folderIds.has(activeTabId)) {
          const firstFile = localNotes.find(
            (n) =>
              n.mimeType !== "application/vnd.google-apps.folder" &&
              Boolean(n.id),
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

  const [isSplitView, setIsSplitView] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_split_view") === "true";
    }
    return false;
  });
  const [splitTabId, setSplitTabId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_split_tab") || undefined;
    }
    return undefined;
  });
  const [activePane, setActivePane] = useState<"primary" | "split">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_active_pane");
      if (saved === "primary" || saved === "split") return saved;
    }
    return "primary";
  });

  const [splitRatio, setSplitRatio] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_split_ratio");
      if (saved) {
        const num = parseFloat(saved);
        if (!isNaN(num) && num >= 0.2 && num <= 0.8) return num;
      }
    }
    return 0.5;
  });
  const [isResizingSplit, setIsResizingSplit] = useState<boolean>(false);
  const workspaceSplitContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync workspace tab and split state to localStorage for seamless refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("netherite_open_tabs", JSON.stringify(openTabIds));
    }
  }, [openTabIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (activeTabId) {
        localStorage.setItem("netherite_active_tab", activeTabId);
      } else {
        localStorage.removeItem("netherite_active_tab");
      }
    }
  }, [activeTabId]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("netherite_split_view", String(isSplitView));
      if (splitTabId) {
        localStorage.setItem("netherite_split_tab", splitTabId);
      } else {
        localStorage.removeItem("netherite_split_tab");
      }
      localStorage.setItem("netherite_active_pane", activePane);
    }
  }, [isSplitView, splitTabId, activePane]);

  const handleSplitResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
    const container = workspaceSplitContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.clientX;
      const offset = currentX - containerRect.left;
      const ratio = Math.max(0.2, Math.min(0.8, offset / containerWidth));
      setSplitRatio(ratio);
    };

    const handlePointerUp = () => {
      setIsResizingSplit(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (typeof window !== "undefined") {
        setSplitRatio((finalRatio) => {
          localStorage.setItem("netherite_split_ratio", String(finalRatio));
          return finalRatio;
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Drag & Drop Feedback State
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [isOverSplitTarget, setIsOverSplitTarget] = useState(false);

  // Note Content State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [noteContent, setNoteContent] = useState<string>(initialContent);
  const [lastSavedContent, setLastSavedContent] =
    useState<string>(initialContent);
  const [noteTitle, setNoteTitle] = useState<string>("");

  const [splitNoteContent, setSplitNoteContent] = useState<string>("");

  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [contentRevision, setContentRevision] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cloud Auto-Save Enabled & Cadence (GCP Free Tier Safe)
  const [cloudAutoSaveEnabled, setCloudAutoSaveEnabled] = useState<boolean>(
    () => {
      if (typeof window !== "undefined") {
        const val = localStorage.getItem(CLOUD_AUTOSAVE_ENABLED_KEY);
        return val === null ? true : val === "true";
      }
      return true;
    },
  );

  const [cloudCadence, setCloudCadence] = useState<CloudCadence>(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem(CLOUD_AUTOSAVE_CADENCE_KEY) as CloudCadence) ||
        "30s"
      );
    }
    return "30s";
  });

  // Local Auto-Save Interval (IndexedDB, LocalStorage & Device sync)
  const [localAutoSaveInterval, setLocalAutoSaveInterval] =
    useState<LocalAutoSaveInterval>(() => {
      if (typeof window !== "undefined") {
        return (
          (localStorage.getItem(
            LOCAL_AUTOSAVE_INTERVAL_KEY,
          ) as LocalAutoSaveInterval) || "immediate"
        );
      }
      return "immediate";
    });

  useEffect(() => {
    const handleCloudEnabledChange = (e: any) => {
      if (typeof e?.detail === "boolean") {
        setCloudAutoSaveEnabled(e.detail);
      } else if (typeof window !== "undefined") {
        const val = localStorage.getItem(CLOUD_AUTOSAVE_ENABLED_KEY);
        setCloudAutoSaveEnabled(val === null ? true : val === "true");
      }
    };

    const handleCadenceChange = (e: any) => {
      if (e?.detail) {
        setCloudCadence(e.detail);
      } else if (typeof window !== "undefined") {
        const saved =
          (localStorage.getItem(CLOUD_AUTOSAVE_CADENCE_KEY) as CloudCadence) ||
          "30s";
        setCloudCadence(saved);
      }
    };

    const handleLocalIntervalChange = (e: any) => {
      if (e?.detail) {
        setLocalAutoSaveInterval(e.detail);
      } else if (typeof window !== "undefined") {
        const saved =
          (localStorage.getItem(
            LOCAL_AUTOSAVE_INTERVAL_KEY,
          ) as LocalAutoSaveInterval) || "immediate";
        setLocalAutoSaveInterval(saved);
      }
    };

    window.addEventListener(
      CLOUD_AUTOSAVE_ENABLED_CHANGED_EVENT,
      handleCloudEnabledChange,
    );
    window.addEventListener(CLOUD_CADENCE_CHANGED_EVENT, handleCadenceChange);
    window.addEventListener(
      "netherite_cloud_cadence_changed",
      handleCadenceChange,
    );
    window.addEventListener(
      LOCAL_AUTOSAVE_INTERVAL_CHANGED_EVENT,
      handleLocalIntervalChange,
    );

    return () => {
      window.removeEventListener(
        CLOUD_AUTOSAVE_ENABLED_CHANGED_EVENT,
        handleCloudEnabledChange,
      );
      window.removeEventListener(
        CLOUD_CADENCE_CHANGED_EVENT,
        handleCadenceChange,
      );
      window.removeEventListener(
        "netherite_cloud_cadence_changed",
        handleCadenceChange,
      );
      window.removeEventListener(
        LOCAL_AUTOSAVE_INTERVAL_CHANGED_EVENT,
        handleLocalIntervalChange,
      );
    };
  }, []);

  // Native Android Hardware Back Button Handling via Capacitor
  useCapacitorBackButton({
    closeModals: () => {
      if (isDeleteModalOpen) {
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
        return true;
      }
      if (isSyncModalOpen) {
        setIsSyncModalOpen(false);
        return true;
      }
      if (isDiffModalOpen) {
        setIsDiffModalOpen(false);
        return true;
      }
      if (isCreateDiagramModalOpen) {
        setIsCreateDiagramModalOpen(false);
        return true;
      }
      if (isSettingsOpen) {
        setIsSettingsOpen(false);
        return true;
      }
      if (toastMessage) {
        setToastMessage(null);
        return true;
      }
      return false;
    },
    closeSidebar: () => {
      if (
        typeof window !== "undefined" &&
        window.innerWidth < 768 &&
        !sidebarCollapsed
      ) {
        setSidebarCollapsed(true);
        return true;
      }
      if (
        typeof window !== "undefined" &&
        window.innerWidth < 1280 &&
        isOutlineOpen
      ) {
        setIsOutlineOpen(false);
        return true;
      }
      return false;
    },
  });

  const utils = api.useUtils();

  // Cached tRPC query for Google Drive syncing (staleTime = 60000ms)
  const { data: notesData, isLoading: isNotesLoading } =
    api.notes.list.useQuery(undefined, {
      initialData:
        initialNotes && initialNotes.length > 0
          ? (initialNotes as any)
          : undefined,
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
  const {
    data: fetchedContent,
    isLoading: isLoadingContent,
    isFetching: isFetchingContent,
  } = api.notes.get.useQuery(
    { id: activeTabId! },
    {
      enabled:
        !!session?.user && !!activeTabId && !activeTabId.startsWith("temp-"),
      staleTime: 300000,
    },
  );

  // Split Active Note Content Query
  const {
    data: fetchedSplitContent,
    isLoading: isLoadingSplitContent,
    isFetching: isFetchingSplitContent,
  } = api.notes.get.useQuery(
    { id: splitTabId! },
    {
      enabled:
        !!session?.user &&
        !!splitTabId &&
        !splitTabId.startsWith("temp-") &&
        isSplitView,
      staleTime: 300000,
    },
  );

  const isDocumentLoading =
    Boolean(activeTabId) &&
    !activeTabId?.startsWith("temp-") &&
    (isLoadingContent || (isFetchingContent && fetchedContent === undefined));

  const isSplitDocumentLoading =
    Boolean(splitTabId) &&
    !splitTabId?.startsWith("temp-") &&
    isSplitView &&
    (isLoadingSplitContent ||
      (isFetchingSplitContent && fetchedSplitContent === undefined));

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  const currentNote = localNotes.find((n) => n.id === activeTabId);
  const currentSplitNote = localNotes.find((n) => n.id === splitTabId);
  const isCurrentImage =
    currentNote?.mimeType?.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(currentNote?.name || "");
  const isSplitImage =
    currentSplitNote?.mimeType?.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(currentSplitNote?.name || "");

  const isCurrentDrawing =
    currentNote?.name?.endsWith(".excalidraw") ||
    currentNote?.mimeType === "application/vnd.excalidraw+json";
  const isCurrentUml = isUmlFile(currentNote);
  const isCurrentMermaid = isMermaidFile(currentNote);
  const isCurrentTikz = isTikzFile(currentNote);
  const isCurrentMarkdown =
    Boolean(currentNote) &&
    !isCurrentDrawing &&
    !isCurrentUml &&
    !isCurrentMermaid &&
    !isCurrentTikz &&
    !isCurrentImage;

  const isSplitDrawing =
    currentSplitNote?.name?.endsWith(".excalidraw") ||
    currentSplitNote?.mimeType === "application/vnd.excalidraw+json";
  const isSplitUml = isUmlFile(currentSplitNote);
  const isSplitMermaid = isMermaidFile(currentSplitNote);
  const isSplitTikz = isTikzFile(currentSplitNote);
  const isSplitMarkdown =
    Boolean(currentSplitNote) &&
    !isSplitDrawing &&
    !isSplitUml &&
    !isSplitMermaid &&
    !isSplitTikz &&
    !isSplitImage;

  const isDirty = useMemo(() => {
    if (isCurrentImage || !activeTabId) return false;
    if (noteContent === lastSavedContent) return false;
    if (!noteContent && !lastSavedContent) return false;

    if (isCurrentDrawing) {
      return !areExcalidrawScenesEquivalent(lastSavedContent, noteContent);
    }
    return noteContent !== lastSavedContent;
  }, [
    isCurrentImage,
    activeTabId,
    noteContent,
    lastSavedContent,
    isCurrentDrawing,
  ]);

  const [diffSummary, setDiffSummary] = useState<string>("0 diff");

  useEffect(() => {
    if (!isDirty) {
      setDiffSummary(isCurrentDrawing ? "0 shapes" : "0 diff");
      return;
    }
    const timer = setTimeout(() => {
      if (isCurrentDrawing) {
        const dDiff = computeExcalidrawSemanticDiff(
          lastSavedContent,
          noteContent,
        );
        setDiffSummary(dDiff.summaryText);
      } else {
        const diff = computeLineDiff(lastSavedContent, noteContent);
        setDiffSummary(diff.summary);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isDirty, isCurrentDrawing, lastSavedContent, noteContent]);

  // Efficient background cloud auto-save engine:
  // When cloudAutoSaveEnabled and isDirty are true and user pauses typing/drawing, auto-sync to Google Drive
  // Default is 30 seconds (GCP quota-friendly, user-requested 30s / 1m).
  // Instant saves still occur on tab switch, window blur, or Ctrl+S.
  useEffect(() => {
    if (
      !cloudAutoSaveEnabled ||
      !isDirty ||
      isSaving ||
      !activeTabId ||
      activeTabId.startsWith("temp-") ||
      !session?.user ||
      isDocumentLoading ||
      cloudCadence === "manual"
    ) {
      return;
    }

    const currentItem = localNotes.find((n) => n.id === activeTabId);
    if (
      currentItem?.mimeType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(currentItem?.name || "")
    ) {
      return;
    }

    const delayMs =
      cloudCadence === "1m" ? 60000 : cloudCadence === "10s" ? 10000 : 30000; // default 30s

    const timer = setTimeout(() => {
      if (
        noteContent &&
        (noteContent.length > 0 || lastSavedContent.length > 0)
      ) {
        void saveDocument(activeTabId, noteContent, currentItem);
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [
    cloudAutoSaveEnabled,
    isDirty,
    isSaving,
    activeTabId,
    noteContent,
    lastSavedContent,
    session?.user,
    isDocumentLoading,
    localNotes,
    cloudCadence,
  ]);

  const saveBackupSnapshot = (noteId: string, content: string) => {
    if (!noteId || !content || typeof window === "undefined") return;
    // Store snapshot ledger in IndexedDB (virtually unlimited quota, no 5MB localStorage bloat)
    void idbSaveSnapshot(noteId, content);
  };

  const onSaveCompleted = useCallback(
    (fileId: string, savedContent: string) => {
      setIsSaving(false);
      try {
        if (typeof window !== "undefined") {
          safeLocalStorageSet(`netherite_cache_${fileId}`, savedContent);
          safeLocalStorageSet(
            `netherite_saved_at_${fileId}`,
            String(Date.now()),
          );
          try {
            localStorage.removeItem(`netherite_draft_${fileId}`);
          } catch {}
          void idbSetDoc(`netherite_cache_${fileId}`, savedContent);
          void idbDeleteDoc(`netherite_draft_${fileId}`);
        }
        utils.notes.get.setData({ id: fileId }, savedContent);
        utils.notes.list.setData(undefined, (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((it: any) =>
            it.id === fileId
              ? { ...it, modifiedTime: new Date().toISOString() }
              : it,
          );
        });

        if (fileId === activeTabId) {
          setLastSavedContent(savedContent);
          saveBackupSnapshot(fileId, savedContent);
        }
        if (fileId === splitTabId) {
          saveBackupSnapshot(fileId, savedContent);
        }

        // Asynchronously mirror to local device directory handle if enabled
        void syncSingleNoteToDevice(fileId, savedContent, localNotes);
      } catch (err) {
        console.warn("Storage sync error on save:", err);
      }
    },
    [activeTabId, splitTabId, utils, localNotes],
  );

  const saveMutation = api.notes.save.useMutation({
    onMutate: () => setIsSaving(true),
    onSuccess: (_, variables) => {
      onSaveCompleted(variables.id, variables.content);
    },
    onError: () => setIsSaving(false),
  });

  const renameMutation = api.notes.rename.useMutation({
    onSuccess: (_, variables) => {
      utils.notes.list.setData(undefined, (old: any) => {
        if (!old) return [];
        return old.map((item: any) =>
          item.id === variables.id
            ? { ...item, name: variables.newName }
            : item,
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
            : item,
        );
      });
    },
  });
  const uploadAssetMutation = api.notes.uploadAsset.useMutation();
  const getResumableUploadUrlMutation =
    api.notes.getResumableUploadUrl.useMutation();

  const deepSyncMutation = api.notes.deepSync.useMutation({
    onSuccess: (res) => {
      utils.notes.list.invalidate();
      utils.notes.getMetadata.invalidate();
      showToast(res.message || "Deep sync and repair complete.");
    },
    onError: (err) => {
      showToast(`Deep sync failed: ${err.message}`);
    },
  });

  const handleDeepSync = async () => {
    if (deepSyncMutation.isPending || isSyncing) return;
    try {
      showToast("Scanning Google Drive and repairing workspace...");
      await deepSyncMutation.mutateAsync();
    } catch {}
  };

  const activeEditorRef = useRef<any>(null);
  const activeCanvasRef = useRef<DrawingCanvasHandle | null>(null);
  const activeSplitCanvasRef = useRef<DrawingCanvasHandle | null>(null);

  // One-time startup scrubber: clean up phantom drafts and prune bloated snapshots from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Purge bloated snapshots from localStorage (persisted in IndexedDB)
      pruneLocalStorage();

      const keysToScrub: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("netherite_draft_")) {
          const fileId = key.replace("netherite_draft_", "");
          const draftVal = localStorage.getItem(key);
          if (!draftVal || !draftVal.trim()) {
            keysToScrub.push(key);
            continue;
          }
          const cacheVal = localStorage.getItem(`netherite_cache_${fileId}`);
          if (cacheVal) {
            const isDrawing =
              draftVal.includes('"type":"excalidraw"') ||
              draftVal.includes('"type": "excalidraw"');
            if (isDocumentContentEquivalent(isDrawing, cacheVal, draftVal)) {
              keysToScrub.push(key);
            }
          }
        }
      }
      keysToScrub.forEach((k) => {
        localStorage.removeItem(k);
        void idbDeleteDoc(k);
      });
      if (keysToScrub.length > 0) {
        console.info(
          `[Netherite] Cleaned up ${keysToScrub.length} phantom drafts on startup.`,
        );
      }
    } catch (e) {
      console.warn("Draft scrubber error:", e);
    }
  }, []);

  /**
   * Retrieves an unsaved local draft ONLY if it exists and is genuinely modified
   * compared to the cached/cloud version. Cleans up phantom identical drafts automatically.
   */
  const getUnsavedDraft = useCallback(
    (
      fileId: string,
      isDrawing: boolean,
      baselineContent?: string,
    ): string | null => {
      if (typeof window === "undefined" || !fileId) return null;

      const directDraft = localStorage.getItem(`netherite_draft_${fileId}`);
      if (!directDraft || !directDraft.trim()) return null;

      if (isDrawing && isEmptyExcalidraw(directDraft)) {
        try {
          localStorage.removeItem(`netherite_draft_${fileId}`);
        } catch {}
        return null;
      }

      const baseline =
        baselineContent ??
        (utils.notes.get.getData({ id: fileId }) as string | undefined) ??
        localStorage.getItem(`netherite_cache_${fileId}`) ??
        "";

      if (
        baseline &&
        isDocumentContentEquivalent(isDrawing, baseline, directDraft)
      ) {
        try {
          localStorage.removeItem(`netherite_draft_${fileId}`);
        } catch {}
        return null;
      }

      return directDraft;
    },
    [utils],
  );

  const noteContentRef = useRef(noteContent);
  noteContentRef.current = noteContent;

  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const localNotesRef = useRef(localNotes);
  localNotesRef.current = localNotes;

  const saveDocumentRef = useRef<
    | ((
        fileId: string,
        rawContent: string,
        item?: DriveItem,
      ) => Promise<boolean>)
    | null
  >(null);

  const sendKeepaliveSave = (fileId: string, content: string) => {
    if (
      !fileId ||
      fileId.startsWith("temp-") ||
      !content ||
      typeof window === "undefined"
    )
      return;
    try {
      void fetch("/api/notes/save-beacon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId, content }),
        keepalive: true,
      });
    } catch (err) {
      console.warn("Keepalive save failed:", err);
    }
  };

  // Synchronous flush on window unload or tab hidden (Java finally {} style Google Drive persistence)
  useEffect(() => {
    const handleBeforeUnload = () => {
      let content = noteContentRef.current;
      if (activeCanvasRef.current) {
        try {
          const flushed = activeCanvasRef.current.flush();
          if (flushed) content = flushed;
        } catch {}
      }
      if (activeSplitCanvasRef.current) {
        try {
          activeSplitCanvasRef.current.flush();
        } catch {}
      }

      const activeId = activeTabIdRef.current;
      if (
        activeId &&
        !activeId.startsWith("temp-") &&
        isDirtyRef.current &&
        content
      ) {
        try {
          safeLocalStorageSet(`netherite_draft_${activeId}`, content);
          void idbSetDoc(`netherite_draft_${activeId}`, content);
          saveBackupSnapshot(activeId, content);
        } catch {}
        sendKeepaliveSave(activeId, content);
      }
    };

    const handlePageHide = () => {
      handleBeforeUnload();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        let content = noteContentRef.current;
        if (activeCanvasRef.current) {
          try {
            const flushed = activeCanvasRef.current.flush();
            if (flushed) content = flushed;
          } catch {}
        }
        if (activeSplitCanvasRef.current) {
          try {
            activeSplitCanvasRef.current.flush();
          } catch {}
        }

        const activeId = activeTabIdRef.current;
        if (
          activeId &&
          !activeId.startsWith("temp-") &&
          isDirtyRef.current &&
          content
        ) {
          try {
            safeLocalStorageSet(`netherite_draft_${activeId}`, content);
            void idbSetDoc(`netherite_draft_${activeId}`, content);
            saveBackupSnapshot(activeId, content);
          } catch {}
          const item = localNotesRef.current.find((n) => n.id === activeId);
          if (saveDocumentRef.current) {
            void saveDocumentRef.current(activeId, content, item);
          }
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!activeTabId) {
      contentFileIdRef.current = null;
      setNoteContent("");
      setLastSavedContent("");
      setNoteTitle("");
      return;
    }
    const currentItem = localNotes.find((n) => n.id === activeTabId);
    const isDrawing =
      currentItem?.name.endsWith(".excalidraw") ||
      currentItem?.mimeType === "application/vnd.excalidraw+json";
    const isUml = isUmlFile(currentItem);

    const localCache =
      typeof window !== "undefined"
        ? localStorage.getItem(`netherite_cache_${activeTabId}`)
        : null;
    const baseline = fetchedContent !== undefined ? fetchedContent : localCache;

    const unsavedDraft = getUnsavedDraft(
      activeTabId,
      isDrawing,
      baseline ?? undefined,
    );
    if (unsavedDraft) {
      contentFileIdRef.current = activeTabId;
      setNoteContent(unsavedDraft);
      if (fetchedContent !== undefined) {
        setLastSavedContent(fetchedContent);
        safeLocalStorageSet(`netherite_cache_${activeTabId}`, fetchedContent);
        void idbSetDoc(`netherite_cache_${activeTabId}`, fetchedContent);
      } else if (localCache) {
        setLastSavedContent(localCache);
      }
      return;
    }

    if (baseline !== null && baseline !== undefined) {
      let contentToSet = baseline;
      if (isUml && contentToSet.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(contentToSet);
          const model = parsed && parsed.model ? parsed.model : parsed;
          if (model && (model.version === "4.0.0" || !model.version)) {
            model.version = "4.2.0";
          }
          contentToSet = JSON.stringify(model, null, 2);
        } catch {}
      }
      contentFileIdRef.current = activeTabId;
      setNoteContent(contentToSet);
      setLastSavedContent(contentToSet);
      if (typeof window !== "undefined" && fetchedContent !== undefined) {
        safeLocalStorageSet(`netherite_cache_${activeTabId}`, contentToSet);
        void idbSetDoc(`netherite_cache_${activeTabId}`, contentToSet);
      }
    }
  }, [fetchedContent, activeTabId, localNotes, getUnsavedDraft]);

  // Continuous local draft backup with configurable cadence (Strictly isolated to active tab's file ID)
  useEffect(() => {
    if (
      !activeTabId ||
      activeTabId.startsWith("temp-") ||
      typeof window === "undefined"
    )
      return;
    if (contentFileIdRef.current !== activeTabId) return;

    const currentItem = localNotes.find((n) => n.id === activeTabId);
    const isDrawing =
      currentItem?.name.endsWith(".excalidraw") ||
      currentItem?.mimeType === "application/vnd.excalidraw+json";
    const isUml = isUmlFile(currentItem);

    // NEVER save an empty drawing/uml draft to localStorage if the original file has content!
    if (
      isDrawing &&
      isEmptyExcalidraw(noteContent) &&
      !isEmptyExcalidraw(lastSavedContent)
    ) {
      return;
    }
    if (
      isUml &&
      isEmptyApollon(noteContent) &&
      !isEmptyApollon(lastSavedContent)
    ) {
      return;
    }

    if (!isDirty) {
      try {
        localStorage.removeItem(`netherite_draft_${activeTabId}`);
      } catch {}
      void idbDeleteDoc(`netherite_draft_${activeTabId}`);
      return;
    }

    if (noteContent.length === 0) return;

    const persistDraft = () => {
      try {
        safeLocalStorageSet(`netherite_draft_${activeTabId}`, noteContent);
        void idbSetDoc(`netherite_draft_${activeTabId}`, noteContent);
        saveBackupSnapshot(activeTabId, noteContent);
        void syncSingleNoteToDevice(activeTabId, noteContent, localNotes);
      } catch {}
    };

    let delayMs = 0;
    if (localAutoSaveInterval === "1s") delayMs = 1000;
    else if (localAutoSaveInterval === "2s") delayMs = 2000;
    else if (localAutoSaveInterval === "5s") delayMs = 5000;
    else if (localAutoSaveInterval === "10s") delayMs = 10000;
    else if (localAutoSaveInterval === "30s") delayMs = 30000;
    else if (
      localAutoSaveInterval !== "immediate" &&
      !isNaN(Number(localAutoSaveInterval))
    ) {
      delayMs = Number(localAutoSaveInterval) * 1000;
    }

    if (delayMs <= 0) {
      persistDraft();
      return;
    }

    const timer = setTimeout(() => {
      persistDraft();
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [
    noteContent,
    lastSavedContent,
    activeTabId,
    localNotes,
    isDirty,
    localAutoSaveInterval,
  ]);

  // Split Pane Note Content Loading (With Clean Draft & Cache Support)
  useEffect(() => {
    if (!splitTabId) return;
    const currentItem = localNotes.find((n) => n.id === splitTabId);
    const isDrawing =
      currentItem?.name.endsWith(".excalidraw") ||
      currentItem?.mimeType === "application/vnd.excalidraw+json";

    const localCache =
      typeof window !== "undefined"
        ? localStorage.getItem(`netherite_cache_${splitTabId}`)
        : null;
    const baseline =
      fetchedSplitContent !== undefined ? fetchedSplitContent : localCache;

    const unsavedDraft = getUnsavedDraft(
      splitTabId,
      isDrawing,
      baseline ?? undefined,
    );
    if (unsavedDraft) {
      setSplitNoteContent(unsavedDraft);
      if (fetchedSplitContent !== undefined && typeof window !== "undefined") {
        safeLocalStorageSet(
          `netherite_cache_${splitTabId}`,
          fetchedSplitContent,
        );
        void idbSetDoc(`netherite_cache_${splitTabId}`, fetchedSplitContent);
      }
      return;
    }

    if (baseline !== null && baseline !== undefined) {
      setSplitNoteContent(baseline);
      if (fetchedSplitContent !== undefined && typeof window !== "undefined") {
        safeLocalStorageSet(`netherite_cache_${splitTabId}`, baseline);
        void idbSetDoc(`netherite_cache_${splitTabId}`, baseline);
      }
    }
  }, [fetchedSplitContent, splitTabId, localNotes, getUnsavedDraft]);

  useEffect(() => {
    if (activeTabId && localNotes.length > 0) {
      const current = localNotes.find((n) => n.id === activeTabId);
      if (current && current.name) {
        setNoteTitle(current.name);
      }
    }
  }, [activeTabId, localNotes]);

  const pendingImagesRef = useRef<Map<string, File>>(new Map());

  // Manual save ONLY: No background autosave timer and NO mutation on keystroke/cleanup!
  const unsavedRef = useRef(false);
  unsavedRef.current =
    !!activeTabId &&
    !activeTabId.startsWith("temp-") &&
    (noteContent !== lastSavedContent || pendingImagesRef.current.size > 0);

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

  // Auto-refresh from Google Drive when tab/app regains focus if no unsaved changes exist
  useEffect(() => {
    if (typeof window === "undefined" || !session?.user) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const hasDraft =
          activeTabId &&
          typeof window !== "undefined" &&
          localStorage.getItem(`netherite_draft_${activeTabId}`) !== null;

        if (!unsavedRef.current && !hasDraft) {
          utils.notes.list.invalidate();
          utils.notes.getMetadata.invalidate();
          if (activeTabId && !activeTabId.startsWith("temp-")) {
            utils.notes.get.invalidate({ id: activeTabId });
          }
        }
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [activeTabId, session?.user, utils]);

  // Global Ctrl+P / Cmd+P shortcut to open PDF export dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setIsPdfModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Unified, robust document save pipeline with automatic base64 optimization and direct Google Drive fallback
  const saveDocument = async (
    fileId: string,
    rawContent: string,
    item?: DriveItem,
  ): Promise<boolean> => {
    if (!fileId || fileId.startsWith("temp-") || !session?.user) return false;

    let contentToSave = rawContent;
    const isDrawing =
      item?.name?.endsWith(".excalidraw") ||
      item?.mimeType === "application/vnd.excalidraw+json" ||
      contentToSave.includes('"type":"excalidraw"') ||
      contentToSave.includes('"type": "excalidraw"');

    // Automatically optimize any embedded base64 images (e.g. pasted from excalidraw.com or clipboard)
    try {
      if (isDrawing) {
        const opt = await optimizeExcalidrawJson(contentToSave);
        if (opt.wasOptimized) {
          contentToSave = opt.content;
          if (fileId === activeTabId) {
            setNoteContent(contentToSave);
          } else if (fileId === splitTabId) {
            setSplitNoteContent(contentToSave);
          }
        }
      } else {
        const opt = await optimizeMarkdownImages(contentToSave);
        if (opt.wasOptimized) {
          contentToSave = opt.content;
          if (fileId === activeTabId) {
            setNoteContent(contentToSave);
          } else if (fileId === splitTabId) {
            setSplitNoteContent(contentToSave);
          }
        }
      }
    } catch (err) {
      console.warn("Base64 optimization error on save:", err);
    }

    setIsSaving(true);

    // If payload is larger than 3.5 MB, use direct Google Drive resumable upload to bypass Vercel 4.5 MB limit
    const payloadBytes = new Blob([contentToSave]).size;
    const isLargePayload = payloadBytes >= 3.5 * 1024 * 1024;

    if (isLargePayload) {
      try {
        showToast("Saving large document directly to Google Drive…");
        const sessionRes = await getResumableUploadUrlMutation.mutateAsync({
          fileId,
        });
        if (sessionRes?.uploadUrl) {
          const uploadRes = await fetch(sessionRes.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": sessionRes.mimeType || "application/octet-stream",
            },
            body: contentToSave,
          });

          if (uploadRes.ok) {
            onSaveCompleted(fileId, contentToSave);
            showToast("Saved to Google Drive");
            return true;
          }
        }
      } catch (err: any) {
        console.warn(
          "Direct upload encountered issue, attempting standard save:",
          err,
        );
      }
    }

    // Standard tRPC save for normal payloads (or fallback)
    try {
      await saveMutation.mutateAsync({ id: fileId, content: contentToSave });
      showToast("Saved to Google Drive");
      return true;
    } catch (err: any) {
      // If tRPC failed with 413 or payload error, recover via direct Google Drive upload
      const errMsg = String(err?.message || err || "");
      if (
        errMsg.includes("413") ||
        errMsg.includes("Request En") ||
        errMsg.includes("Too Large") ||
        errMsg.includes("Unexpected token 'R'")
      ) {
        try {
          showToast(
            "Payload exceeded Vercel limit. Uploading directly to Google Drive…",
          );
          const sessionRes = await getResumableUploadUrlMutation.mutateAsync({
            fileId,
          });
          if (sessionRes?.uploadUrl) {
            const uploadRes = await fetch(sessionRes.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type":
                  sessionRes.mimeType || "application/octet-stream",
              },
              body: contentToSave,
            });

            if (uploadRes.ok) {
              onSaveCompleted(fileId, contentToSave);
              showToast("Saved to Google Drive");
              return true;
            }
          }
        } catch (directErr) {
          console.error("Direct upload fallback failed:", directErr);
        }
      }
      setIsSaving(false);
      showToast(`Save failed: ${errMsg.slice(0, 100)}`);
      return false;
    }
  };
  saveDocumentRef.current = saveDocument;

  const handleManualSave = async () => {
    if (
      !activeTabId ||
      !session?.user ||
      activeTabId.startsWith("temp-") ||
      isLoadingContent
    )
      return;

    const currentNoteItem = localNotes.find((n) => n.id === activeTabId);
    if (
      currentNoteItem?.mimeType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(currentNoteItem?.name || "")
    ) {
      return;
    }

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
              if (
                activeEditorRef.current &&
                !activeEditorRef.current.isDestroyed &&
                activeEditorRef.current.view &&
                activeEditorRef.current.state
              ) {
                try {
                  const editor = activeEditorRef.current;
                  const { tr } = editor.state;
                  let found = false;
                  editor.state.doc.descendants((node: any, pos: number) => {
                    if (
                      node.type.name === "image" &&
                      node.attrs.src === blobUrl
                    ) {
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
                } catch {}
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
    if (!diff.hasChanges && !saveMutation.isPending && !isSaving) return;

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

    await saveDocument(activeTabId, contentToSave, currentNoteItem);
  };

  // 100% INSTANT OPTIMISTIC FILE CREATION (0ms response time, zero blink!)
  const handleCreateFile = async (parentId?: string) => {
    const tempId = `temp-${Date.now()}`;
    const defaultName = `Untitled-${Date.now().toString().slice(-4)}.md`;

    // Establish stable session ID so React does not unmount editor upon ID promotion
    const stableSession = `session-${Date.now()}`;
    tabSessionsRef.current[tempId] = stableSession;

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
        // Transfer stable session so key remains identical
        tabSessionsRef.current[realNote.id] = stableSession;

        // Synchronously populate query cache so useQuery({ id: realNote.id }) does NOT flip to loading!
        utils.notes.get.setData({ id: realNote.id }, "");

        // Transfer local draft if any exists
        if (typeof window !== "undefined") {
          const draft = localStorage.getItem(`netherite_draft_${tempId}`);
          if (draft) {
            localStorage.setItem(`netherite_draft_${realNote.id}`, draft);
            localStorage.removeItem(`netherite_draft_${tempId}`);
          }
        }

        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realNote.id,
          );
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: realNote.id!, parents: realNote.parents }
              : item,
          ),
        );
        setOpenTabIds((prev) =>
          prev.map((id) => (id === tempId ? realNote.id! : id)),
        );
        setActiveTabId((current) =>
          current === tempId ? realNote.id! : current,
        );
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background file creation failed:", err);
    }
  };

  // 100% INSTANT OPTIMISTIC DRAWING CREATION (Whiteboard sketch)
  const handleCreateDrawing = async (parentId?: string) => {
    const tempId = `temp-draw-${Date.now()}`;
    const defaultName = `Sketch-${Date.now().toString().slice(-4)}.excalidraw`;
    const stableSession = `session-draw-${Date.now()}`;
    tabSessionsRef.current[tempId] = stableSession;

    const defaultContent = JSON.stringify(
      {
        type: "excalidraw",
        version: 2,
        source: "netherite",
        elements: [],
        appState: {
          viewBackgroundColor: theme === "dark" ? "#121212" : "#ffffff",
          currentItemFontFamily: 1,
        },
        files: {},
      },
      null,
      2,
    );

    const newItem: DriveItem = {
      id: tempId,
      name: defaultName,
      mimeType: "application/vnd.excalidraw+json",
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    setLocalNotes((prev) => [newItem, ...prev]);
    openFileInTab(tempId);
    setNoteContent(defaultContent);
    setLastSavedContent(defaultContent);
    setEditingId(tempId);

    try {
      const realNote = await createMutation.mutateAsync({
        name: defaultName,
        content: defaultContent,
        parentId,
        type: "drawing",
      });
      if (realNote?.id) {
        tabSessionsRef.current[realNote.id] = stableSession;
        utils.notes.get.setData({ id: realNote.id }, defaultContent);

        if (typeof window !== "undefined") {
          const draft = localStorage.getItem(`netherite_draft_${tempId}`);
          if (draft) {
            localStorage.setItem(`netherite_draft_${realNote.id}`, draft);
            localStorage.removeItem(`netherite_draft_${tempId}`);
          }
        }

        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realNote.id,
          );
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  id: realNote.id!,
                  parents: realNote.parents,
                  mimeType: "application/vnd.excalidraw+json",
                }
              : item,
          ),
        );
        setOpenTabIds((prev) =>
          prev.map((id) => (id === tempId ? realNote.id! : id)),
        );
        setActiveTabId((current) =>
          current === tempId ? realNote.id! : current,
        );
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background drawing creation failed:", err);
    }
  };

  const handleOpenCreateDiagramModal = (parentId?: string) => {
    setCreateDiagramParentId(parentId);
    setIsCreateDiagramModalOpen(true);
  };

  // 100% INSTANT OPTIMISTIC ARCHITECTURE & UML CREATION (All 13 Apollon diagram suites)
  const handleCreateUml = async (
    diagramType: UMLDiagramType = "ClassDiagram" as UMLDiagramType,
    customTitle?: string,
  ) => {
    const parentId = createDiagramParentId;
    const tempId = `temp-uml-${Date.now()}`;
    const cleanTitle =
      customTitle?.trim() ||
      `${diagramType}-${Date.now().toString().slice(-4)}`;
    const defaultName = cleanTitle.endsWith(".apollon")
      ? cleanTitle
      : `${cleanTitle}.apollon`;
    const stableSession = `session-uml-${Date.now()}`;
    tabSessionsRef.current[tempId] = stableSession;

    const defaultContent = JSON.stringify(
      {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `model-${Date.now()}`,
        version: "4.2.0",
        title: defaultName.replace(/\.apollon$/i, ""),
        type: diagramType,
        nodes: [],
        edges: [],
        assessments: {},
      },
      null,
      2,
    );

    const newItem: DriveItem = {
      id: tempId,
      name: defaultName,
      mimeType: "application/vnd.apollon+json",
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    setLocalNotes((prev) => [newItem, ...prev]);
    openFileInTab(tempId);
    setNoteContent(defaultContent);
    setLastSavedContent(defaultContent);
    setEditingId(tempId);

    try {
      const realNote = await createMutation.mutateAsync({
        name: defaultName,
        content: defaultContent,
        parentId,
        type: "uml",
      });
      if (realNote?.id) {
        tabSessionsRef.current[realNote.id] = stableSession;
        utils.notes.get.setData({ id: realNote.id }, defaultContent);

        if (typeof window !== "undefined") {
          const draft = localStorage.getItem(`netherite_draft_${tempId}`);
          if (draft) {
            localStorage.setItem(`netherite_draft_${realNote.id}`, draft);
            localStorage.removeItem(`netherite_draft_${tempId}`);
          }
        }

        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realNote.id,
          );
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  id: realNote.id!,
                  parents: realNote.parents,
                  mimeType: "application/vnd.apollon+json",
                }
              : item,
          ),
        );
        setOpenTabIds((prev) =>
          prev.map((id) => (id === tempId ? realNote.id! : id)),
        );
        setActiveTabId((current) =>
          current === tempId ? realNote.id! : current,
        );
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background UML creation failed:", err);
    }
  };

  // 100% INSTANT OPTIMISTIC MERMAID CREATION
  const handleCreateMermaid = async (parentId?: string) => {
    const tempId = `temp-mermaid-${Date.now()}`;
    const defaultName = `Diagram-${Date.now().toString().slice(-4)}.mmd`;
    const stableSession = `session-mermaid-${Date.now()}`;
    tabSessionsRef.current[tempId] = stableSession;

    const defaultContent = `flowchart TD
    Start([Start]) --> Process[Process Data]
    Process --> Decision{Is Valid?}
    Decision -- Yes --> Success[Operation Complete]
    Decision -- No --> Error[Log Error]
    Success --> End([Finish])
    Error --> End`;

    const newItem: DriveItem = {
      id: tempId,
      name: defaultName,
      mimeType: "text/vnd.mermaid",
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    setLocalNotes((prev) => [newItem, ...prev]);
    openFileInTab(tempId);
    setNoteContent(defaultContent);
    setLastSavedContent(defaultContent);
    setEditingId(tempId);

    try {
      const realNote = await createMutation.mutateAsync({
        name: defaultName,
        content: defaultContent,
        parentId,
        type: "mermaid",
      });
      if (realNote?.id) {
        tabSessionsRef.current[realNote.id] = stableSession;
        utils.notes.get.setData({ id: realNote.id }, defaultContent);

        if (typeof window !== "undefined") {
          const draft = localStorage.getItem(`netherite_draft_${tempId}`);
          if (draft) {
            localStorage.setItem(`netherite_draft_${realNote.id}`, draft);
            localStorage.removeItem(`netherite_draft_${tempId}`);
          }
        }

        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realNote.id,
          );
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  id: realNote.id!,
                  parents: realNote.parents,
                  mimeType: "text/vnd.mermaid",
                }
              : item,
          ),
        );
        setOpenTabIds((prev) =>
          prev.map((id) => (id === tempId ? realNote.id! : id)),
        );
        setActiveTabId((current) =>
          current === tempId ? realNote.id! : current,
        );
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background Mermaid creation failed:", err);
    }
  };

  // 100% INSTANT OPTIMISTIC TIKZ CREATION
  const handleCreateTikz = async (parentId?: string) => {
    const tempId = `temp-tikz-${Date.now()}`;
    const defaultName = `Diagram-${Date.now().toString().slice(-4)}.tikz`;
    const stableSession = `session-tikz-${Date.now()}`;
    tabSessionsRef.current[tempId] = stableSession;

    const defaultContent = `\\begin{tikzpicture}[node distance=2cm, auto, >=stealth]
  \\node [circle, draw=blue!80, fill=blue!10, thick] (A) {Input};
  \\node [rectangle, draw=purple!80, fill=purple!10, thick, right of=A, node distance=3cm] (B) {Processing};
  \\node [circle, draw=green!80, fill=green!10, thick, right of=B, node distance=3cm] (C) {Output};
  \\path [->, thick] (A) edge node {x} (B);
  \\path [->, thick] (B) edge node {f(x)} (C);
\\end{tikzpicture}`;

    const newItem: DriveItem = {
      id: tempId,
      name: defaultName,
      mimeType: "text/vnd.tikz",
      modifiedTime: new Date().toISOString(),
      parents: parentId ? [parentId] : undefined,
    };

    setLocalNotes((prev) => [newItem, ...prev]);
    openFileInTab(tempId);
    setNoteContent(defaultContent);
    setLastSavedContent(defaultContent);
    setEditingId(tempId);

    try {
      const realNote = await createMutation.mutateAsync({
        name: defaultName,
        content: defaultContent,
        parentId,
        type: "tikz",
      });
      if (realNote?.id) {
        tabSessionsRef.current[realNote.id] = stableSession;
        utils.notes.get.setData({ id: realNote.id }, defaultContent);

        if (typeof window !== "undefined") {
          const draft = localStorage.getItem(`netherite_draft_${tempId}`);
          if (draft) {
            localStorage.setItem(`netherite_draft_${realNote.id}`, draft);
            localStorage.removeItem(`netherite_draft_${tempId}`);
          }
        }

        utils.notes.list.setData(undefined, (old: any) => {
          const items = old ? [...old] : [];
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realNote.id,
          );
          return [realNote, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  id: realNote.id!,
                  parents: realNote.parents,
                  mimeType: "text/vnd.tikz",
                }
              : item,
          ),
        );
        setOpenTabIds((prev) =>
          prev.map((id) => (id === tempId ? realNote.id! : id)),
        );
        setActiveTabId((current) =>
          current === tempId ? realNote.id! : current,
        );
        setEditingId(realNote.id!);
      }
    } catch (err) {
      console.error("Background TikZ creation failed:", err);
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
          const filtered = items.filter(
            (n: any) => n.id !== tempId && n.id !== realFolder.id,
          );
          return [realFolder, ...filtered];
        });
        setLocalNotes((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? { ...item, id: realFolder.id!, parents: realFolder.parents }
              : item,
          ),
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
    const isFolder =
      targetItem?.mimeType === "application/vnd.google-apps.folder";
    const isImage =
      targetItem?.mimeType?.startsWith("image/") ||
      /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(targetItem?.name ?? "");
    const isDrawing =
      !isImage &&
      (targetItem?.name.endsWith(".excalidraw") ||
        targetItem?.mimeType === "application/vnd.excalidraw+json");
    const isUml =
      !isImage &&
      !isDrawing &&
      (targetItem?.name.endsWith(".apollon") ||
        targetItem?.name.endsWith(".uml") ||
        targetItem?.mimeType === "application/vnd.apollon+json");
    const isMermaid =
      !isImage && !isDrawing && !isUml && isMermaidFile(targetItem);
    const isTikz =
      !isImage && !isDrawing && !isUml && !isMermaid && isTikzFile(targetItem);

    let finalName = newName;
    if (isFolder || isImage) {
      finalName = newName;
    } else if (isDrawing) {
      const cleanName = newName.replace(
        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
        "",
      );
      finalName = `${cleanName}.excalidraw`;
    } else if (isUml) {
      const cleanName = newName.replace(
        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
        "",
      );
      finalName = `${cleanName}.apollon`;
    } else if (isMermaid) {
      const cleanName = newName.replace(
        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
        "",
      );
      finalName = `${cleanName}.mmd`;
    } else if (isTikz) {
      const cleanName = newName.replace(
        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
        "",
      );
      finalName = `${cleanName}.tikz`;
    } else {
      const cleanName = newName.replace(
        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
        "",
      );
      finalName = `${cleanName}.md`;
    }

    setLocalNotes((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, name: finalName } : item,
      ),
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) =>
        item.id === id ? { ...item, name: finalName } : item,
      );
    });

    if (activeTabId === id) {
      setNoteTitle(finalName);
    }

    if (!id.startsWith("temp-")) {
      renameMutation.mutate({ id, newName: finalName });
    }
  };

  // Request delete (intercepts ALL delete actions with a confirmation modal)
  const handleDeleteFile = (id: string) => {
    const item = localNotes.find((n) => n.id === id);
    const isFolder = item?.mimeType === "application/vnd.google-apps.folder";
    setDeleteTarget({
      type: isFolder ? "folder" : "note",
      id,
      name: item?.name || (isFolder ? "Untitled Folder" : "Untitled.md"),
    });
    setIsDeleteModalOpen(true);
  };

  // Request batch delete (intercepts batch deletion with confirmation modal)
  const handleDeleteMultiple = (ids: string[]) => {
    if (!ids.length) return;
    setDeleteTarget({
      type: "batch",
      ids,
      count: ids.length,
      name: `${ids.length} selected items`,
    });
    setIsDeleteModalOpen(true);
  };

  // Confirmed Delete execution (called only when user clicks "Move to Trash")
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);

    if (target.type === "batch" && target.ids?.length) {
      await executeBatchDelete(target.ids);
    } else if (target.id) {
      executeSingleDelete(target.id);
    }
  };

  const executeSingleDelete = (id: string) => {
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

  const executeBatchDelete = async (ids: string[]) => {
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
    await Promise.allSettled(
      realIds.map((id) => deleteMutation.mutateAsync({ id })),
    );
  };

  // 100% INSTANT OPTIMISTIC MOVE TO FOLDER
  const handleMoveItem = (fileId: string, targetFolderId: string) => {
    setLocalNotes((prev) =>
      prev.map((item) =>
        item.id === fileId ? { ...item, parents: [targetFolderId] } : item,
      ),
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) =>
        item.id === fileId ? { ...item, parents: [targetFolderId] } : item,
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
        idsSet.has(item.id) ? { ...item, parents: [targetFolderId] } : item,
      ),
    );
    utils.notes.list.setData(undefined, (old: any) => {
      if (!old) return [];
      return old.map((item: any) =>
        idsSet.has(item.id) ? { ...item, parents: [targetFolderId] } : item,
      );
    });

    const realIds = ids.filter((id) => !id.startsWith("temp-"));
    await Promise.allSettled(
      realIds.map((id) =>
        moveMutation.mutateAsync({ fileId: id, targetFolderId }),
      ),
    );
  };

  const openFileInTab = (fileId: string) => {
    const item = localNotes.find((n) => n.id === fileId);
    if (item?.mimeType === "application/vnd.google-apps.folder") return;

    // 0. Handle unsaved changes for the PREVIOUS file before switching tabs
    const prevFileId = contentFileIdRef.current;
    if (
      prevFileId &&
      prevFileId !== fileId &&
      !prevFileId.startsWith("temp-")
    ) {
      const prevItem = localNotes.find((n) => n.id === prevFileId);
      const isPrevDrawing =
        prevItem?.name.endsWith(".excalidraw") ||
        prevItem?.mimeType === "application/vnd.excalidraw+json";

      let flushed: string | null = null;
      if (activeCanvasRef.current) {
        try {
          flushed = activeCanvasRef.current.flush();
        } catch (e) {
          console.warn("Canvas flush failed:", e);
        }
      }

      const contentToPersist = flushed ?? noteContent;
      const isPrevModified = !isDocumentContentEquivalent(
        isPrevDrawing,
        lastSavedContent,
        contentToPersist,
      );

      if (isPrevModified && contentToPersist && typeof window !== "undefined") {
        try {
          localStorage.setItem(
            `netherite_draft_${prevFileId}`,
            contentToPersist,
          );
          saveBackupSnapshot(prevFileId, contentToPersist);
        } catch {}
        // Trigger background auto-save to Drive so work is never lost
        void saveDocument(prevFileId, contentToPersist, prevItem);
      } else if (!isPrevModified && typeof window !== "undefined") {
        try {
          localStorage.removeItem(`netherite_draft_${prevFileId}`);
        } catch {}
      }
    }

    if (activeSplitCanvasRef.current) {
      try {
        activeSplitCanvasRef.current.flush();
      } catch (e) {}
    }

    if (!tabSessionsRef.current[fileId]) {
      tabSessionsRef.current[fileId] = `session-${fileId}`;
    }

    if (!openTabIds.includes(fileId)) {
      setOpenTabIds([...openTabIds, fileId]);
    }

    contentFileIdRef.current = fileId;

    const isDrawing =
      item?.name.endsWith(".excalidraw") ||
      item?.mimeType === "application/vnd.excalidraw+json";
    const isUml = isUmlFile(item);

    const localCache =
      typeof window !== "undefined"
        ? localStorage.getItem(`netherite_cache_${fileId}`)
        : null;
    const queryCached = utils.notes.get.getData({ id: fileId });
    const baseline =
      (typeof queryCached === "string" ? queryCached : null) ??
      localCache ??
      "";

    // Hydrate note content: check for a genuine unsaved draft
    const unsavedDraft = getUnsavedDraft(fileId, isDrawing, baseline);
    let contentToSet = "";
    let baselineToSet = "";

    if (unsavedDraft) {
      contentToSet = unsavedDraft;
      baselineToSet = baseline;
    } else {
      contentToSet = baseline;
      baselineToSet = baseline;
    }

    setNoteContent(contentToSet);
    setLastSavedContent(baselineToSet);
    setActiveTabId(fileId);
    setActiveView("editor");
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsOutlineOpen(false);
      setMobileScreen("editor");
    }
  };

  const closeTab = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = localNotes.find((n) => n.id === fileId);
    const isDrawing =
      item?.name.endsWith(".excalidraw") ||
      item?.mimeType === "application/vnd.excalidraw+json";
    const isThisTabDirty = activeTabId === fileId && isDirty;
    const hasDraft = Boolean(getUnsavedDraft(fileId, isDrawing));

    // Flush active drawing canvas if this was the active tab
    let flushedContent: string | null = null;
    if (activeTabId === fileId && activeCanvasRef.current) {
      try {
        flushedContent = activeCanvasRef.current.flush();
      } catch {}
    }

    // Java finally {} behavior: ensure final persistence to Google Drive when tab closes
    if (isThisTabDirty || hasDraft) {
      const contentToPersist =
        flushedContent ??
        (activeTabId === fileId
          ? noteContent
          : localStorage.getItem(`netherite_draft_${fileId}`));
      if (contentToPersist) {
        void saveDocument(fileId, contentToPersist, item);
      }
    }

    const closedIndex = openTabIds.indexOf(fileId);
    const updated = openTabIds.filter((id) => id !== fileId);
    setOpenTabIds(updated);

    if (activeTabId === fileId) {
      if (updated.length === 0) {
        contentFileIdRef.current = null;
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

  const handleOpenSyncModal = () => {
    const hasLocalDraft =
      typeof window !== "undefined" &&
      activeTabId &&
      localStorage.getItem(`netherite_draft_${activeTabId}`) !== null;

    if (isDirty || hasLocalDraft) {
      setIsSyncModalOpen(true);
    } else {
      void executeSync(false);
    }
  };

  const executeSync = async (clearAllDrafts: boolean) => {
    if (isSyncing || !session?.user) return;
    setIsSyncing(true);

    try {
      if (typeof window !== "undefined") {
        if (activeTabId) {
          localStorage.removeItem(`netherite_draft_${activeTabId}`);
          clearChangelog(activeTabId);
        }

        if (clearAllDrafts) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("netherite_draft_")) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
        }
      }

      pendingImagesRef.current.clear();

      await Promise.all([
        utils.notes.list.refetch(),
        utils.notes.getMetadata.refetch(),
      ]);

      if (activeTabId && !activeTabId.startsWith("temp-")) {
        await utils.notes.get.invalidate({ id: activeTabId });
        const fresh = await utils.notes.get.fetch(
          { id: activeTabId },
          { staleTime: 0 },
        );
        const cleanContent = typeof fresh === "string" ? fresh : "";
        setNoteContent(cleanContent);
        setLastSavedContent(cleanContent);
        setContentRevision((r) => r + 1);

        if (
          activeEditorRef.current &&
          !activeEditorRef.current.isDestroyed &&
          activeEditorRef.current.view
        ) {
          try {
            activeEditorRef.current.commands?.setContent(cleanContent, {
              emitUpdate: false,
            });
          } catch {}
        }
      }

      if (isSplitView && splitTabId && !splitTabId.startsWith("temp-")) {
        await utils.notes.get.invalidate({ id: splitTabId });
        const freshSplit = await utils.notes.get.fetch(
          { id: splitTabId },
          { staleTime: 0 },
        );
        const cleanSplit = typeof freshSplit === "string" ? freshSplit : "";
        setSplitNoteContent(cleanSplit);
      }

      setIsSyncModalOpen(false);

      const scopeCheck = await utils.notes.checkScope.fetch().catch(() => null);
      if (scopeCheck && !scopeCheck.hasFullDriveScope) {
        showToast(
          "Drive permissions update required to access files created directly in Google Drive. Re-authorize in Sync menu.",
        );
      } else {
        showToast(
          isDirty
            ? "Discarded local changes and synced latest from Google Drive."
            : "Workspace is in sync with Google Drive.",
        );
      }
    } catch (err: any) {
      console.error("Failed to sync from Google Drive:", err);
      const errMsg = String(err?.message || err || "");
      if (
        errMsg.includes("invalid_grant") ||
        errMsg.includes("authorization expired")
      ) {
        showToast(
          "Google authorization expired. Please sign out and sign back in.",
        );
      } else {
        showToast("Failed to sync with Drive. Please check your connection.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([noteContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = noteTitle || "note.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Unauthenticated Landing Page
  if (!session?.user) {
    return <LandingPage />;
  }

  return (
    <div className="bg-background text-foreground flex h-screen w-screen overflow-hidden">
      {/* VS Code Style Left Sidebar */}
      <Sidebar
        userSession={session}
        notes={localNotes}
        activeNoteId={activeTabId}
        activeNoteContent={noteContent}
        onToast={showToast}
        onSelectNote={(id) => {
          if (isSplitView && activePane === "split") {
            if (!openTabIds.includes(id)) {
              setOpenTabIds((prev) => [...prev, id]);
            }
            setSplitTabId(id);
          } else {
            openFileInTab(id);
          }
        }}
        onCreateNote={handleCreateFile}
        onCreateDrawing={handleCreateDrawing}
        onCreateUml={handleOpenCreateDiagramModal}
        onCreateMermaid={handleCreateMermaid}
        onCreateTikz={handleCreateTikz}
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
        onManualSync={handleOpenSyncModal}
        isSyncing={isSyncing}
        onDeepSync={handleDeepSync}
        isDeepSyncing={deepSyncMutation.isPending}
        onToggleDiff={toggleDiffSidebar}
        isDiffOpen={isDiffSidebarOpen}
        onOpenCalendar={() => setActiveView("calendar")}
        isCalendarActive={activeView === "calendar"}
        isMutating={
          createMutation.isPending ||
          renameMutation.isPending ||
          deleteMutation.isPending ||
          createFolderMutation.isPending ||
          moveMutation.isPending
        }
        loadingNoteId={isDocumentLoading ? activeTabId : undefined}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        folderToExpand={folderToExpand}
      />

      {/* Main Workspace Container */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className={mobileScreen === "library" ? "hidden sm:block" : "block"}
        >
          <HeaderBar
            noteTitle={
              activeView === "calendar"
                ? "Google Calendar Studio"
                : isSplitView && activePane === "split" && currentSplitNote
                  ? currentSplitNote.name
                  : activeTabId && currentNote
                    ? currentNote.name
                    : ""
            }
            isSaving={isSaving}
            isDirty={isDirty}
            diffSummary={diffSummary}
            onOpenDiff={() => setIsDiffModalOpen(true)}
            onManualSync={handleOpenSyncModal}
            isSyncing={isSyncing}
            isDiffOpen={isDiffSidebarOpen}
            onToggleDiff={toggleDiffSidebar}
            isSplitView={isSplitView}
            onToggleSplitView={() => {
              const next = !isSplitView;
              setIsSplitView(next);
              if (!next) {
                setActivePane("primary");
              } else if (!splitTabId && localNotes.length > 1) {
                const other = localNotes.find(
                  (n) =>
                    n.id !== activeTabId &&
                    n.mimeType !== "application/vnd.google-apps.folder",
                );
                if (other) setSplitTabId(other.id);
              }
            }}
            onSave={() => {
              if (
                isSplitView &&
                activePane === "split" &&
                splitTabId &&
                !splitTabId.startsWith("temp-")
              ) {
                saveDocument(splitTabId, splitNoteContent, currentSplitNote);
              } else {
                handleManualSave();
              }
            }}
            onExportMarkdown={handleExportMarkdown}
            onExportPdf={() => setIsPdfModalOpen(true)}
            onToggleSidebar={() => {
              if (typeof window !== "undefined" && window.innerWidth < 640) {
                setMobileScreen((prev) =>
                  prev === "library" ? "editor" : "library",
                );
              } else {
                setSidebarCollapsed(!sidebarCollapsed);
              }
            }}
            sidebarCollapsed={sidebarCollapsed}
            wordCount={wordCount}
            charCount={charCount}
            editorFont={editorFont}
            onEditorFontChange={(font) => setEditorFont(font)}
            isOutlineOpen={isOutlineOpen}
            onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
            isCopilotOpen={isCopilotOpen}
            onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            zenMode={zenMode}
            onToggleZenMode={handleToggleZenMode}
          />
        </div>

        {/* VS Code / Antigravity Style Tab Management Bar (Hidden in Zen Mode) */}
        {!zenMode && (openTabIds.length > 0 || activeView === "calendar") && (
          <div className="border-border bg-muted/30 hidden h-9 shrink-0 items-center justify-between overflow-x-auto border-b px-0 select-none sm:flex">
            <div
              ref={tabBarRef}
              onWheel={(e) => {
                if (tabBarRef.current && e.deltaY !== 0) {
                  tabBarRef.current.scrollLeft += e.deltaY;
                }
              }}
              className="flex h-full scrollbar-none items-center overflow-x-auto"
            >
              {/* Google Calendar Studio Tab */}
              <button
                onClick={() =>
                  setActiveView(
                    activeView === "calendar" ? "editor" : "calendar",
                  )
                }
                className={`border-border/70 flex h-full cursor-pointer items-center gap-1.5 border-r px-3 text-xs transition-all ${
                  activeView === "calendar"
                    ? "bg-card border-t-2 border-t-blue-500 font-medium text-blue-600 shadow-2xs dark:text-blue-400"
                    : "bg-muted/15 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
                title="Google Calendar Studio"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                <span className="font-medium">Calendar</span>
              </button>

              {openTabIds.map((tabId) => {
                const note = localNotes.find((n) => n.id === tabId);
                const isPrimaryActive =
                  activeView === "editor" && activeTabId === tabId;
                const isSplitTab = isSplitView && splitTabId === tabId;
                const isActive = isSplitView
                  ? activePane === "split"
                    ? isSplitTab
                    : isPrimaryActive
                  : isPrimaryActive;
                const hasLocalDiff = isPrimaryActive ? isDirty : false;
                const isTabLoading = isPrimaryActive && isDocumentLoading;

                return (
                  <div
                    key={tabId}
                    draggable
                    onDragStart={() => setDraggedTabId(tabId)}
                    onDragEnd={() => setDraggedTabId(null)}
                    onClick={() => {
                      if (isSplitView && activePane === "split") {
                        if (
                          splitTabId &&
                          splitTabId !== tabId &&
                          !splitTabId.startsWith("temp-")
                        ) {
                          const prevSplitItem = localNotes.find(
                            (n) => n.id === splitTabId,
                          );
                          const isPrevSplitDrawing =
                            prevSplitItem?.name.endsWith(".excalidraw") ||
                            prevSplitItem?.mimeType ===
                              "application/vnd.excalidraw+json";
                          let flushed: string | null = null;
                          if (activeSplitCanvasRef.current) {
                            try {
                              flushed = activeSplitCanvasRef.current.flush();
                            } catch {}
                          }
                          const contentToPersist = flushed ?? splitNoteContent;
                          const cached =
                            localStorage.getItem(
                              `netherite_cache_${splitTabId}`,
                            ) || "";
                          const isModified = !isDocumentContentEquivalent(
                            isPrevSplitDrawing,
                            cached,
                            contentToPersist,
                          );
                          if (isModified && contentToPersist) {
                            localStorage.setItem(
                              `netherite_draft_${splitTabId}`,
                              contentToPersist,
                            );
                            saveBackupSnapshot(splitTabId, contentToPersist);
                            void saveDocument(
                              splitTabId,
                              contentToPersist,
                              prevSplitItem,
                            );
                          } else {
                            localStorage.removeItem(
                              `netherite_draft_${splitTabId}`,
                            );
                          }
                        }

                        const targetItem = localNotes.find(
                          (n) => n.id === tabId,
                        );
                        const isTargetDrawing =
                          targetItem?.name.endsWith(".excalidraw") ||
                          targetItem?.mimeType ===
                            "application/vnd.excalidraw+json";
                        const targetDraft = getUnsavedDraft(
                          tabId,
                          isTargetDrawing,
                        );
                        const cached =
                          utils.notes.get.getData({ id: tabId }) ||
                          localStorage.getItem(`netherite_cache_${tabId}`) ||
                          "";
                        setSplitNoteContent(
                          targetDraft ??
                            (typeof cached === "string" ? cached : ""),
                        );
                        setSplitTabId(tabId);
                      } else {
                        openFileInTab(tabId);
                      }
                    }}
                    className={`group border-border/70 flex h-full cursor-pointer items-center gap-2 border-r px-3.5 text-xs transition-all ${
                      isActive
                        ? "bg-card text-foreground border-t-foreground border-t-2 font-medium shadow-2xs"
                        : isSplitTab
                          ? "bg-muted/30 text-foreground border-t-primary/50 border-t-2 font-medium"
                          : "bg-muted/15 text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    }`}
                  >
                    {isTabLoading ? (
                      <AppleSpinner
                        size="xs"
                        className="text-foreground shrink-0"
                      />
                    ) : note?.name.endsWith(".excalidraw") ||
                      note?.mimeType === "application/vnd.excalidraw+json" ? (
                      <Palette
                        className={`h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 ${isActive ? "opacity-100" : "opacity-70"}`}
                      />
                    ) : isUmlFile(note) ? (
                      <Network
                        className={`h-3.5 w-3.5 text-purple-500 dark:text-purple-400 ${isActive ? "opacity-100" : "opacity-70"}`}
                      />
                    ) : isMermaidFile(note) ? (
                      <Workflow
                        className={`h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 ${isActive ? "opacity-100" : "opacity-70"}`}
                      />
                    ) : isTikzFile(note) ? (
                      <Activity
                        className={`h-3.5 w-3.5 text-blue-500 dark:text-blue-400 ${isActive ? "opacity-100" : "opacity-70"}`}
                      />
                    ) : (
                      <FileText
                        className={`h-3.5 w-3.5 ${isActive ? "text-foreground" : "opacity-60"}`}
                      />
                    )}
                    <span className="max-w-[130px] truncate">
                      {(note?.name || "Untitled").replace(
                        /\.(md|excalidraw|apollon|uml|mmd|mermaid|tikz|tex)$/i,
                        "",
                      )}
                    </span>
                    {isSplitView && isSplitTab && (
                      <span
                        className="bg-primary/60 h-1.5 w-1.5 shrink-0 rounded-full"
                        title="Open in Split Pane"
                      />
                    )}
                    <div className="ml-1 flex items-center">
                      {hasLocalDiff ? (
                        <button
                          onClick={(e) => closeTab(tabId, e)}
                          className="hover:bg-accent flex h-4 w-4 items-center justify-center rounded transition-colors"
                          title="Unsaved changes (Click to close)"
                        >
                          <span className="bg-foreground h-2 w-2 rounded-full group-hover:hidden" />
                          <X className="hidden h-3 w-3 group-hover:block" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => closeTab(tabId, e)}
                          className="hover:bg-accent text-muted-foreground hover:text-foreground flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100"
                          title="Close"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => handleCreateFile()}
                className="hover:bg-accent text-muted-foreground hover:text-foreground ml-1 rounded p-1.5 transition-colors"
                title="New Note Tab"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleCreateDrawing()}
                className="hover:bg-accent text-muted-foreground hover:text-foreground mr-1 rounded p-1.5 transition-colors"
                title="New Whiteboard Tab"
              >
                <Palette className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              </button>
            </div>

            {/* Right Tab Bar Actions (VS Code Style) */}
            <div className="flex shrink-0 items-center gap-1 px-2">
              {isDirty && (
                <button
                  onClick={() => setIsDiffModalOpen(true)}
                  className="hover:bg-accent flex shrink-0 items-center gap-1 rounded px-1.5 py-1 font-mono text-[11px] font-semibold text-amber-500 transition-colors"
                  title={`Inspect Browser Diff & Changelog (${diffSummary || "Unsaved changes"})`}
                >
                  <GitCompare className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden whitespace-nowrap xl:inline">
                    {diffSummary}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  const next = !isSplitView;
                  setIsSplitView(next);
                  if (!next) {
                    setActivePane("primary");
                  } else if (!splitTabId && localNotes.length > 1) {
                    const other = localNotes.find(
                      (n) =>
                        n.id !== activeTabId &&
                        n.mimeType !== "application/vnd.google-apps.folder",
                    );
                    if (other) setSplitTabId(other.id);
                  }
                }}
                className={`hover:bg-accent shrink-0 rounded p-1.5 transition-colors ${
                  isSplitView
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Split Editor Right"
              >
                <Columns className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Body (Editor + Right Outline Sidebar OR Google Calendar Studio) */}
        {activeView === "calendar" ? (
          <div className="bg-background min-h-0 min-w-0 flex-1 overflow-hidden pb-22 sm:pb-0">
            <CalendarView
              onClose={() => setActiveView("editor")}
              onOpenNote={(noteId) => {
                openFileInTab(noteId);
                setActiveView("editor");
              }}
              onRefreshNotes={() => {
                utils.notes.list.invalidate();
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden pb-22 sm:pb-0">
            {/* Native Mobile Library Screen (Replaces Sidebar on Phone) */}
            {mobileScreen === "library" && (
              <div className="flex h-full flex-1 flex-col overflow-hidden sm:hidden">
                <MobileLibraryScreen
                  notes={localNotes}
                  activeNoteId={activeTabId}
                  onSelectNote={(id) => {
                    openFileInTab(id);
                    setMobileScreen("editor");
                  }}
                  onCreateNote={(parentId) => {
                    handleCreateFile(parentId);
                    setMobileScreen("editor");
                  }}
                  onCreateFolder={handleCreateFolder}
                  onCreateDrawing={(parentId) => {
                    handleCreateDrawing(parentId);
                    setMobileScreen("editor");
                  }}
                  onClose={() => setMobileScreen("editor")}
                  folderColors={folderColors}
                  isLoading={isNotesLoading && localNotes.length === 0}
                />
              </div>
            )}

            <main
              ref={workspaceSplitContainerRef}
              className={`${mobileScreen === "library" ? "hidden sm:flex" : "flex"} bg-background flex-1 overflow-hidden ${
                isSplitView ? "relative flex-row" : "flex-col"
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
              {localNotes.filter(
                (n) => n.mimeType !== "application/vnd.google-apps.folder",
              ).length === 0 ? (
                <div className="border-border flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center">
                  <FileText className="text-muted-foreground mb-4 h-12 w-12 opacity-30" />
                  <h3 className="text-foreground mb-2 text-lg font-bold">
                    No Files Found
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-sm text-xs">
                    Your Netherite Google Drive folder is empty. Create a file
                    to start writing!
                  </p>
                  <button
                    onClick={() => handleCreateFile()}
                    className="bg-foreground text-background flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Create First Note
                  </button>
                </div>
              ) : !activeTabId || openTabIds.length === 0 ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-8 select-none">
                  <div className="animate-in fade-in flex w-full max-w-md flex-col items-center space-y-6 text-center duration-300">
                    <div className="bg-muted/60 border-border/80 flex h-16 w-16 items-center justify-center rounded-2xl border shadow-sm">
                      <FileText className="text-foreground/40 h-8 w-8" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-foreground text-xl font-semibold tracking-tight">
                        No Note Open
                      </h3>
                      <p className="text-muted-foreground mx-auto max-w-xs text-xs sm:text-sm">
                        Select a note from the sidebar to start writing, or
                        create a new one.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleCreateFile()}
                        className="bg-foreground text-background flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium shadow-sm transition-all hover:opacity-90 active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        New Note
                      </button>
                      <button
                        onClick={() => handleCreateDrawing()}
                        className="bg-muted hover:bg-muted/80 text-foreground border-border/60 flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-2xs transition-all active:scale-95"
                      >
                        <Palette className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                        New Whiteboard
                      </button>
                      <button
                        onClick={() => setSidebarCollapsed(false)}
                        className="bg-muted hover:bg-muted/80 text-foreground border-border/60 flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium shadow-2xs transition-all active:scale-95"
                      >
                        <Search className="text-muted-foreground h-3.5 w-3.5" />
                        Browse Notes
                      </button>
                    </div>

                    <div className="border-border/40 text-muted-foreground/80 flex w-full max-w-xs flex-col gap-2 border-t pt-6 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span>Create note</span>
                        <kbd className="bg-muted border-border rounded border px-1.5 py-0.5 text-[10px]">
                          Ctrl + N
                        </kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Save note / whiteboard</span>
                        <kbd className="bg-muted border-border rounded border px-1.5 py-0.5 text-[10px]">
                          Ctrl + S
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Primary Pane */}
                  <div
                    data-pane="primary"
                    data-active-pane={activePane === "primary"}
                    style={
                      isSplitView
                        ? { width: `${splitRatio * 100}%` }
                        : { width: "100%" }
                    }
                    onPointerDown={() => {
                      if (isSplitView && activePane !== "primary")
                        setActivePane("primary");
                    }}
                    onFocusCapture={() => {
                      if (isSplitView && activePane !== "primary")
                        setActivePane("primary");
                    }}
                    className={`relative flex h-full shrink-0 flex-col overflow-hidden ${
                      isResizingSplit ? "pointer-events-none select-none" : ""
                    }`}
                  >
                    {isSplitView && (
                      <div className="border-border/70 bg-muted/20 flex h-8 shrink-0 items-center justify-between border-b px-3 text-xs select-none">
                        <div className="flex min-w-0 items-center gap-2">
                          {isCurrentDrawing ? (
                            <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                          ) : isCurrentUml ? (
                            <Network className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                          ) : isCurrentMermaid ? (
                            <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                          ) : isCurrentTikz ? (
                            <Activity className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                          ) : (
                            <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="text-foreground max-w-[180px] truncate font-medium">
                            {currentNote?.name || "Main Document"}
                          </span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${
                              activePane === "primary"
                                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                                : "bg-muted-foreground/30"
                            }`}
                            title={
                              activePane === "primary"
                                ? "Active pane"
                                : "Inactive pane"
                            }
                          />
                        </div>
                      </div>
                    )}
                    {isCurrentImage ? (
                      <ImageViewer
                        key={activeTabId}
                        fileId={currentNote?.id || ""}
                        fileName={currentNote?.name || "image"}
                        mimeType={currentNote?.mimeType}
                      />
                    ) : isUmlFile(currentNote) ? (
                      isDocumentLoading && isEmptyApollon(noteContent) ? (
                        <MacFileLoader
                          fileName={currentNote?.name}
                          fileType="uml"
                          message="Opening UML diagram from Google Drive…"
                        />
                      ) : (
                        <UmlCanvas
                          key={`${tabSessionsRef.current[activeTabId || ""] || activeTabId}-${contentRevision}`}
                          initialContent={noteContent}
                          theme={isDark ? "dark" : "light"}
                          onChange={(updatedContent) => {
                            setNoteContent(updatedContent);
                            if (activeTabId && typeof window !== "undefined") {
                              localStorage.setItem(
                                `netherite_draft_${activeTabId}`,
                                updatedContent,
                              );
                            }
                          }}
                          onSave={handleManualSave}
                        />
                      )
                    ) : isMermaidFile(currentNote) ? (
                      isDocumentLoading &&
                      (!noteContent || noteContent.trim() === "") ? (
                        <MacFileLoader
                          fileName={currentNote?.name}
                          fileType="mermaid"
                          message="Opening Mermaid chart from Google Drive…"
                        />
                      ) : (
                        <MermaidCanvas
                          key={`${tabSessionsRef.current[activeTabId || ""] || activeTabId}-${contentRevision}`}
                          initialContent={noteContent}
                          theme={isDark ? "dark" : "light"}
                          title={currentNote?.name}
                          onChange={(updatedContent) => {
                            setNoteContent(updatedContent);
                            if (activeTabId && typeof window !== "undefined") {
                              localStorage.setItem(
                                `netherite_draft_${activeTabId}`,
                                updatedContent,
                              );
                            }
                          }}
                          onSave={handleManualSave}
                        />
                      )
                    ) : isTikzFile(currentNote) ? (
                      isDocumentLoading &&
                      (!noteContent || noteContent.trim() === "") ? (
                        <MacFileLoader
                          fileName={currentNote?.name}
                          fileType="tikz"
                          message="Opening TikZ LaTeX diagram from Google Drive…"
                        />
                      ) : (
                        <TikzCanvas
                          key={`${tabSessionsRef.current[activeTabId || ""] || activeTabId}-${contentRevision}`}
                          initialContent={noteContent}
                          theme={isDark ? "dark" : "light"}
                          title={currentNote?.name}
                          onChange={(updatedContent) => {
                            setNoteContent(updatedContent);
                            if (activeTabId && typeof window !== "undefined") {
                              localStorage.setItem(
                                `netherite_draft_${activeTabId}`,
                                updatedContent,
                              );
                            }
                          }}
                          onSave={handleManualSave}
                        />
                      )
                    ) : currentNote?.name?.endsWith(".excalidraw") ||
                      currentNote?.mimeType ===
                        "application/vnd.excalidraw+json" ? (
                      isDocumentLoading && isEmptyExcalidraw(noteContent) ? (
                        <MacFileLoader
                          fileName={currentNote?.name}
                          fileType="drawing"
                          message="Opening whiteboard canvas from Google Drive…"
                        />
                      ) : (
                        <DrawingCanvas
                          ref={activeCanvasRef}
                          fileId={activeTabId}
                          key={`${tabSessionsRef.current[activeTabId || ""] || activeTabId}-${contentRevision}`}
                          initialContent={noteContent}
                          lastSavedContent={lastSavedContent}
                          theme={isDark ? "dark" : "light"}
                          onChange={(updatedContent) => {
                            if (contentFileIdRef.current === activeTabId) {
                              setNoteContent(updatedContent);
                            }
                          }}
                          onSave={handleManualSave}
                        />
                      )
                    ) : isDocumentLoading &&
                      (!noteContent || noteContent === "") ? (
                      <MacFileLoader
                        fileName={currentNote?.name}
                        fileType="note"
                        message="Opening note from Google Drive…"
                      />
                    ) : (
                      <Editor
                        key={`${tabSessionsRef.current[activeTabId || ""] || activeTabId}-${contentRevision}`}
                        initialContent={noteContent}
                        title={currentNote?.name || "Untitled.md"}
                        editorFont={editorFont}
                        isLoading={false}
                        textOnlyClipboard={textOnlyClipboard}
                        onTitleChange={(newTitle) => {
                          if (activeTabId) {
                            handleRenameFile(activeTabId, newTitle);
                          }
                        }}
                        onChange={(updatedContent) => {
                          setNoteContent(updatedContent);
                          if (activeTabId && typeof window !== "undefined") {
                            localStorage.setItem(
                              `netherite_draft_${activeTabId}`,
                              updatedContent,
                            );
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
                    )}
                  </div>

                  {/* Center Draggable Resizer */}
                  {isSplitView && (
                    <div
                      role="separator"
                      aria-orientation="vertical"
                      tabIndex={0}
                      onPointerDown={handleSplitResizeStart}
                      className={`group relative z-30 -mx-[3px] flex w-1.5 cursor-col-resize items-center justify-center transition-all select-none hover:w-2 ${
                        isResizingSplit
                          ? "bg-primary/30 w-2"
                          : "hover:bg-primary/20 bg-transparent"
                      }`}
                      title="Drag to resize split view width"
                    >
                      <div
                        className={`h-full w-[1px] transition-colors ${
                          isResizingSplit
                            ? "bg-primary"
                            : "bg-border/80 group-hover:bg-primary/80"
                        }`}
                      />
                    </div>
                  )}

                  {/* Secondary Split Pane */}
                  {isSplitView && (
                    <div
                      data-pane="split"
                      data-active-pane={activePane === "split"}
                      style={{ width: `${(1 - splitRatio) * 100}%` }}
                      onPointerDown={() => {
                        if (activePane !== "split") setActivePane("split");
                      }}
                      onFocusCapture={() => {
                        if (activePane !== "split") setActivePane("split");
                      }}
                      className={`relative flex h-full shrink-0 flex-col overflow-hidden ${
                        isResizingSplit ? "pointer-events-none select-none" : ""
                      } ${
                        isOverSplitTarget
                          ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
                          : ""
                      }`}
                    >
                      <div className="border-border/70 bg-muted/20 flex h-8 shrink-0 items-center justify-between border-b px-3 text-xs select-none">
                        <div className="flex min-w-0 items-center gap-2">
                          {isSplitDrawing ? (
                            <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                          ) : isSplitUml ? (
                            <Network className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                          ) : isSplitMermaid ? (
                            <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                          ) : isSplitTikz ? (
                            <Activity className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
                          ) : (
                            <FileText className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="text-foreground max-w-[180px] truncate font-medium">
                            {currentSplitNote?.name || "Split Document"}
                          </span>
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${
                              activePane === "split"
                                ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
                                : "bg-muted-foreground/30"
                            }`}
                            title={
                              activePane === "split"
                                ? "Active pane"
                                : "Inactive pane"
                            }
                          />
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (splitTabId && activeTabId) {
                                const prevPrimary = activeTabId;
                                openFileInTab(splitTabId);
                                setSplitTabId(prevPrimary);
                              }
                            }}
                            className="hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
                            title="Swap Panes"
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSplitView(false);
                              setActivePane("primary");
                            }}
                            className="hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer rounded p-1 transition-colors"
                            title="Close Split View"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {isSplitImage ? (
                        <ImageViewer
                          key={splitTabId || "split-image"}
                          fileId={currentSplitNote?.id || ""}
                          fileName={currentSplitNote?.name || "image"}
                          mimeType={currentSplitNote?.mimeType}
                        />
                      ) : isUmlFile(currentSplitNote) ? (
                        isSplitDocumentLoading &&
                        isEmptyApollon(splitNoteContent) ? (
                          <MacFileLoader
                            fileName={currentSplitNote?.name}
                            fileType="uml"
                            message="Opening UML diagram in split pane…"
                          />
                        ) : (
                          <UmlCanvas
                            key={splitTabId || "split-uml"}
                            initialContent={splitNoteContent}
                            theme={isDark ? "dark" : "light"}
                            onChange={(updatedContent) =>
                              setSplitNoteContent(updatedContent)
                            }
                            onSave={() => {
                              if (
                                splitTabId &&
                                !splitTabId.startsWith("temp-")
                              ) {
                                saveDocument(
                                  splitTabId,
                                  splitNoteContent,
                                  currentSplitNote,
                                );
                              }
                            }}
                          />
                        )
                      ) : isMermaidFile(currentSplitNote) ? (
                        isSplitDocumentLoading &&
                        (!splitNoteContent ||
                          splitNoteContent.trim() === "") ? (
                          <MacFileLoader
                            fileName={currentSplitNote?.name}
                            fileType="mermaid"
                            message="Opening Mermaid chart in split pane…"
                          />
                        ) : (
                          <MermaidCanvas
                            key={splitTabId || "split-mermaid"}
                            initialContent={splitNoteContent}
                            theme={isDark ? "dark" : "light"}
                            title={currentSplitNote?.name}
                            onChange={(updatedContent) =>
                              setSplitNoteContent(updatedContent)
                            }
                            onSave={() => {
                              if (
                                splitTabId &&
                                !splitTabId.startsWith("temp-")
                              ) {
                                saveDocument(
                                  splitTabId,
                                  splitNoteContent,
                                  currentSplitNote,
                                );
                              }
                            }}
                          />
                        )
                      ) : isTikzFile(currentSplitNote) ? (
                        isSplitDocumentLoading &&
                        (!splitNoteContent ||
                          splitNoteContent.trim() === "") ? (
                          <MacFileLoader
                            fileName={currentSplitNote?.name}
                            fileType="tikz"
                            message="Opening TikZ LaTeX diagram in split pane…"
                          />
                        ) : (
                          <TikzCanvas
                            key={splitTabId || "split-tikz"}
                            initialContent={splitNoteContent}
                            theme={isDark ? "dark" : "light"}
                            title={currentSplitNote?.name}
                            onChange={(updatedContent) =>
                              setSplitNoteContent(updatedContent)
                            }
                            onSave={() => {
                              if (
                                splitTabId &&
                                !splitTabId.startsWith("temp-")
                              ) {
                                saveDocument(
                                  splitTabId,
                                  splitNoteContent,
                                  currentSplitNote,
                                );
                              }
                            }}
                          />
                        )
                      ) : currentSplitNote?.name?.endsWith(".excalidraw") ||
                        currentSplitNote?.mimeType ===
                          "application/vnd.excalidraw+json" ? (
                        isSplitDocumentLoading &&
                        isEmptyExcalidraw(splitNoteContent) ? (
                          <MacFileLoader
                            fileName={currentSplitNote?.name}
                            fileType="drawing"
                            message="Opening whiteboard in split pane…"
                          />
                        ) : (
                          <DrawingCanvas
                            ref={activeSplitCanvasRef}
                            fileId={splitTabId}
                            key={splitTabId || "split-drawing"}
                            initialContent={splitNoteContent}
                            lastSavedContent={
                              (typeof window !== "undefined" && splitTabId
                                ? localStorage.getItem(
                                    `netherite_cache_${splitTabId}`,
                                  )
                                : null) ||
                              (splitTabId
                                ? (utils.notes.get.getData({
                                    id: splitTabId,
                                  }) as string | undefined)
                                : "") ||
                              ""
                            }
                            theme={isDark ? "dark" : "light"}
                            onChange={(updatedContent) => {
                              setSplitNoteContent(updatedContent);
                            }}
                            onSave={() => {
                              if (
                                splitTabId &&
                                !splitTabId.startsWith("temp-")
                              ) {
                                void saveDocument(
                                  splitTabId,
                                  splitNoteContent,
                                  currentSplitNote,
                                );
                              }
                            }}
                          />
                        )
                      ) : isSplitDocumentLoading &&
                        (!splitNoteContent || splitNoteContent === "") ? (
                        <MacFileLoader
                          fileName={currentSplitNote?.name}
                          fileType="note"
                          message="Opening note in split pane…"
                        />
                      ) : (
                        <Editor
                          key={splitTabId || "split-editor"}
                          initialContent={splitNoteContent}
                          title={currentSplitNote?.name || "Split Document.md"}
                          editorFont={editorFont}
                          textOnlyClipboard={textOnlyClipboard}
                          onChange={(updatedContent) => {
                            setSplitNoteContent(updatedContent);
                            if (splitTabId && typeof window !== "undefined") {
                              localStorage.setItem(
                                `netherite_draft_${splitTabId}`,
                                updatedContent,
                              );
                            }
                          }}
                          onSave={() => {
                            if (splitTabId && !splitTabId.startsWith("temp-")) {
                              saveDocument(
                                splitTabId,
                                splitNoteContent,
                                currentSplitNote,
                              );
                            }
                          }}
                          onImageUpload={handleImageUpload}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </main>

            {/* Right Outline Sidebar - strictly only for Markdown (.md) documents */}
            {isCurrentMarkdown && (
              <OutlineSidebar
                isOpen={isOutlineOpen}
                onClose={() => setIsOutlineOpen(false)}
                headings={documentHeadings}
                onSelectHeading={(text) => {
                  // Smooth scroll to heading element in editor
                  const editorElements = Array.from(
                    document.querySelectorAll(
                      "h1, h2, h3, h4, h5, h6, [data-type='heading']",
                    ),
                  );
                  const match = editorElements.find((el) => {
                    const elText = (el.textContent || "").trim().toLowerCase();
                    const targetText = text.trim().toLowerCase();
                    return (
                      elText.includes(targetText) || targetText.includes(elText)
                    );
                  });
                  if (match) {
                    match.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                  }
                }}
              />
            )}

            {/* Gemini AI Copilot Right Sidebar */}
            <GeminiCopilotSidebar
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
              currentNoteTitle={currentNote?.name || noteTitle}
              currentNoteContent={noteContent}
              onInsertContent={(content) => {
                if (!isCurrentMarkdown) {
                  showToast(
                    "Cannot insert markdown into a vector drawing or architecture model.",
                  );
                  return;
                }
                setNoteContent((prev) =>
                  prev ? `${prev}\n\n${content}` : content,
                );
              }}
              onReplaceContent={(content) => {
                if (!isCurrentMarkdown) {
                  showToast(
                    "Cannot replace canvas diagram structure with raw markdown.",
                  );
                  return;
                }
                setNoteContent(content);
              }}
              onCreateNoteWithContent={async (title, content) => {
                await handleCreateFile(undefined);
                setNoteTitle(title.endsWith(".md") ? title : `${title}.md`);
                setNoteContent(content);
              }}
            />

            {/* Toggleable Git Diff Right Sidebar */}
            <DiffSidebar
              isOpen={isDiffSidebarOpen}
              onClose={() => setIsDiffSidebarOpen(false)}
              noteTitle={currentNote?.name || noteTitle || "Untitled.md"}
              noteId={activeTabId || ""}
              baselineContent={lastSavedContent}
              currentContent={noteContent}
              onSaveToDrive={handleManualSave}
              isSaving={saveMutation.isPending || isSaving}
              onDiscardAndSync={() => {
                void executeSync(false);
              }}
              isSyncing={isSyncing}
            />
          </div>
        )}

        {/* VS Code / Antigravity IDE Bottom Status Bar (Desktop only) */}
        <footer className="border-border/60 bg-muted/40 text-muted-foreground flex hidden h-6 shrink-0 items-center justify-between border-t px-3 font-mono text-[11px] select-none sm:flex">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${activeView === "calendar" ? "bg-blue-500" : "bg-emerald-500"}`}
              />
              <span>
                {activeView === "calendar"
                  ? "Google Calendar Studio"
                  : "Google Drive"}
              </span>
            </span>
            {isDirty && (
              <span className="flex items-center gap-1 font-medium text-amber-500">
                <span>●</span> Unsaved changes
              </span>
            )}
            {isSaving && (
              <span className="text-primary animate-pulse">Saving…</span>
            )}
          </div>

          {/* Author Attribution */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span>Made with</span>
            <span
              className="text-foreground text-xs leading-none font-bold select-none"
              title="Monochrome"
            >
              ♥
            </span>
            <span>by</span>
            <a
              href="https://github.com/parv141206"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground font-medium transition-colors hover:underline"
            >
              Parv Shah
            </a>
          </div>

          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
            <span className="capitalize">{editorFont}</span>
            <span>UTF-8</span>
          </div>
        </footer>

        {/* Mobile Bottom Bar for native app feel */}
        <MobileBottomBar
          onToggleSidebar={() => {
            if (typeof window !== "undefined" && window.innerWidth < 640) {
              setMobileScreen(
                mobileScreen === "library" ? "editor" : "library",
              );
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          onOpenLibrary={() =>
            setMobileScreen(mobileScreen === "library" ? "editor" : "library")
          }
          onOpenEditor={() => setMobileScreen("editor")}
          onCreateNote={() => {
            handleCreateFile();
            setMobileScreen("editor");
          }}
          onCreateDrawing={() => {
            handleCreateDrawing();
            setMobileScreen("editor");
          }}
          onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
          showOutline={isCurrentMarkdown}
          isOutlineOpen={isOutlineOpen}
          isDirty={isDirty}
          isSaving={isSaving}
          onSave={() => {
            if (
              isSplitView &&
              activePane === "split" &&
              splitTabId &&
              !splitTabId.startsWith("temp-")
            ) {
              saveDocument(splitTabId, splitNoteContent, currentSplitNote);
            } else {
              handleManualSave();
            }
          }}
          onOpenDiff={() => setIsDiffModalOpen(true)}
          onManualSync={handleOpenSyncModal}
          isSyncing={isSyncing}
          diffSummary={diffSummary}
          isDrawing={isCurrentDrawing}
          activeNoteTitle={currentNote?.name || "Untitled.md"}
          onOpenSearch={() => setIsGlobalSearchOpen(true)}
          onExportMarkdown={handleExportMarkdown}
          onExportPdf={() => setIsPdfModalOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentScreen={mobileScreen}
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
        onDiscardAndSync={() => {
          setIsDiffModalOpen(false);
          setIsSyncModalOpen(true);
        }}
        isSyncing={isSyncing}
      />

      {/* Create Architecture & UML Diagram Modal */}
      <CreateDiagramModal
        isOpen={isCreateDiagramModalOpen}
        onClose={() => setIsCreateDiagramModalOpen(false)}
        onCreate={(type, name) => handleCreateUml(type, name)}
        isPending={createMutation.isPending}
      />

      {/* Sync & Discard Confirmation Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        noteTitle={currentNote?.name || "Untitled.md"}
        isDirty={isDirty}
        diffSummary={diffSummary}
        isSyncing={isSyncing}
        onConfirmSync={executeSync}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userSession={session}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        target={deleteTarget}
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
      />

      {/* Universal PDF Export & Live Print Dialog */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        fileName={currentNote?.name || "Untitled.md"}
        fileType={
          currentNote?.name?.endsWith(".mmd") ||
          currentNote?.name?.endsWith(".mermaid")
            ? "mermaid"
            : currentNote?.name?.endsWith(".apollon") ||
                currentNote?.name?.endsWith(".uml")
              ? "uml"
              : currentNote?.name?.endsWith(".excalidraw")
                ? "drawing"
                : /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(
                      currentNote?.name || "",
                    )
                  ? "image"
                  : "markdown"
        }
        content={noteContent}
      />

      {/* Global Search Dialog Modal (Ctrl+K / Cmd+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        notes={localNotes}
        activeNoteId={activeTabId}
        onSelectNote={(id) => openFileInTab(id)}
        onSelectFolder={(folderId) => {
          setSidebarCollapsed(false);
          setFolderToExpand(folderId);
        }}
        onCreateNote={() => handleCreateFile()}
        onOpenCalendar={() => setActiveView("calendar")}
      />

      {/* Floating Sync / Status Notification Toast */}
      {toastMessage && (
        <div className="bg-foreground text-background animate-in fade-in slide-in-from-bottom-2 fixed bottom-16 left-1/2 z-[110] flex w-auto max-w-md -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium shadow-2xl duration-150 select-none sm:bottom-6">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-background/60 hover:text-background ml-2 cursor-pointer p-0.5"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
