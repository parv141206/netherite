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
  Sparkles,
  Key,
  ExternalLink,
  ClipboardCopy,
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
    textOnlyClipboard,
    setTextOnlyClipboard,
  } = useTheme();
  const [folderPath, setFolderPath] = useState("Netherite");
  const [copiedMcp, setCopiedMcp] = useState<"claude" | "cli" | null>(null);

  // Gemini AI Copilot Settings
  const [geminiKey, setGeminiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_gemini_api_key") || "";
    }
    return "";
  });
  const [geminiModel, setGeminiModel] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("netherite_gemini_model") || "gemini-2.5-flash";
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


  const [activeTab, setActiveTab] = useState<
    "appearance" | "editor" | "drive" | "copilot" | "backup" | "shortcuts"
  >("appearance");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl h-[600px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-150">
        {/* Left Sidebar (Apple Settings style) */}
        <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-border bg-muted/25 p-3 flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-foreground/70" />
                <span className="font-semibold text-xs text-foreground tracking-tight">
                  Settings
                </span>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-1 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-0.5">
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
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                      isActive
                        ? "bg-foreground text-background shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User badge at bottom of sidebar */}
          {userSession?.user && (
            <div className="pt-2 border-t border-border/50 px-2 flex items-center gap-2 text-xs">
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                {userSession.user.name?.[0] || "U"}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-foreground text-[11px] truncate">
                  {userSession.user.name || "Connected User"}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {userSession.user.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
          {/* Header */}
          <div className="px-6 py-3.5 border-b border-border/70 flex items-center justify-between shrink-0 bg-card">
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider">
              {activeTab === "appearance" && "Appearance & Themes"}
              {activeTab === "editor" && "Editor & Typography"}
              {activeTab === "drive" && "Google Drive Storage"}
              {activeTab === "copilot" && "Google Gemini AI & MCP"}
              {activeTab === "backup" && "Workspace Backup & Restore"}
              {activeTab === "shortcuts" && "Keyboard Shortcuts"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close Settings (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Body */}
          <div className="flex-1 p-6 space-y-5 overflow-y-auto text-xs">
            {/* 1. APPEARANCE TAB */}
            {activeTab === "appearance" && (
              <div className="space-y-5">
                {/* Interface Theme */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <span className="font-semibold text-xs text-foreground block">
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
                          className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
                            active
                              ? "border-foreground bg-accent font-semibold text-foreground"
                              : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Markdown Reading Theme */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground block">
                      Markdown Document Theme
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      14 Curated Styles
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    {MD_THEMES.map((t) => {
                      const isCurrent = mdTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setMdTheme(t.id)}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isCurrent
                              ? "border-foreground bg-accent font-medium text-foreground"
                              : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0 mt-0.5 border border-black/10 shadow-2xs"
                            style={{ backgroundColor: t.previewColor }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {t.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
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
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground block">
                      Workspace Typography
                    </span>
                    <span className="text-[10px] text-muted-foreground">Google Fonts</span>
                  </div>
                  <div className="relative">
                    <Type className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <select
                      value={globalFont}
                      onChange={(e) => setGlobalFont(e.target.value as any)}
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                    >
                      {GLOBAL_FONTS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.name} ({font.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg border border-border/40 text-xs font-dynamic-editor text-foreground">
                    Sphinx of black quartz, judge my vow. 0123456789
                  </div>
                </div>

                {/* Plain Text Clipboard Copy */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-muted text-foreground">
                        <ClipboardCopy className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-foreground">
                          Text-Only Clipboard Copy
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Copies pure clean text instead of Markdown syntax (#, **, etc.)
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={textOnlyClipboard}
                      onClick={() => setTextOnlyClipboard(!textOnlyClipboard)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        textOnlyClipboard ? "bg-foreground" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-xs transition duration-200 ease-in-out ${
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
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <span className="font-semibold text-xs text-foreground block">
                    Target Storage Folder
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Folder className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => alert(`Drive storage path saved: ${folderPath}`)}
                      className="px-3 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    All markdown notes, Excalidraw whiteboards, and diagrams are synced inside this folder on Google Drive.
                  </p>
                </div>

                {userSession?.user && (
                  <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2 shadow-2xs">
                    <span className="font-semibold text-xs text-foreground block">
                      Connected Google Account
                    </span>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <div className="font-medium text-foreground">{userSession.user.name}</div>
                        <div className="text-[11px] text-muted-foreground">{userSession.user.email}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
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
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground block">
                      Google Gemini AI Key
                    </span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Get API Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          localStorage.setItem("netherite_gemini_api_key", geminiKey.trim());
                          localStorage.setItem("netherite_gemini_model", geminiModel);
                          setGeminiSaved(true);
                          setTimeout(() => setGeminiSaved(false), 2000);
                        }
                      }}
                      className="px-3 py-2 bg-foreground text-background text-xs font-medium rounded-lg hover:opacity-90 transition-all cursor-pointer shrink-0"
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
                            localStorage.setItem("netherite_gemini_model", m.id);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                          geminiModel === m.id
                            ? "border-foreground bg-accent font-semibold text-foreground"
                            : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Model Context Protocol (MCP) */}
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground block">
                      Model Context Protocol (MCP)
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Claude Desktop & CLI
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Connect AI assistants (Claude, Cursor, Antigravity) to read and write your notes and drawings directly.
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
                                NETHERITE_GOOGLE_REFRESH_TOKEN: userSession?.refreshToken || "",
                              },
                            },
                          },
                        };
                        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                        setCopiedMcp("claude");
                        setTimeout(() => setCopiedMcp(null), 2000);
                      }}
                      className="p-2 rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer"
                    >
                      {copiedMcp === "claude" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedMcp === "claude" ? "Copied!" : "Claude Desktop JSON"}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText("bun run mcp");
                        setCopiedMcp("cli");
                        setTimeout(() => setCopiedMcp(null), 2000);
                      }}
                      className="p-2 rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer"
                    >
                      {copiedMcp === "cli" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Terminal className="w-3.5 h-3.5" />}
                      <span>{copiedMcp === "cli" ? "Copied!" : "Copy CLI Command"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BACKUP & RESTORE TAB */}
            {activeTab === "backup" && (
              <div className="space-y-5">
                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                  <span className="font-semibold text-xs text-foreground block">
                    Workspace Archive (.zip)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Export your complete workspace as a standard ZIP archive containing all markdown notes, Excalidraw whiteboards, and diagrams.
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
                      className="p-2.5 rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span>Export (.zip)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExporting || isImporting}
                      className="p-2.5 rounded-lg border border-border hover:bg-muted flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span>Import (.zip)</span>
                    </button>
                  </div>

                  {(exportProgress || importProgress) && (
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] font-mono text-foreground flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{exportProgress || importProgress}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. SHORTCUTS TAB */}
            {activeTab === "shortcuts" && (
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3 shadow-2xs">
                <span className="font-semibold text-xs text-foreground block">
                  Keyboard Shortcuts
                </span>
                <div className="space-y-2 font-mono text-[11px]">
                  {[
                    { key: "Ctrl + S", desc: "Save note or whiteboard" },
                    { key: "Ctrl + Alt + Z", desc: "Toggle Zen Mode" },
                    { key: "Ctrl + K", desc: "Open Global Search" },
                    { key: "Ctrl + J", desc: "Toggle Gemini AI Copilot" },
                    { key: "Ctrl + Shift + D", desc: "Toggle Diff & Changelog" },
                    { key: "Ctrl + N", desc: "Create New Note" },
                    { key: "Esc", desc: "Exit Zen Mode / Close dialogs" },
                  ].map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between py-1 border-b border-border/30 last:border-0"
                    >
                      <span className="text-muted-foreground font-sans">{s.desc}</span>
                      <kbd className="px-2 py-0.5 rounded bg-muted border border-border/70 text-foreground font-semibold text-[10px]">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-border/70 bg-card flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-foreground text-background text-xs font-medium rounded-lg hover:opacity-90 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
