"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  HardDrive,
  Moon,
  Sun,
  Monitor,
  Type,
  Folder,
  Check,
  Bot,
  Copy,
  Terminal,
  Download,
  Upload,
  Archive,
  Loader2,
  CheckCircle2,
  Sparkles,
  Key,
  ExternalLink,
  ClipboardCopy,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import JSZip from "jszip";
import {
  isFileSystemAccessSupported,
  storeDeviceDirectoryHandle,
  getStoredDeviceDirectoryHandle,
  removeStoredDeviceDirectoryHandle,
  verifyHandlePermission,
  performFullWorkspaceSyncToDevice,
  LOCAL_DEVICE_SYNC_ENABLED_KEY,
  LOCAL_DEVICE_FOLDER_NAME_KEY,
  CLOUD_AUTOSAVE_ENABLED_KEY,
  CLOUD_AUTOSAVE_CADENCE_KEY,
  LOCAL_AUTOSAVE_INTERVAL_KEY,
  type CloudCadence,
  type LocalAutoSaveInterval,
  CLOUD_AUTOSAVE_ENABLED_CHANGED_EVENT,
  CLOUD_CADENCE_CHANGED_EVENT,
  LOCAL_AUTOSAVE_INTERVAL_CHANGED_EVENT,
} from "~/lib/localDeviceSync";
import { api } from "~/trpc/react";
import {
  useTheme,
  MD_THEMES,
  GLOBAL_FONTS,
  type MdThemeId,
  type GlobalFontId,
} from "~/components/ThemeProvider";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession?: any;
}

