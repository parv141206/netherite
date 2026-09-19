"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  Plus,
  ListTree,
  Moon,
  Sun,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Sigma,
  RefreshCw,
  Search,
  Palette,
  MoreHorizontal,
  FileDown,
  Printer,
  GitCompare,
  Settings,
  X,
  Hand,
  MousePointer,
  Square,
  Circle,
  MoveRight,
  Type,
  Eraser,
  Pen,
  FileText,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

interface MobileBottomBarProps {
  onToggleSidebar: () => void;
  onCreateNote: () => void;
  onCreateDrawing?: () => void;
  onToggleOutline: () => void;
  onToggleSplitView?: () => void;
  isSplitView?: boolean;
  showOutline?: boolean;
  isOutlineOpen: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onOpenDiff?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  diffSummary?: string;
  isDrawing?: boolean;
  activeNoteTitle?: string;
  onOpenSearch?: () => void;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onOpenSettings?: () => void;
}

export function MobileBottomBar({
  onToggleSidebar,
  onCreateNote,
  onCreateDrawing,
  onToggleOutline,
  showOutline = true,
  isOutlineOpen,
  isDirty = false,
  isSaving = false,
  onSave,
  onOpenDiff,
  onManualSync,
  isSyncing = false,
  diffSummary = "",
  isDrawing = false,
  activeNoteTitle = "Untitled.md",
  onOpenSearch,
  onExportMarkdown,
  onExportPdf,
  onOpenSettings,
}: MobileBottomBarProps) {
  const { theme, setTheme } = useTheme();
  const [activeCanvasTool, setActiveCanvasTool] = useState<string>("selection");
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

  // Track Excalidraw's active tool
  useEffect(() => {
    const handleActiveTool = (e: Event) => {
      const customEvent = e as CustomEvent<{ tool?: string }>;
      if (customEvent.detail?.tool) {
        setActiveCanvasTool(customEvent.detail.tool);
      }
    };

    window.addEventListener("netherite:excalidraw-active-tool", handleActiveTool);
    return () => {
      window.removeEventListener("netherite:excalidraw-active-tool", handleActiveTool);
    };
  }, []);

  const dispatchEditorCommand = (command: string, payload?: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netherite:editor-command", {
          detail: { command, payload },
        })
      );
    }
  };

  const dispatchCanvasCommand = (tool?: string, action?: string) => {
    if (tool) {
      setActiveCanvasTool(tool);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netherite:excalidraw-command", {
          detail: { tool, action },
        })
      );
    }
  };

  const canvasTools = [
    { id: "hand", label: "Pan", icon: Hand },
    { id: "selection", label: "Select", icon: MousePointer },
    { id: "freedraw", label: "Pen", icon: Pen },
    { id: "rectangle", label: "Rect", icon: Square },
    { id: "ellipse", label: "Circle", icon: Circle },
    { id: "arrow", label: "Arrow", icon: MoveRight },
    { id: "text", label: "Text", icon: Type },
    { id: "eraser", label: "Eraser", icon: Eraser },
  ];

  return (
    <>
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col select-none safe-area-bottom pointer-events-none">
        {/* Context-Aware Accessory Bar */}
        <div className="pointer-events-auto">
          {isDrawing ? (
            /* Floating Excalidraw Canvas Dock */
            <div className="mx-2 mb-1.5 p-1 bg-background/90 backdrop-blur-2xl border border-border/70 rounded-2xl shadow-xl flex items-center justify-between gap-1 overflow-x-auto scrollbar-none animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-1 shrink-0">
                {canvasTools.map((t) => {
                  const Icon = t.icon;
                  const isActive = activeCanvasTool === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => dispatchCanvasCommand(t.id)}
                      className={`h-8 px-2 rounded-xl flex items-center justify-center gap-1 text-xs font-medium transition-all active:scale-90 ${
                        isActive
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/70"
                      }`}
                      title={t.label}
                      type="button"
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  );
                })}
              </div>

              <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />

              {/* Canvas Undo & Redo */}
              <div className="flex items-center gap-1 shrink-0 pr-1">
                <button
                  onClick={() => dispatchCanvasCommand(undefined, "undo")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/70 active:scale-90 transition-all"
                  title="Undo"
                  type="button"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => dispatchCanvasCommand(undefined, "redo")}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/70 active:scale-90 transition-all"
                  title="Redo"
                  type="button"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Obsidian-Style Mobile Quick-Formatting Accessory Ribbon */
            <div className="h-10 bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center px-2 gap-1 overflow-x-auto scrollbar-none text-muted-foreground shadow-sm">
              {/* Math Quick Keys (Single Tap) */}
              <button
                onClick={() => dispatchEditorCommand("math-inline")}
                className="px-2 py-1 bg-accent/70 hover:bg-accent text-foreground text-xs font-mono font-bold rounded-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
                title="Insert Inline Math ($)"
                type="button"
              >
                <Sigma className="w-3.5 h-3.5 text-foreground" />
                <span>$</span>
              </button>

              <button
                onClick={() => dispatchEditorCommand("math-block")}
                className="px-2 py-1 bg-accent/70 hover:bg-accent text-foreground text-xs font-mono font-bold rounded-md active:scale-95 transition-all shrink-0"
                title="Insert Display Math Block ($$)"
                type="button"
              >
                $$
              </button>

              <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

              {/* Headings */}
              <button
                onClick={() => dispatchEditorCommand("h1")}
                className="px-2 py-1 hover:bg-accent/70 text-foreground text-xs font-bold rounded-md active:scale-95 transition-all shrink-0"
                title="Heading 1"
                type="button"
              >
                H1
              </button>

              <button
                onClick={() => dispatchEditorCommand("h2")}
                className="px-2 py-1 hover:bg-accent/70 text-foreground text-xs font-bold rounded-md active:scale-95 transition-all shrink-0"
                title="Heading 2"
                type="button"
              >
                H2
              </button>

              <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

              {/* Bold & Italic */}
              <button
                onClick={() => dispatchEditorCommand("bold")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Bold"
                type="button"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("italic")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Italic"
                type="button"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

              {/* Lists & Task */}
              <button
                onClick={() => dispatchEditorCommand("bullet")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Bullet List"
                type="button"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("task")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Task List"
                type="button"
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("ordered")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Numbered List"
                type="button"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("quote")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Quote"
                type="button"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("code")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Code Block"
                type="button"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

              {/* Undo & Redo */}
              <button
                onClick={() => dispatchEditorCommand("undo")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Undo"
                type="button"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dispatchEditorCommand("redo")}
                className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
                title="Redo"
                type="button"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>

              {onManualSync && (
                <>
                  <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />
                  <button
                    onClick={onManualSync}
                    disabled={isSyncing}
                    className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0 flex items-center gap-1 text-xs"
                    title="Sync with Google Drive"
                    type="button"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span className="text-[10px] font-medium">Sync</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quick FAB Options Menu (Note vs Canvas) */}
        {isNewMenuOpen && (
          <div className="pointer-events-auto mx-auto mb-2 flex items-center gap-2 p-1.5 bg-background/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setIsNewMenuOpen(false);
                onCreateNote();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/60 hover:bg-accent text-foreground text-xs font-medium active:scale-95 transition-all"
              type="button"
            >
              <FileText className="w-4 h-4 text-primary" />
              <span>New Note</span>
            </button>
            {onCreateDrawing && (
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onCreateDrawing();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-medium active:scale-95 transition-all"
                type="button"
              >
                <Palette className="w-4 h-4 text-indigo-500" />
                <span>New Whiteboard</span>
              </button>
            )}
          </div>
        )}

        {/* Main Native Mobile Tab Bar */}
        <div className="pointer-events-auto h-12 bg-background/95 backdrop-blur-xl border-t border-border/40 flex items-center justify-around px-2 shadow-2xl">
          {/* 1. Library Drawer */}
          <button
            onClick={onToggleSidebar}
            className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            title="Library"
            type="button"
          >
            <Folder className="w-4.5 h-4.5 text-foreground/80" />
            <span className="text-[10px] font-medium">Library</span>
          </button>

          {/* 2. Global Search */}
          <button
            onClick={() => {
              if (onOpenSearch) onOpenSearch();
            }}
            className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            title="Search"
            type="button"
          >
            <Search className="w-4.5 h-4.5 text-foreground/80" />
            <span className="text-[10px] font-medium">Search</span>
          </button>

          {/* 3. Floating Center Action Button (SAVE when dirty, + FAB when clean) */}
          {isDirty ? (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-11 h-11 rounded-full bg-amber-500 text-black flex items-center justify-center -mt-3 shadow-lg active:scale-90 transition-transform font-bold"
              title="Save changes"
              type="button"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-[10px] font-extrabold tracking-tight">SAVE</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                if (onCreateDrawing) {
                  setIsNewMenuOpen(!isNewMenuOpen);
                } else {
                  onCreateNote();
                }
              }}
              className="w-11 h-11 rounded-full bg-foreground text-background flex items-center justify-center -mt-3 shadow-lg active:scale-90 transition-transform"
              title="Create new note or board"
              type="button"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}

          {/* 4. Whiteboard Engine Shortcut */}
          {onCreateDrawing ? (
            <button
              onClick={onCreateDrawing}
              className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
              title="New Whiteboard"
              type="button"
            >
              <Palette className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-medium">Board</span>
            </button>
          ) : (
            showOutline && (
              <button
                onClick={onToggleOutline}
                className={`flex flex-col items-center gap-0.5 p-1 active:scale-90 transition-all ${
                  isOutlineOpen ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Outline"
                type="button"
              >
                <ListTree className="w-4.5 h-4.5" />
                <span className="text-[10px] font-medium">Outline</span>
              </button>
            )
          )}

          {/* 5. More Action Sheet */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-90 transition-all"
            title="More Options"
            type="button"
          >
            <MoreHorizontal className="w-4.5 h-4.5 text-foreground/80" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>

      {/* Native Mobile Action Sheet (Slide-Up Bottom Sheet) */}
      {isMoreSheetOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMoreSheetOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative z-50 bg-background/95 backdrop-blur-2xl border-t border-border/80 rounded-t-3xl p-4 pb-safe shadow-2xl animate-in slide-in-from-bottom duration-200 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            {/* Sheet Handle */}
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto" />

            {/* Note Status Header */}
            <div className="flex items-center justify-between px-1 pb-1 border-b border-border/50">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-semibold truncate text-foreground">
                  {activeNoteTitle}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  {isSaving ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span>Saving to Google Drive...</span>
                    </>
                  ) : isDirty ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>Unsaved edits ({diffSummary || "Modified"})</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Synced with Google Drive</span>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-accent/80 text-muted-foreground active:scale-95 transition-all"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 gap-2">
              {/* Export as PDF */}
              {onExportPdf && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onExportPdf();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500">
                      <Printer className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Export as PDF</p>
                      <p className="text-[11px] text-muted-foreground">Clean formatted document</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Export as Markdown */}
              {onExportMarkdown && !isDrawing && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onExportMarkdown();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-500">
                      <FileDown className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Export as Markdown</p>
                      <p className="text-[11px] text-muted-foreground">Download raw .md source file</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Sync with Google Drive */}
              {onManualSync && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onManualSync();
                  }}
                  disabled={isSyncing}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left disabled:opacity-60"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
                      <RefreshCw className={`w-4.5 h-4.5 ${isSyncing ? "animate-spin" : ""}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Sync with Google Drive</p>
                      <p className="text-[11px] text-muted-foreground">
                        {isSyncing ? "Syncing changes..." : "Pull updates & resolve conflicts"}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Git Diff & Changelog */}
              {onOpenDiff && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenDiff();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500">
                      <GitCompare className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Changelog & Diff</p>
                      <p className="text-[11px] text-muted-foreground">
                        Inspect exact line and shape changes
                      </p>
                    </div>
                  </div>
                  {diffSummary && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-accent text-foreground">
                      {diffSummary}
                    </span>
                  )}
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                    {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Currently using {theme === "dark" ? "Dark" : "Light"} theme
                    </p>
                  </div>
                </div>
              </button>

              {/* Preferences / Settings */}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-card border border-border/60 hover:bg-accent/50 active:scale-[0.98] transition-all text-left"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-foreground">
                      <Settings className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Settings & Vault</p>
                      <p className="text-[11px] text-muted-foreground">
                        Account, storage engine, typography
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => setIsMoreSheetOpen(false)}
              className="w-full py-3 rounded-2xl bg-accent text-foreground font-semibold text-xs active:scale-[0.98] transition-all mt-1"
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
