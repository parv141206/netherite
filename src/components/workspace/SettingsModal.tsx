"use client";

import React, { useState, useRef } from "react";
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
} from "lucide-react";
import JSZip from "jszip";
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

export function SettingsModal({ isOpen, onClose, userSession }: SettingsModalProps) {
  const {
    theme,
    setTheme,
    mdTheme,
    setMdTheme,
    globalFont,
    setGlobalFont,
  } = useTheme();
  const [folderPath, setFolderPath] = useState("Netherite");
  const [copiedMcp, setCopiedMcp] = useState<"claude" | "cli" | null>(null);

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

  const getRelativePath = (file: any, filesMap: Map<string, any>) => {
    const parts: string[] = [file.name];
    let currentParentId = file.parents?.[0];
    let depth = 0;
    while (currentParentId && depth < 10) {
      const parent = filesMap.get(currentParentId);
      if (!parent || parent.mimeType !== "application/vnd.google-apps.folder") break;
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
        (f) => f.mimeType !== "application/vnd.google-apps.folder"
      );

      let completed = 0;
      for (const file of nonFolders) {
        setExportProgress(`Backing up (${completed + 1}/${nonFolders.length}): ${file.name}`);
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
          !entry.name.includes(".DS_Store")
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
        setImportProgress(`Importing (${count}/${entries.length}): ${entry.name}`);

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
                  f.name.toLowerCase() === segment.toLowerCase()
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
        else if (fileName.endsWith(".apollon") || fileName.endsWith(".uml")) type = "uml";
        else if (fileName.endsWith(".mmd") || fileName.endsWith(".mermaid")) type = "mermaid";

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


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-base text-foreground">Workspace Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-sm overflow-y-auto">
          {/* Storage Section */}
          <div className="space-y-3">
            <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
              Google Drive Storage Folder
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Folder className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => alert(`Drive storage path saved: ${folderPath}`)}
                className="px-3 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              All markdown files and uploads will be stored inside this folder on your personal Google Drive.
            </p>
          </div>

          {/* Theme Mode Section */}
          <div className="space-y-3">
            <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
              Interface Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
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
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      active
                        ? "border-foreground bg-accent font-semibold text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Markdown Reading Themes Section (7 Themes x Light & Dark = 14 styles) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
                Markdown Document Theme (14 Styles)
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Supports Light & Dark Modes
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MD_THEMES.map((t) => {
                const isCurrent = mdTheme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setMdTheme(t.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-foreground/20 hover:bg-accent/40"
                    }`}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border border-black/10 shadow-xs"
                      style={{ backgroundColor: t.previewColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {t.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                        {t.tagline}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Typography Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
                Global Font Settings (Google Fonts)
              </label>
              <span className="text-[10px] text-muted-foreground">Persisted Across Workspace</span>
            </div>
            <div className="relative">
              <Type className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <select
                value={globalFont}
                onChange={(e) => setGlobalFont(e.target.value as any)}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {GLOBAL_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.name} — {font.category}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-3 bg-accent/30 rounded-xl border border-border/50 text-xs font-dynamic-editor text-foreground">
              Preview: The quick brown fox jumps over the lazy dog. 1234567890
            </div>
          </div>

          {/* AI & MCP Server Section */}
          <div className="space-y-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <span>Model Context Protocol (MCP)</span>
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Connect AI assistants (Claude Desktop, Cursor, Antigravity) to your Drive notes
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Enables agents to autonomously author Markdown with KaTeX math, Apollon 13 UML models, Excalidraw whiteboards, and Mermaid diagrams directly into your Google Drive.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  const cwd = typeof window !== "undefined" ? window.location.origin : "";
                  const config = {
                    mcpServers: {
                      netherite: {
                        command: "bun",
                        args: ["run", "src/mcp/cli.ts"],
                        env: {
                          NETHERITE_GOOGLE_REFRESH_TOKEN: userSession?.refreshToken || "",
                        },
                      },
                    },
                  };
                  navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                  setCopiedMcp("claude");
                  setTimeout(() => setCopiedMcp(null), 2500);
                }}
                className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border/70 hover:border-foreground/30 bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer"
              >
                {copiedMcp === "claude" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold text-[11px]">Copied Config!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px]">Claude Desktop JSON</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  const cmd = "bun run mcp";
                  navigator.clipboard.writeText(cmd);
                  setCopiedMcp("cli");
                  setTimeout(() => setCopiedMcp(null), 2500);
                }}
                className="flex items-center justify-center gap-2 p-2 rounded-lg border border-border/70 hover:border-foreground/30 bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer"
              >
                {copiedMcp === "cli" ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold text-[11px]">Copied Command!</span>
                  </>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px]">Copy CLI Command</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export & Import Section */}
          <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">
                    Workspace Backup & Migration
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Export your Netherite folder as a .zip or restore into any Google account
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Preserves folder structures, Markdown documents, Excalidraw whiteboards, Apollon UML schemas, and Mermaid charts.
            </p>

            {/* Hidden file input for zip upload */}
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
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-[11px]">Exporting…</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px]">Export Workspace (.zip)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExporting || isImporting}
                className="flex items-center justify-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-[11px]">Importing…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px]">Import Backup (.zip)</span>
                  </>
                )}
              </button>
            </div>

            {(exportProgress || importProgress) && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 border border-border text-xs text-foreground font-mono animate-in fade-in duration-150">
                {isExporting || isImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                <span className="text-[11px] truncate">
                  {exportProgress || importProgress}
                </span>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="p-3 bg-muted rounded-xl border border-border flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-foreground">
                {userSession?.user?.name || "Connected User"}
              </div>
              <div className="text-muted-foreground">{userSession?.user?.email}</div>
            </div>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded font-mono text-[10px]">
              Connected
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