export function SettingsModal({
  isOpen,
  onClose,
  userSession,
}: SettingsModalProps) {
  const {
    theme,
    setTheme,
    mdTheme,
    setMdTheme,
    globalFont,
    setGlobalFont,
    textOnlyClipboard,
    setTextOnlyClipboard,
  } = useTheme();
  const [folderPath, setFolderPath] = useState("Netherite");
  const [copiedMcp, setCopiedMcp] = useState<"claude" | "cli" | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.body.classList.add("mobile-overlay-active");
      return () => {
        document.body.classList.remove("mobile-overlay-active");
      };
    }
  }, [isOpen]);

  // Gemini AI Copilot Settings
  const [geminiKey, setGeminiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_gemini_api_key") || "";
    }
    return "";
  });
  const [geminiModel, setGeminiModel] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("netherite_gemini_model") || "gemini-2.5-flash"
      );
    }
    return "gemini-2.5-flash";
  });
  const [geminiSaved, setGeminiSaved] = useState(false);

  // Export & Import states
  const utils = api.useUtils();
  const { data: notesData } = api.notes.list.useQuery(undefined, {
    enabled: isOpen,
  });
  const createMutation = api.notes.create.useMutation();
  const createFolderMutation = api.notes.createFolder.useMutation();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Auto-Save Enabled & Cadence
  const [cloudAutoSaveEnabled, setCloudAutoSaveEnabled] = useState<boolean>(
    () => {
      if (typeof window !== "undefined") {
        const val = localStorage.getItem(CLOUD_AUTOSAVE_ENABLED_KEY);
        return val === null ? true : val === "true";
      }
      return true;
    },
  );

  const handleSetCloudAutoSaveEnabled = (enabled: boolean) => {
    setCloudAutoSaveEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem(CLOUD_AUTOSAVE_ENABLED_KEY, String(enabled));
      window.dispatchEvent(
        new CustomEvent(CLOUD_AUTOSAVE_ENABLED_CHANGED_EVENT, {
          detail: enabled,
        }),
      );
    }
  };

  const [cloudCadence, setCloudCadence] = useState<CloudCadence>(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem(CLOUD_AUTOSAVE_CADENCE_KEY) as CloudCadence) ||
        "30s"
      );
    }
    return "30s";
  });

  const handleSetCloudCadence = (cadence: CloudCadence) => {
    setCloudCadence(cadence);
    if (typeof window !== "undefined") {
      localStorage.setItem(CLOUD_AUTOSAVE_CADENCE_KEY, cadence);
      window.dispatchEvent(
        new CustomEvent(CLOUD_CADENCE_CHANGED_EVENT, { detail: cadence }),
      );
    }
  };

  // Local Auto-Save Cadence
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

  const handleSetLocalAutoSaveInterval = (interval: LocalAutoSaveInterval) => {
    setLocalAutoSaveInterval(interval);
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_AUTOSAVE_INTERVAL_KEY, interval);
      window.dispatchEvent(
        new CustomEvent(LOCAL_AUTOSAVE_INTERVAL_CHANGED_EVENT, {
          detail: interval,
        }),
      );
    }
  };

  // Local Device Storage Sync
  const [isDeviceSyncSupported] = useState(() => isFileSystemAccessSupported());
  const [isDeviceSyncEnabled, setIsDeviceSyncEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LOCAL_DEVICE_SYNC_ENABLED_KEY) === "true";
    }
    return false;
  });
  const [deviceFolderName, setDeviceFolderName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(LOCAL_DEVICE_FOLDER_NAME_KEY) || "";
    }
    return "";
  });
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [isDeviceSyncing, setIsDeviceSyncing] = useState(false);
  const [deviceSyncProgress, setDeviceSyncProgress] = useState<string | null>(
    null,
  );

  const handleStartDeviceFolderPick = async () => {
    setShowOverwriteWarning(false);
    try {
      if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
        alert("File System Access API is not supported in this browser.");
        return;
      }
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      if (!dirHandle) return;

      setIsDeviceSyncing(true);
      setDeviceSyncProgress("Connecting local folder...");

      await storeDeviceDirectoryHandle(dirHandle);
      setIsDeviceSyncEnabled(true);
      setDeviceFolderName(dirHandle.name);

      if (notesData && notesData.length > 0) {
        setDeviceSyncProgress(`Starting full sync to "${dirHandle.name}"...`);
        const { successCount, errorCount } =
          await performFullWorkspaceSyncToDevice(
            dirHandle,
            notesData,
            async (id) => {
              const c = await utils.notes.get.fetch({ id });
              return c ?? "";
            },
            (curr, total, name) => {
              setDeviceSyncProgress(
                `Writing to disk (${curr}/${total}): ${name}`,
              );
            },
          );
        setDeviceSyncProgress(
          `Sync complete: ${successCount} files written to disk${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
        );
      } else {
        setDeviceSyncProgress("Folder connected and ready for saves.");
      }
      setTimeout(() => setDeviceSyncProgress(null), 4000);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Local device folder pick error:", err);
        alert(`Could not link folder: ${err?.message || "Unknown error"}`);
      }
      setDeviceSyncProgress(null);
    } finally {
      setIsDeviceSyncing(false);
    }
  };

  const handleDeviceFullSync = async () => {
    try {
      const dirHandle = await getStoredDeviceDirectoryHandle();
      if (!dirHandle) {
        setShowOverwriteWarning(true);
        return;
      }
      const hasPerm = await verifyHandlePermission(dirHandle, true);
      if (!hasPerm) {
        alert("Permission to write to local directory was denied or revoked.");
        return;
      }
      if (!notesData || notesData.length === 0) {
        alert("No documents found in workspace to sync.");
        return;
      }
      setIsDeviceSyncing(true);
      setDeviceSyncProgress(`Syncing workspace to "${dirHandle.name}"...`);
      const { successCount, errorCount } =
        await performFullWorkspaceSyncToDevice(
          dirHandle,
          notesData,
          async (id) => {
            const c = await utils.notes.get.fetch({ id });
            return c ?? "";
          },
          (curr, total, name) => {
            setDeviceSyncProgress(
              `Writing to disk (${curr}/${total}): ${name}`,
            );
          },
        );
      setDeviceSyncProgress(
        `Sync complete: ${successCount} files updated on disk${errorCount > 0 ? ` (${errorCount} errors)` : ""}`,
      );
      setTimeout(() => setDeviceSyncProgress(null), 4000);
    } catch (err: any) {
      console.error("Sync error:", err);
      alert(`Sync failed: ${err?.message || "Unknown error"}`);
      setDeviceSyncProgress(null);
    } finally {
      setIsDeviceSyncing(false);
    }
  };

  const handleDisconnectDeviceSync = async () => {
    await removeStoredDeviceDirectoryHandle();
    setIsDeviceSyncEnabled(false);
    setDeviceFolderName("");
    setDeviceSyncProgress(
      "Local folder disconnected. Files on disk were preserved.",
    );
    setTimeout(() => setDeviceSyncProgress(null), 3000);
  };

  const getRelativePath = (file: any, filesMap: Map<string, any>) => {
    const parts: string[] = [file.name];
    let currentParentId = file.parents?.[0];
    let depth = 0;
    while (currentParentId && depth < 10) {
      const parent = filesMap.get(currentParentId);
      if (!parent || parent.mimeType !== "application/vnd.google-apps.folder")
        break;
      parts.unshift(parent.name);
      currentParentId = parent.parents?.[0];
      depth++;
    }
    return parts.join("/");
  };

  const handleExportWorkspace = async () => {
    if (!notesData || notesData.length === 0) {
      alert("No files found in workspace to export.");
      return;
    }
    setIsExporting(true);
    setExportProgress("Preparing archive...");

    try {
      const zip = new JSZip();
      const filesMap = new Map<string, any>();
      notesData.forEach((f) => filesMap.set(f.id, f));

      const nonFolders = notesData.filter(
        (f) => f.mimeType !== "application/vnd.google-apps.folder",
      );

      let completed = 0;
      for (const file of nonFolders) {
        setExportProgress(
          `Backing up (${completed + 1}/${nonFolders.length}): ${file.name}`,
        );
        try {
          const content = await utils.notes.get.fetch({ id: file.id });
          const relativePath = getRelativePath(file, filesMap);
          zip.file(relativePath, content ?? "");
        } catch (err) {
          console.warn(`Failed to export ${file.name}`, err);
        }
        completed++;
      }

      setExportProgress("Packaging ZIP file...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      link.download = `Netherite-Workspace-Backup-${dateStr}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress("Export complete!");
      setTimeout(() => setExportProgress(null), 3000);
    } catch (err: any) {
      console.error("Export error:", err);
      alert(`Export failed: ${err?.message || "Unknown error"}`);
      setExportProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress("Opening ZIP archive...");

    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(
        (entry) =>
          !entry.dir &&
          !entry.name.startsWith("__MACOSX") &&
          !entry.name.includes(".DS_Store"),
      );

      if (entries.length === 0) {
        alert("No valid documents found in this ZIP archive.");
        setIsImporting(false);
        setImportProgress(null);
        return;
      }

      const folderIdMap = new Map<string, string>();

      let count = 0;
      for (const entry of entries) {
        count++;
        setImportProgress(
          `Importing (${count}/${entries.length}): ${entry.name}`,
        );

        const parts = entry.name.split("/").filter(Boolean);
        const fileName = parts.pop()!;

        let parentId: string | undefined = undefined;

        // Ensure folder hierarchy in Google Drive
        if (parts.length > 0) {
          let currentPath = "";
          let currentParent: string | undefined = undefined;

          for (const segment of parts) {
            currentPath = currentPath ? `${currentPath}/${segment}` : segment;

            if (folderIdMap.has(currentPath)) {
              currentParent = folderIdMap.get(currentPath);
            } else {
              const existingFolder = notesData?.find(
                (f) =>
                  f.mimeType === "application/vnd.google-apps.folder" &&
                  f.name.toLowerCase() === segment.toLowerCase(),
              );

              if (existingFolder) {
                folderIdMap.set(currentPath, existingFolder.id);
                currentParent = existingFolder.id;
              } else {
                const newFolder = await createFolderMutation.mutateAsync({
                  name: segment,
                  parentId: currentParent,
                });
                if (newFolder?.id) {
                  folderIdMap.set(currentPath, newFolder.id);
                  currentParent = newFolder.id;
                }
              }
            }
          }
          parentId = currentParent;
        }

        let type: "note" | "drawing" | "uml" | "mermaid" = "note";
        if (fileName.endsWith(".excalidraw")) type = "drawing";
        else if (fileName.endsWith(".apollon") || fileName.endsWith(".uml"))
          type = "uml";
        else if (fileName.endsWith(".mmd") || fileName.endsWith(".mermaid"))
          type = "mermaid";

        const content = await entry.async("string");

        await createMutation.mutateAsync({
          name: fileName,
          content,
          parentId,
          type,
        });
      }

      await utils.notes.list.invalidate();
      setImportProgress(`Successfully imported ${entries.length} document(s)!`);
      setTimeout(() => setImportProgress(null), 4000);
    } catch (err: any) {
      console.error("Import error:", err);
      alert(`Import failed: ${err?.message || "Invalid archive"}`);
      setImportProgress(null);
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const [activeTab, setActiveTab] = useState<
    "appearance" | "editor" | "drive" | "copilot" | "backup" | "shortcuts"
  >("appearance");

  if (!isOpen) return null;

  return (
    <div
      data-mobile-overlay="true"
      className="bg-background animate-in fade-in fixed inset-0 z-50 flex flex-col duration-150 md:items-center md:justify-center md:bg-black/60 md:p-4 md:backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-background md:bg-card md:border-border animate-in zoom-in-95 flex h-full w-full flex-col overflow-hidden duration-150 md:h-[600px] md:max-w-3xl md:flex-row md:rounded-2xl md:border md:shadow-2xl">
        {/* Left Sidebar (Apple Settings style / Top navigation on mobile) */}
        <div className="border-border bg-muted/25 pt-safe flex w-full shrink-0 flex-col justify-between border-b px-4 pt-3 pb-2 select-none md:w-56 md:border-r md:border-b-0 md:p-3">
          <div className="space-y-2 md:space-y-3">
            <div className="border-border/50 flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="text-primary h-4 w-4" />
                <span className="text-foreground text-sm font-bold tracking-tight md:text-xs">
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="bg-accent hover:bg-accent/80 text-foreground rounded-full px-3 py-1 text-xs font-semibold transition-all active:scale-95 md:hidden"
                type="button"
              >
                Done
              </button>
            </div>

            <nav className="flex scrollbar-none gap-1 overflow-x-auto py-1 md:flex-col md:overflow-visible md:py-0">
              {[
                { id: "appearance", label: "Appearance", icon: Monitor },
                { id: "editor", label: "Editor & Fonts", icon: Type },
                { id: "drive", label: "Google Drive", icon: HardDrive },
                { id: "copilot", label: "AI & Copilot", icon: Sparkles },
                { id: "backup", label: "Backup & Restore", icon: Archive },
                { id: "shortcuts", label: "Shortcuts", icon: Terminal },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-left text-xs font-medium transition-colors md:rounded-lg md:px-2.5 md:py-1.5 ${
                      isActive
                        ? "bg-foreground text-background font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User badge at bottom of sidebar */}
          {userSession?.user && (
            <div className="border-border/50 hidden items-center gap-2 border-t px-2 pt-2 text-xs md:flex">
              <div className="bg-primary/20 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                {userSession.user.name?.[0] || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-foreground truncate text-[11px] font-medium">
                  {userSession.user.name || "Connected User"}
                </div>
                <div className="text-muted-foreground truncate text-[10px]">
                  {userSession.user.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content Panel */}
        <div className="bg-background pb-safe flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-border/70 bg-card flex shrink-0 items-center justify-between border-b px-4 py-3 md:px-6 md:py-3.5">
            <h3 className="text-foreground text-xs font-semibold tracking-wider uppercase">
              {activeTab === "appearance" && "Appearance & Themes"}
              {activeTab === "editor" && "Editor & Typography"}
              {activeTab === "drive" && "Google Drive Storage"}
              {activeTab === "copilot" && "Google Gemini AI & MCP"}
              {activeTab === "backup" && "Workspace Backup & Restore"}
              {activeTab === "shortcuts" && "Keyboard Shortcuts"}
            </h3>
            <button
              onClick={onClose}
              className="hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-lg p-1 transition-colors"
              title="Close Settings (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 space-y-5 overflow-y-auto p-6 text-xs">
            {/* 1. APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                {/* Interface Theme */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <span className="text-foreground block text-xs font-semibold">
                    Interface Theme
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Monitor },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = theme === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setTheme(item.id as any)}
                          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 transition-all ${
                            active
                              ? "border-foreground bg-accent text-foreground font-semibold"
                              : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Markdown Reading Theme */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground block text-xs font-semibold">
                      Markdown Document Theme
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      14 Curated Styles
                    </span>
                  </div>
                  <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {MD_THEMES.map((t) => {
                      const isCurrent = mdTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setMdTheme(t.id)}
                          className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-left transition-all ${
                            isCurrent
                              ? "border-foreground bg-accent text-foreground font-medium"
                              : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <div
                            className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-black/10 shadow-2xs"
                            style={{ backgroundColor: t.previewColor }}
                          />
                          <div className="min-w-0">
                            <div className="text-foreground truncate text-xs font-medium">
                              {t.name}
                            </div>
                            <div className="text-muted-foreground truncate text-[10px]">
                              {t.tagline}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 2. EDITOR TAB */}
            {activeTab === "editor" && (
              <div className="space-y-5">
                {/* Global Typography */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground block text-xs font-semibold">
                      Workspace Typography
                    </span>
                    <span className="text-muted-foreground text-[10px]">
                      Google Fonts
                    </span>
                  </div>
                  <div className="relative">
                    <Type className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                    <select
                      value={globalFont}
                      onChange={(e) => setGlobalFont(e.target.value as any)}
                      className="bg-background border-border text-foreground w-full rounded-lg border py-2 pr-3 pl-9 text-xs focus:outline-none"
                    >
                      {GLOBAL_FONTS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-muted/30 border-border/40 font-dynamic-editor text-foreground rounded-lg border p-3 text-xs">
                    Sphinx of black quartz, judge my vow. 0123456789
                  </div>
                </div>

                {/* Plain Text Clipboard Copy */}
                <div className="border-border/60 bg-card space-y-2 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-muted text-foreground rounded-lg p-1.5">
                        <ClipboardCopy className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-foreground text-xs font-semibold">
                          Text-Only Clipboard Copy
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          Copies pure clean text instead of Markdown syntax (#,
                          **, etc.)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={textOnlyClipboard}
                      onClick={() => setTextOnlyClipboard(!textOnlyClipboard)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        textOnlyClipboard
                          ? "bg-foreground"
                          : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-xs transition duration-200 ease-in-out ${
                          textOnlyClipboard ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. GOOGLE DRIVE TAB */}
            {activeTab === "drive" && (
              <div className="space-y-5">
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <span className="text-foreground block text-xs font-semibold">
                    Target Storage Folder
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Folder className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                      <input
                        type="text"
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        className="bg-background border-border text-foreground w-full rounded-lg border py-2 pr-3 pl-9 text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() =>
                        alert(`Drive storage path saved: ${folderPath}`)
                      }
                      className="bg-foreground text-background cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-all hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    All markdown notes, Excalidraw whiteboards, and diagrams are
                    synced inside this folder on Google Drive.
                  </p>
                </div>

                {/* Google Drive Cloud Auto-Save */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-foreground block text-xs font-semibold">
                        Google Drive Cloud Auto-Save
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        {cloudAutoSaveEnabled
                          ? "Active background sync"
                          : "Java `finally {}` mode active"}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={cloudAutoSaveEnabled}
                      onClick={() =>
                        handleSetCloudAutoSaveEnabled(!cloudAutoSaveEnabled)
                      }
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                        cloudAutoSaveEnabled ? "bg-foreground" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`bg-background pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-xs transition duration-200 ease-in-out ${
                          cloudAutoSaveEnabled
                            ? "translate-x-5"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {cloudAutoSaveEnabled ? (
                    <>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Controls how frequently idle edits are sent to Google
                        Drive. Local drafts and disk files are saved
                        continuously regardless, so you never lose data.
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                        {[
                          {
                            id: "30s",
                            label: "30s (Default)",
                            desc: "Quota friendly",
                          },
                          {
                            id: "1m",
                            label: "1 min",
                            desc: "Ultra conservative",
                          },
                          { id: "10s", label: "10s", desc: "Frequent" },
                          {
                            id: "manual",
                            label: "Tab Switch / Manual",
                            desc: "Zero idle requests",
                          },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              handleSetCloudCadence(c.id as CloudCadence)
                            }
                            className={`flex cursor-pointer flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                              cloudCadence === c.id
                                ? "border-foreground bg-accent text-foreground font-semibold"
                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            }`}
                          >
                            <span className="text-xs">{c.label}</span>
                            <span className="mt-0.5 text-[10px] opacity-70">
                              {c.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <span>Java `finally {}` Mode Active</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        Continuous idle saves to Google Drive are disabled.
                        Notes will only save to Google Drive as a final safety
                        net when a tab is closed, when the browser/window
                        unloads or exits, on tab switch, or when manually saved
                        (
                        <kbd className="bg-background/50 rounded px-1 py-0.5 font-mono text-[10px]">
                          Ctrl+S
                        </kbd>
                        ).
                      </p>
                    </div>
                  )}
                </div>

                {/* Local Auto-Save Cadence */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground block text-xs font-semibold">
                      Local Auto-Save Cadence
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      IndexedDB & Device
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Controls how frequently unsaved drafts, snapshots, and
                    synced local device files are persisted while typing or
                    drawing. Emergency flushes always occur instantly on tab
                    switch or page unload.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
                    {[
                      {
                        id: "immediate",
                        label: "Immediate",
                        desc: "On every edit",
                      },
                      { id: "1s", label: "1s", desc: "1 sec pause" },
                      { id: "2s", label: "2s (Balanced)", desc: "2 sec pause" },
                      { id: "5s", label: "5s", desc: "5 sec pause" },
                      { id: "10s", label: "10s", desc: "10 sec pause" },
                      { id: "30s", label: "30s", desc: "30 sec pause" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          handleSetLocalAutoSaveInterval(
                            item.id as LocalAutoSaveInterval,
                          )
                        }
                        className={`flex cursor-pointer flex-col justify-between rounded-lg border p-2 text-left transition-all ${
                          localAutoSaveInterval === item.id
                            ? "border-foreground bg-accent text-foreground font-semibold"
                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <span className="text-xs">{item.label}</span>
                        <span className="mt-0.5 text-[10px] opacity-70">
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {userSession?.user && (
                  <div className="border-border/60 bg-card space-y-2 rounded-xl border p-4 shadow-2xs">
                    <span className="text-foreground block text-xs font-semibold">
                      Connected Google Account
                    </span>
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <div className="text-foreground font-medium">
                          {userSession.user.name}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {userSession.user.email}
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        Active Sync
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. AI & COPILOT TAB */}
            {activeTab === "copilot" && (
              <div className="space-y-5">
                {/* Official Gemini API Key */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground block text-xs font-semibold">
                      Google Gemini AI Key
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary flex items-center gap-1 text-[11px] font-medium hover:underline"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="text-muted-foreground absolute top-2.5 left-3 h-3.5 w-3.5" />
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="bg-background border-border text-foreground w-full rounded-lg border py-2 pr-3 pl-9 font-mono text-xs focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.setItem(
                            "netherite_gemini_api_key",
                            geminiKey.trim(),
                          );
                          localStorage.setItem(
                            "netherite_gemini_model",
                            geminiModel,
                          );
                          setGeminiSaved(true);
                          setTimeout(() => setGeminiSaved(false), 2000);
                        }
                      }}
                      className="bg-foreground text-background shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-medium transition-all hover:opacity-90"
                    >
                      {geminiSaved ? "Saved" : "Save Key"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { id: "gemini-2.5-flash", name: "2.5 Flash" },
                      { id: "gemini-1.5-flash", name: "1.5 Flash" },
                      { id: "gemini-1.5-pro", name: "1.5 Pro" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setGeminiModel(m.id);
                          if (typeof window !== "undefined") {
                            localStorage.setItem(
                              "netherite_gemini_model",
                              m.id,
                            );
                          }
                        }}
                        className={`cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                          geminiModel === m.id
                            ? "border-foreground bg-accent text-foreground font-semibold"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Context Protocol (MCP) */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground block text-xs font-semibold">
                      Model Context Protocol (MCP)
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      Claude Desktop & CLI
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Connect AI assistants (Claude, Cursor, Antigravity) to read
                    and write your notes and drawings directly.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const config = {
                          mcpServers: {
                            netherite: {
                              command: "bun",
                              args: ["run", "src/mcp/cli.ts"],
                              env: {
                                NETHERITE_GOOGLE_REFRESH_TOKEN:
                                  userSession?.refreshToken || "",
                              },
                            },
                          },
                        };
                        navigator.clipboard.writeText(
                          JSON.stringify(config, null, 2),
                        );
                        setCopiedMcp("claude");
                        setTimeout(() => setCopiedMcp(null), 2000);
                      }}
                      className="border-border hover:bg-muted text-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all"
                    >
                      {copiedMcp === "claude" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {copiedMcp === "claude"
                          ? "Copied!"
                          : "Claude Desktop JSON"}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("bun run mcp");
                        setCopiedMcp("cli");
                        setTimeout(() => setCopiedMcp(null), 2000);
                      }}
                      className="border-border hover:bg-muted text-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-all"
                    >
                      {copiedMcp === "cli" ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Terminal className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {copiedMcp === "cli" ? "Copied!" : "Copy CLI Command"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BACKUP & RESTORE TAB */}
            {activeTab === "backup" && (
              <div className="space-y-5">
                {/* Local Device Storage Sync */}
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="text-foreground h-4 w-4" />
                      <div>
                        <span className="text-foreground block text-xs font-semibold">
                          Local Device Storage Sync
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          Mirror workspace directly to a physical folder on your
                          computer's disk
                        </span>
                      </div>
                    </div>
                    {isDeviceSyncSupported ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isDeviceSyncEnabled}
                        onClick={() => {
                          if (isDeviceSyncEnabled) {
                            void handleDisconnectDeviceSync();
                          } else {
                            setShowOverwriteWarning(true);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isDeviceSyncEnabled
                            ? "bg-foreground"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-xs transition duration-200 ease-in-out ${
                            isDeviceSyncEnabled
                              ? "translate-x-4"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="bg-muted text-muted-foreground rounded px-2 py-0.5 font-mono text-[10px]">
                        Not Supported
                      </span>
                    )}
                  </div>

                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Saves your markdown notes, Excalidraw whiteboards, and
                    diagrams directly into an actual folder on your hard drive
                    via the File System Access API. Zero risk of browser cache
                    eviction or 5MB storage caps.
                  </p>

                  {isDeviceSyncEnabled && (
                    <div className="border-border/50 space-y-2 border-t pt-2">
                      <div className="flex flex-col justify-between gap-2 text-xs sm:flex-row sm:items-center">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span className="text-muted-foreground font-sans">
                            Synced Folder:
                          </span>
                          <span className="text-foreground bg-muted rounded px-2 py-0.5 font-mono text-[11px] font-medium">
                            {deviceFolderName || "Selected Directory"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleDeviceFullSync()}
                            disabled={isDeviceSyncing}
                            className="border-border hover:bg-muted text-foreground flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isDeviceSyncing ? "animate-spin" : ""}`}
                            />
                            <span>Sync All Now</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowOverwriteWarning(true)}
                            disabled={isDeviceSyncing}
                            className="border-border hover:bg-muted text-foreground cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-50"
                          >
                            Change Folder
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDisconnectDeviceSync()}
                            disabled={isDeviceSyncing}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {deviceSyncProgress && (
                    <div className="bg-muted/40 border-border text-foreground flex items-center gap-2 rounded-lg border p-2.5 font-mono text-[11px]">
                      {isDeviceSyncing ? (
                        <Loader2 className="text-primary h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      )}
                      <span className="truncate">{deviceSyncProgress}</span>
                    </div>
                  )}
                </div>
                <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                  <span className="text-foreground block text-xs font-semibold">
                    Workspace Archive (.zip)
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Export your complete workspace as a standard ZIP archive
                    containing all markdown notes, Excalidraw whiteboards, and
                    diagrams.
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportZip}
                    accept=".zip,application/zip"
                    className="hidden"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportWorkspace}
                      disabled={isExporting || isImporting}
                      className="border-border hover:bg-muted text-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {isExporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="text-muted-foreground h-3.5 w-3.5" />
                      )}
                      <span>Export (.zip)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExporting || isImporting}
                      className="border-border hover:bg-muted text-foreground flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all disabled:opacity-50"
                    >
                      {isImporting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="text-muted-foreground h-3.5 w-3.5" />
                      )}
                      <span>Import (.zip)</span>
                    </button>
                  </div>

                  {(exportProgress || importProgress) && (
                    <div className="bg-muted/40 border-border text-foreground flex items-center gap-2 rounded-lg border p-2.5 font-mono text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate">
                        {exportProgress || importProgress}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. SHORTCUTS TAB */}
            {activeTab === "shortcuts" && (
              <div className="border-border/60 bg-card space-y-3 rounded-xl border p-4 shadow-2xs">
                <span className="text-foreground block text-xs font-semibold">
                  Keyboard Shortcuts
                </span>
                <div className="space-y-2 font-mono text-[11px]">
                  {[
                    { key: "Ctrl + S", desc: "Save note or whiteboard" },
                    { key: "Ctrl + Alt + Z", desc: "Toggle Zen Mode" },
                    { key: "Ctrl + K", desc: "Open Global Search" },
                    { key: "Ctrl + J", desc: "Toggle Gemini AI Copilot" },
                    {
                      key: "Ctrl + Shift + D",
                      desc: "Toggle Diff & Changelog",
                    },
                    { key: "Ctrl + N", desc: "Create New Note" },
                    { key: "Esc", desc: "Exit Zen Mode / Close dialogs" },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="border-border/30 flex items-center justify-between border-b py-1 last:border-0"
                    >
                      <span className="text-muted-foreground font-sans">
                        {s.desc}
                      </span>
                      <kbd className="bg-muted border-border/70 text-foreground rounded border px-2 py-0.5 text-[10px] font-semibold">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-border/70 bg-card flex shrink-0 justify-end border-t px-6 py-3">
            <button
              onClick={onClose}
              className="bg-foreground text-background cursor-pointer rounded-lg px-4 py-1.5 text-xs font-medium transition-all hover:opacity-90"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Overwrite Warning Confirmation Modal */}
      {showOverwriteWarning && (
        <div
          className="animate-in fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeviceSyncing) {
              setShowOverwriteWarning(false);
            }
          }}
        >
          <div className="bg-card border-border animate-in zoom-in-95 w-full max-w-md space-y-4 rounded-2xl border p-5 shadow-2xl duration-150">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-amber-500/15 p-2.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-foreground text-sm font-semibold">
                  Overwrite Warning: Local Device Sync
                </h3>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Enabling Local Device Storage will link a physical folder on
                  your computer and mirror your Netherite notes and whiteboards
                  into it.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-relaxed font-medium text-amber-800 dark:text-amber-300">
              ⚠️ <strong>Files with matching names will be overwritten</strong>{" "}
              with your current Netherite workspace state during sync. We
              strongly recommend selecting an empty folder (e.g.{" "}
              <code>~/Documents/Netherite</code>).
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOverwriteWarning(false)}
                disabled={isDeviceSyncing}
                className="border-border hover:bg-muted text-foreground cursor-pointer rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleStartDeviceFolderPick()}
                disabled={isDeviceSyncing}
                className="bg-foreground text-background flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
              >
                {isDeviceSyncing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Folder className="h-3.5 w-3.5" />
                )}
                <span>Confirm & Pick Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
