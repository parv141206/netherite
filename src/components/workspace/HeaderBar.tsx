"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  Share2,
  Download,
  CheckCircle2,
  BarChart2,
  Save,
  Menu,
  Columns,
  ListTree,
  MoreHorizontal,
  ChevronLeft,
  Moon,
  Sun,
  Type,
  Check,
  SunMedium,
  Palette,
  Network,
  Workflow,
  Printer,
  Sparkles,
  Search,
  RefreshCw,
  GitCompare,
  History,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  useTheme,
  MD_THEMES,
  GLOBAL_FONTS,
  type MdThemeId,
  type GlobalFontId,
} from "~/components/ThemeProvider";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { WindowControls } from "./WindowControls";

interface HeaderBarProps {
  noteTitle?: string;
  isSaving?: boolean;
  isDirty?: boolean;
  diffSummary?: string;
  onOpenDiff?: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  onSave?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  onExportMarkdown?: () => void;
  onExportPdf?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  wordCount?: number;
  charCount?: number;
  editorFont?: string;
  onEditorFontChange?: (font: string) => void;
  isOutlineOpen?: boolean;
  onToggleOutline?: () => void;
  isDiffOpen?: boolean;
  onToggleDiff?: () => void;
  onOpenHistory?: () => void;
  isCopilotOpen?: boolean;
  onToggleCopilot?: () => void;
  onOpenGlobalSearch?: () => void;
  zenMode?: boolean;
  onToggleZenMode?: () => void;
}

export function HeaderBar({
  noteTitle = "Untitled.md",
  isSaving = false,
  isDirty = false,
  diffSummary = "",
  onOpenDiff,
  isSplitView = false,
  onToggleSplitView,
  onSave,
  onManualSync,
  isSyncing = false,
  onExportMarkdown,
  onExportPdf,
  onToggleSidebar,
  sidebarCollapsed = false,
  wordCount = 0,
  charCount = 0,
  editorFont = "sans",
  onEditorFontChange,
  isOutlineOpen = false,
  onToggleOutline,
  isDiffOpen = false,
  onToggleDiff,
  onOpenHistory,
  isCopilotOpen = false,
  onToggleCopilot,
  onOpenGlobalSearch,
  zenMode = false,
  onToggleZenMode,
}: HeaderBarProps) {
  const { theme, setTheme, mdTheme, setMdTheme, globalFont, setGlobalFont, modernUi } =
    useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [warmth, setWarmth] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load Blue Light filter preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("netherite_blue_light");
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= 100) {
          setWarmth(val);
        }
      }
    } catch {}
  }, []);

  // Dynamically manage Tailwind theme colors & editor warmth
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (warmth === 0) {
      root.style.removeProperty("--background");
      root.style.removeProperty("--foreground");
      root.style.removeProperty("--sidebar-bg");
      root.style.removeProperty("--sidebar-fg");
      root.style.removeProperty("--card");
      root.style.removeProperty("--muted");
      root.style.removeProperty("--border");
      root.style.removeProperty("--editor-filter");
      root.style.removeProperty("filter");
    } else {
      const factor = warmth / 100;
      const isDark = theme === "dark";

      if (isDark) {
        // Dark mode: cold #09090b -> warm amber-charcoal
        const bgR = Math.round(9 + (36 - 9) * factor);
        const bgG = Math.round(9 + (26 - 9) * factor);
        const bgB = Math.round(11 + (15 - 11) * factor);

        const fgR = Math.round(250 - (250 - 245) * factor);
        const fgG = Math.round(250 - (250 - 224) * factor);
        const fgB = Math.round(250 - (250 - 180) * factor);

        // Sidebar in dark mode: cold (18, 18, 21) -> warm (32, 24, 16)
        const sbR = Math.round(18 + (32 - 18) * factor);
        const sbG = Math.round(18 + (24 - 18) * factor);
        const sbB = Math.round(21 + (16 - 21) * factor);

        const cdR = Math.round(18 + (42 - 18) * factor);
        const cdG = Math.round(18 + (32 - 18) * factor);
        const cdB = Math.round(21 + (20 - 21) * factor);

        const borderR = Math.round(39 + (55 - 39) * factor);
        const borderG = Math.round(39 + (42 - 39) * factor);
        const borderB = Math.round(42 + (28 - 42) * factor);

        root.style.setProperty("--background", `rgb(${bgR}, ${bgG}, ${bgB})`);
        root.style.setProperty("--foreground", `rgb(${fgR}, ${fgG}, ${fgB})`);
        root.style.setProperty("--sidebar-bg", `rgb(${sbR}, ${sbG}, ${sbB})`);
        root.style.setProperty("--sidebar-fg", `rgb(${fgR}, ${fgG}, ${fgB})`);
        root.style.setProperty("--card", `rgb(${cdR}, ${cdG}, ${cdB})`);
        root.style.setProperty("--muted", `rgb(${cdR}, ${cdG}, ${cdB})`);
        root.style.setProperty(
          "--border",
          `rgb(${borderR}, ${borderG}, ${borderB})`,
        );
        root.style.setProperty(
          "--editor-filter",
          `sepia(${warmth * 0.25}%) hue-rotate(-${warmth * 0.06}deg)`,
        );
        root.style.filter = `sepia(${warmth * 0.22}%) hue-rotate(-${warmth * 0.05}deg)`;
      } else {
        // Light mode: cold #fcfcfc -> warm amber parchment
        const bgR = Math.round(252 - (252 - 248) * factor);
        const bgG = Math.round(252 - (252 - 238) * factor);
        const bgB = Math.round(252 - (252 - 215) * factor);

        const fgR = Math.round(9 + (48 - 9) * factor);
        const fgG = Math.round(9 + (36 - 9) * factor);
        const fgB = Math.round(11 + (20 - 11) * factor);

        // Sidebar in light mode: cold (244, 244, 245) -> warm (246, 237, 220)
        const sbR = Math.round(244 + (246 - 244) * factor);
        const sbG = Math.round(244 - (244 - 237) * factor);
        const sbB = Math.round(245 - (245 - 220) * factor);

        const cdR = Math.round(255 - (255 - 252) * factor);
        const cdG = Math.round(255 - (255 - 244) * factor);
        const cdB = Math.round(255 - (255 - 225) * factor);

        const borderR = Math.round(228 + (235 - 228) * factor);
        const borderG = Math.round(228 + (222 - 228) * factor);
        const borderB = Math.round(231 + (195 - 231) * factor);

        root.style.setProperty("--background", `rgb(${bgR}, ${bgG}, ${bgB})`);
        root.style.setProperty("--foreground", `rgb(${fgR}, ${fgG}, ${fgB})`);
        root.style.setProperty("--sidebar-bg", `rgb(${sbR}, ${sbG}, ${sbB})`);
        root.style.setProperty("--sidebar-fg", `rgb(${fgR}, ${fgG}, ${fgB})`);
        root.style.setProperty("--card", `rgb(${cdR}, ${cdG}, ${cdB})`);
        root.style.setProperty("--muted", `rgb(${cdR}, ${cdG}, ${cdB})`);
        root.style.setProperty(
          "--border",
          `rgb(${borderR}, ${borderG}, ${borderB})`,
        );
        root.style.setProperty(
          "--editor-filter",
          `sepia(${warmth * 0.25}%) hue-rotate(-${warmth * 0.06}deg)`,
        );
        root.style.filter = `sepia(${warmth * 0.22}%) hue-rotate(-${warmth * 0.05}deg)`;
      }
    }

    try {
      localStorage.setItem("netherite_blue_light", warmth.toString());
    } catch {}
  }, [warmth, theme]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoreMenu]);

  const safeTitle = typeof noteTitle === "string" ? noteTitle : "";
  const isDrawing = safeTitle.endsWith(".excalidraw");
  const isUml = safeTitle.endsWith(".apollon") || safeTitle.endsWith(".uml");
  const isMermaid =
    safeTitle.endsWith(".mmd") || safeTitle.endsWith(".mermaid");
  const cleanTitle = safeTitle.replace(
    /\.(md|excalidraw|apollon|uml|mmd|mermaid)$/i,
    "",
  );
  const isMarkdown =
    Boolean(cleanTitle) &&
    !safeTitle.endsWith(".excalidraw") &&
    !safeTitle.endsWith(".apollon") &&
    !safeTitle.endsWith(".uml") &&
    !safeTitle.endsWith(".mmd") &&
    !safeTitle.endsWith(".mermaid") &&
    !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(safeTitle);

  // Zen Mode: render as a sleek, unobtrusive floating pill at bottom right so it NEVER covers top toolbars (Excalidraw, diagrams, etc.)
  if (zenMode) {
    return (
      <aside
        aria-label="Zen mode floating controls"
        className="bg-background/90 hover:bg-background border-border/80 animate-in fade-in slide-in-from-bottom-2 fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs opacity-75 shadow-xl backdrop-blur-md transition-all duration-200 select-none hover:opacity-100"
      >
        {cleanTitle && (
          <div className="text-muted-foreground flex max-w-[140px] min-w-0 items-center gap-1.5">
            {isDrawing ? (
              <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
            ) : isUml ? (
              <Network className="h-3.5 w-3.5 shrink-0 text-purple-500" />
            ) : isMermaid ? (
              <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="text-foreground truncate text-xs font-medium">
              {cleanTitle}
            </span>
          </div>
        )}

        {cleanTitle && <div className="bg-border/80 h-3 w-px shrink-0" />}

        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            className="bg-accent/80 hover:bg-accent text-foreground flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors"
            title="Exit Zen Mode (Esc or Ctrl+Alt+Z)"
          >
            <Minimize2 className="text-primary h-3 w-3" />
            <span>Exit Zen</span>
            <kbd className="py-0.2 bg-muted border-border/50 text-muted-foreground rounded border px-1 font-mono text-[9px]">
              Esc
            </kbd>
          </button>
        )}
      </aside>
    );
  }

  return (
    <header
      className={`border-border/40 sticky top-0 z-40 flex shrink-0 items-center justify-between gap-3 border-b px-3 backdrop-blur-md select-none sm:px-4 ${
        modernUi ? "h-10 bg-background/75" : "h-11 bg-background/80"
      }`}
      data-tauri-drag-region
    >
      {/* Native Apple Notes-Style Mobile Top Bar (Single Row, Zero Clutter) */}
      <div className="flex w-full min-w-0 items-center justify-between sm:hidden">
        <button
          onClick={onToggleSidebar}
          className="text-foreground hover:text-foreground/80 -ml-1.5 flex shrink-0 cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-xs font-medium transition-all active:scale-95"
          title="Open Notes Library"
          type="button"
        >
          <ChevronLeft className="text-primary h-4 w-4" />
          <span className="text-primary font-semibold">Notes</span>
        </button>

        <div className="flex max-w-[60%] min-w-0 items-center gap-1.5 px-2">
          {isDrawing ? (
            <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          ) : isUml ? (
            <Network className="h-3.5 w-3.5 shrink-0 text-purple-500" />
          ) : isMermaid ? (
            <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          ) : (
            <FileText className="text-foreground/70 h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-foreground truncate text-xs font-semibold">
            {cleanTitle || "Netherite"}
          </span>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isSaving
                ? "animate-ping bg-amber-500"
                : isDirty
                  ? "bg-amber-400"
                  : "bg-emerald-500"
            }`}
            title={
              isSaving ? "Saving..." : isDirty ? "Unsaved changes" : "Synced"
            }
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("netherite:open-more-sheet"),
                );
              }
            }}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/60 cursor-pointer rounded-lg p-1.5 transition-all active:scale-90"
            title="More options"
            type="button"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden w-full min-w-0 items-center justify-between sm:flex">
        {/* Left: Sidebar Toggle & Notion Page Breadcrumb */}
        <div className="mr-2 flex min-w-0 flex-1 items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className={`hover:bg-accent/60 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer rounded-md p-1.5 transition-colors ${
              zenMode || sidebarCollapsed ? "flex" : "flex sm:hidden"
            }`}
            title="Toggle Sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>

          {sidebarCollapsed && (
            <div className="mr-1 hidden shrink-0 items-center gap-2 text-xs font-semibold sm:flex">
              <NetheriteLogo className="text-foreground h-5 w-auto shrink-0" />
              <span className="hidden text-[10px] font-extrabold tracking-widest md:inline">
                NETHERITE
              </span>
            </div>
          )}

          {/* Minimal Notion Breadcrumb or Workspace Title */}
          {cleanTitle ? (
            <>
              <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
                {isDrawing ? (
                  <Palette className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                ) : isUml ? (
                  <Network className="h-3.5 w-3.5 shrink-0 text-purple-500 dark:text-purple-400" />
                ) : isMermaid ? (
                  <Workflow className="h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <FileText className="text-foreground/70 h-3.5 w-3.5 shrink-0" />
                )}
                <span className="text-foreground max-w-[140px] truncate text-xs font-semibold sm:max-w-[200px] sm:text-sm md:max-w-xs lg:max-w-sm">
                  {cleanTitle}
                </span>
              </div>

              {/* Subtle Sync & Diff Badge (Classic Mode) */}
              {!modernUi && !zenMode && (
                <button
                  onClick={onOpenDiff}
                  className="text-muted-foreground hover:bg-accent/50 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-1.5 py-0.5 text-[11px] transition-colors"
                  title={
                    isSaving
                      ? "Saving changes..."
                      : isDirty
                        ? `Unsaved changes (${diffSummary || "Modified"})`
                        : "All changes saved to Google Drive"
                  }
                >
                  {isSaving ? (
                    <>
                      <div className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                      <span className="hidden font-medium whitespace-nowrap text-amber-500 xl:inline">
                        Saving...
                      </span>
                    </>
                  ) : isDirty ? (
                    <>
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span className="hidden font-mono font-medium whitespace-nowrap text-amber-500 xl:inline">
                        {diffSummary || "Unsaved"}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground/80 hidden whitespace-nowrap xl:inline">
                        Synced
                      </span>
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
              <span className="text-foreground text-xs font-semibold tracking-tight sm:text-sm">
                Netherite
              </span>
            </div>
          )}
        </div>

        {/* Modern UI: Center Command Search Trigger */}
        {modernUi && onOpenGlobalSearch && !zenMode && (
          <div className="hidden md:flex flex-1 justify-center px-2 max-w-sm">
            <button
              onClick={onOpenGlobalSearch}
              className="hover:bg-accent/60 bg-muted/40 text-muted-foreground hover:text-foreground border-border/40 flex w-full max-w-xs cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1 text-xs transition-colors"
              title="Global Search & Jump (Ctrl+K)"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 opacity-60" />
                <span className="text-[11px]">Search notes...</span>
              </div>
              <kbd className="bg-background/80 border-border/60 text-muted-foreground rounded border px-1.5 py-0.2 font-mono text-[9px]">
                ⌘K
              </kbd>
            </button>
          </div>
        )}

        {/* Right: Whisper-quiet Notion Actions */}
        <div
          className="relative flex shrink-0 items-center gap-1 sm:gap-1.5"
          ref={menuRef}
          data-tauri-no-drag
        >
          {zenMode ? (
            onToggleZenMode && (
              <button
                onClick={onToggleZenMode}
                className="bg-accent text-foreground hover:bg-accent/80 border-border/60 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold shadow-2xs transition-all"
                title="Exit Zen Mode (Esc or Ctrl+Alt+Z)"
              >
                <Minimize2 className="text-primary h-3.5 w-3.5" />
                <span className="text-[11px]">Exit Zen</span>
                <kbd className="py-0.2 bg-muted/60 border-border/40 text-muted-foreground hidden rounded border px-1 font-mono text-[9px] sm:inline">
                  Esc
                </kbd>
              </button>
            )
          ) : modernUi ? (
            <>
              {/* Save Button (prominent only when dirty) */}
              {cleanTitle && isDirty && (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-foreground text-background flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium shadow-xs transition-all hover:opacity-90"
                  title="Save changes (Ctrl+S)"
                >
                  <Save className="h-3 w-3" />
                  <span className="hidden md:inline">Save</span>
                </button>
              )}

              {/* Polished Sync Status Badge */}
              <button
                onClick={onManualSync}
                disabled={isSyncing || isSaving}
                className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] transition-colors"
                title={
                  isSaving
                    ? "Saving changes to Google Drive..."
                    : isSyncing
                      ? "Syncing latest changes..."
                      : isDirty
                        ? `Unsaved changes (${diffSummary || "Modified"})`
                        : "All changes saved to Google Drive (Click to pull latest)"
                }
              >
                {isSaving || isSyncing ? (
                  <>
                    <div className="h-2 w-2 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <span className="hidden font-medium whitespace-nowrap text-amber-500 lg:inline">
                      {isSaving ? "Saving..." : "Syncing..."}
                    </span>
                  </>
                ) : isDirty ? (
                  <>
                    <div className="h-2 w-2 shrink-0 rounded-full bg-amber-400 animate-pulse" />
                    <span className="hidden font-mono font-medium whitespace-nowrap text-amber-500 lg:inline">
                      {diffSummary || "Unsaved"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground/80 hidden whitespace-nowrap lg:inline">
                      Synced
                    </span>
                  </>
                )}
              </button>

              {/* Group 1: Review & History Pill */}
              {cleanTitle && (onToggleDiff || onOpenHistory) && (
                <div className="border-border/60 bg-muted/30 hidden items-center rounded-lg border p-0.5 xl:flex">
                  {onToggleDiff && (
                    <button
                      onClick={onToggleDiff}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-all ${
                        isDiffOpen
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : isDirty
                            ? "text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                      }`}
                      title="Toggle Git Diff Inspector (Ctrl+Shift+D)"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      <span className="text-[11px]">Diff</span>
                      {isDirty && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      )}
                    </button>
                  )}
                  {onToggleDiff && onOpenHistory && (
                    <div className="bg-border/60 h-3 w-px mx-0.5" />
                  )}
                  {onOpenHistory && (
                    <button
                      onClick={onOpenHistory}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-all"
                      title="Version History (Ctrl+H)"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span className="text-[11px]">History</span>
                    </button>
                  )}
                </div>
              )}

              {/* Split Editor Toggle (visible on wide screens) */}
              {cleanTitle && onToggleSplitView && (
                <button
                  onClick={onToggleSplitView}
                  className={`hover:bg-accent/60 hidden shrink-0 cursor-pointer rounded-md p-1.5 transition-colors xl:flex ${
                    isSplitView
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle Split View"
                >
                  <Columns className="h-4 w-4" />
                </button>
              )}

              {/* Group 2: Gemini Copilot */}
              {onToggleCopilot && (
                <button
                  onClick={onToggleCopilot}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    isCopilotOpen
                      ? "border border-purple-500/40 bg-purple-500/20 font-semibold text-purple-600 shadow-2xs dark:text-purple-300"
                      : "border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20"
                  }`}
                  title="Toggle Gemini AI Copilot (Ctrl+J)"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span className="hidden text-[11px] xl:inline font-medium">Copilot</span>
                </button>
              )}

              {/* Outline Toggle */}
              {cleanTitle && isMarkdown && onToggleOutline && (
                <button
                  onClick={onToggleOutline}
                  className={`hover:bg-accent/60 hidden shrink-0 cursor-pointer rounded-md p-1.5 transition-colors sm:flex ${
                    isOutlineOpen
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle Document Outline"
                >
                  <ListTree className="h-4 w-4" />
                </button>
              )}

              {/* PDF Export Button */}
              {cleanTitle && onExportPdf && (
                <button
                  onClick={onExportPdf}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors 2xl:flex"
                  title="Export as PDF Document (Ctrl+P)"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] 2xl:inline">PDF</span>
                </button>
              )}

              {/* Zen Mode Button */}
              {onToggleZenMode && (
                <button
                  onClick={onToggleZenMode}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors 2xl:flex"
                  title="Enter Zen Mode (Ctrl+Alt+Z)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] 2xl:inline">Zen</span>
                </button>
              )}

              {/* More Options Button */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`hover:bg-accent/60 shrink-0 cursor-pointer rounded-md p-1.5 transition-colors ${
                  showMoreMenu
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              {/* Save Button (prominent only when dirty, like Notion) */}
              {cleanTitle && isDirty && (
                <button
                  onClick={onSave}
                  disabled={isSaving}
                  className="bg-foreground text-background flex shrink-0 cursor-pointer items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium shadow-xs transition-all hover:opacity-90"
                  title="Save changes (Ctrl+S)"
                >
                  <Save className="h-3 w-3" />
                  <span className="hidden md:inline">Save</span>
                </button>
              )}

              {/* Sync with Drive Button */}
              {onManualSync && (
                <button
                  onClick={onManualSync}
                  disabled={isSyncing || isSaving}
                  className={`hover:bg-accent/60 shrink-0 cursor-pointer rounded-md p-1.5 transition-colors ${
                    isSyncing
                      ? "text-foreground bg-accent/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Sync with Google Drive (Pull Latest)"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isSyncing ? "text-foreground animate-spin" : ""}`}
                  />
                </button>
              )}

              {/* Split Editor Toggle (visible on wide screens; on smaller laptop split view, tab bar handles split) */}
              {cleanTitle && onToggleSplitView && (
                <button
                  onClick={onToggleSplitView}
                  className={`hover:bg-accent/60 hidden shrink-0 cursor-pointer rounded-md p-1.5 transition-colors xl:flex ${
                    isSplitView
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle Split View"
                >
                  <Columns className="h-4 w-4" />
                </button>
              )}

              {/* Git Diff Sidebar Toggle */}
              {cleanTitle && onToggleDiff && (
                <button
                  onClick={onToggleDiff}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
                    isDiffOpen
                      ? "border border-emerald-500/30 bg-emerald-500/20 font-semibold text-emerald-600 shadow-2xs dark:text-emerald-300"
                      : isDirty
                        ? "border border-amber-500/30 bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                  title="Toggle Git Diff Inspector (Ctrl+Shift+D)"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] xl:inline">Diff</span>
                  {isDirty && (
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                  )}
                </button>
              )}

              {/* Version History Button */}
              {cleanTitle && onOpenHistory && (
                <button
                  onClick={onOpenHistory}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all"
                  title="Version History (Ctrl+H)"
                >
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] xl:inline">History</span>
                </button>
              )}

              {/* Global Search Button */}
              {onOpenGlobalSearch && (
                <button
                  onClick={onOpenGlobalSearch}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-xs transition-colors xl:px-2 xl:py-1"
                  title="Global Search (Ctrl+K)"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] 2xl:inline">Search</span>
                  <kbd className="py-0.2 bg-muted/60 border-border/40 hidden rounded border px-1 font-mono text-[9px] 2xl:inline">
                    ⌘K
                  </kbd>
                </button>
              )}

              {/* Gemini Copilot Toggle Button */}
              {onToggleCopilot && (
                <button
                  onClick={onToggleCopilot}
                  className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md p-1.5 text-xs font-medium transition-all xl:px-2.5 xl:py-1 ${
                    isCopilotOpen
                      ? "border border-purple-500/30 bg-purple-500/20 font-semibold text-purple-600 shadow-2xs dark:text-purple-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                  title="Toggle Gemini AI Copilot (Ctrl+J)"
                >
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <span className="hidden text-[11px] xl:inline">Copilot</span>
                </button>
              )}

              {/* Outline Toggle - strictly available for Markdown (.md) documents */}
              {cleanTitle &&
                !noteTitle.endsWith(".excalidraw") &&
                !noteTitle.endsWith(".apollon") &&
                !noteTitle.endsWith(".uml") &&
                !noteTitle.endsWith(".mmd") &&
                !noteTitle.endsWith(".mermaid") &&
                !/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(noteTitle) &&
                onToggleOutline && (
                  <button
                    onClick={onToggleOutline}
                    className={`hover:bg-accent/60 hidden shrink-0 cursor-pointer rounded-md p-1.5 transition-colors sm:flex ${
                      isOutlineOpen
                        ? "text-foreground bg-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Toggle Document Outline"
                  >
                    <ListTree className="h-4 w-4" />
                  </button>
                )}

              {/* Quick PDF Export Button (available in ... menu on smaller screens) */}
              {cleanTitle && onExportPdf && (
                <button
                  onClick={onExportPdf}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors xl:flex"
                  title="Export as PDF Document (Ctrl+P)"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] 2xl:inline">PDF</span>
                </button>
              )}

              {/* Zen Mode Button (available in ... menu on smaller screens) */}
              {onToggleZenMode && (
                <button
                  onClick={onToggleZenMode}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent/60 hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors xl:flex"
                  title="Enter Zen Mode (Ctrl+Alt+Z)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span className="hidden text-[11px] 2xl:inline">Zen</span>
                </button>
              )}

              {/* Notion-Style More Options (...) Button */}
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`hover:bg-accent/60 shrink-0 cursor-pointer rounded-md p-1.5 transition-colors ${
                  showMoreMenu
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="More Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Notion Sleek Popover Menu */}
          {showMoreMenu && (
            <div className="bg-card/80 glass-popover border-border animate-in fade-in zoom-in-95 absolute top-9 right-0 z-50 max-h-[85vh] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border p-2.5 text-xs shadow-2xl duration-100 sm:w-80">
              {/* Markdown Themes (7 Themes in both Light & Dark = 14) */}
              <div className="border-border/40 border-b p-1.5 pb-2.5">
                <div className="text-muted-foreground mb-2 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase">
                  <div className="flex items-center gap-1.5">
                    <Palette className="text-primary h-3.5 w-3.5" />
                    <span>Theme & Palette (14 Styles)</span>
                  </div>
                  <span className="text-primary font-mono text-[10px] font-medium capitalize">
                    {mdTheme}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {MD_THEMES.map((t) => {
                    const active = mdTheme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setMdTheme(t.id)}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/10 text-primary ring-primary/30 font-semibold shadow-2xs ring-1"
                            : "border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className="border-border/40 h-2.5 w-2.5 shrink-0 rounded-full border"
                          style={{ backgroundColor: t.previewColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] leading-tight font-medium">
                            {t.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Global Google Fonts Selection */}
              <div className="border-border/40 space-y-1.5 border-b p-1.5 py-2.5">
                <div className="text-muted-foreground flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase">
                  <div className="flex items-center gap-1.5">
                    <Type className="text-primary h-3.5 w-3.5" />
                    <span>Global Google Font</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-[10px]">
                    {
                      GLOBAL_FONTS.find(
                        (f) => f.id === globalFont,
                      )?.name?.split(" ")[0]
                    }
                  </span>
                </div>
                <select
                  value={globalFont}
                  onChange={(e) => {
                    const f = e.target.value as GlobalFontId;
                    setGlobalFont(f);
                    onEditorFontChange?.(f);
                  }}
                  className="bg-background border-border/70 text-foreground focus:ring-primary w-full cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-medium focus:ring-1 focus:outline-none"
                >
                  <optgroup label="Cursive & Handwritten">
                    <option value="crafty-girls">Girly (Crafty Girls)</option>
                    <option value="excalifont">
                      Excalifont (Handwritten Sketch)
                    </option>
                  </optgroup>
                  <optgroup label="Modern Sans-Serif">
                    <option value="system">Geist / Clean Sans</option>
                    <option value="inter">Inter (Clean)</option>
                    <option value="outfit">Outfit (Editorial)</option>
                    <option value="jakarta">Plus Jakarta Sans</option>
                    <option value="dm-sans">DM Sans</option>
                  </optgroup>
                  <optgroup label="Book & Literary Serif">
                    <option value="literata">Literata (Warm Serif)</option>
                    <option value="playfair">Playfair Display (Luxury)</option>
                    <option value="lora">Lora</option>
                    <option value="merriweather">Merriweather</option>
                  </optgroup>
                  <optgroup label="Developer Monospace">
                    <option value="jetbrains">JetBrains Mono (Code)</option>
                    <option value="fira">Fira Code (Technical)</option>
                    <option value="space-mono">Space Mono (Retro)</option>
                  </optgroup>
                </select>
              </div>

              {/* Blue Light / Warm Reading Mode Slider */}
              <div className="border-border/40 space-y-2 border-b p-2">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
                    <SunMedium className="h-3.5 w-3.5 text-foreground" />
                    <span>Blue Light Filter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-[11px] font-medium">
                      {warmth === 0 ? "Off" : `${warmth}%`}
                    </span>
                    {warmth > 0 && (
                      <button
                        onClick={() => setWarmth(0)}
                        className="text-muted-foreground hover:text-foreground py-0.2 hover:bg-accent rounded px-1 text-[10px] transition-colors"
                        title="Turn off"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-0.5">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={warmth}
                    onChange={(e) => setWarmth(parseInt(e.target.value, 10))}
                    className="bg-muted h-1.5 w-full cursor-pointer appearance-none rounded-lg accent-foreground blue-light-slider transition-all"
                  />
                </div>
              </div>

              {/* Document Word & Character Count */}
              <div className="border-border/40 text-muted-foreground space-y-1 border-b p-1.5">
                <div className="flex items-center justify-between">
                  <span>Words:</span>
                  <span className="text-foreground font-mono font-medium">
                    {wordCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Characters:</span>
                  <span className="text-foreground font-mono font-medium">
                    {charCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Reading time:</span>
                  <span className="text-foreground font-mono font-medium">
                    {Math.max(1, Math.ceil(wordCount / 200))} min
                  </span>
                </div>
              </div>

              {/* Actions: Export Markdown & Copy Link */}
              <div className="space-y-0.5 p-1">
                {onManualSync && (
                  <button
                    onClick={() => {
                      onManualSync();
                      setShowMoreMenu(false);
                    }}
                    disabled={isSyncing}
                    className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  >
                    <RefreshCw
                      className={`text-muted-foreground h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                    />
                    <span>Sync with Google Drive</span>
                  </button>
                )}

                {onExportMarkdown && (
                  <button
                    onClick={() => {
                      onExportMarkdown();
                      setShowMoreMenu(false);
                    }}
                    className="hover:bg-accent text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  >
                    <Download className="text-muted-foreground h-3.5 w-3.5" />
                    <span>Export Markdown (.md)</span>
                  </button>
                )}

                {onExportPdf && (
                  <button
                    onClick={() => {
                      onExportPdf();
                      setShowMoreMenu(false);
                    }}
                    className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  >
                    <Printer className="text-muted-foreground h-3.5 w-3.5" />
                    <span>Export PDF Document...</span>
                  </button>
                )}

                {onToggleZenMode && (
                  <button
                    onClick={() => {
                      onToggleZenMode();
                      setShowMoreMenu(false);
                    }}
                    className="hover:bg-accent text-foreground flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  >
                    <Maximize2 className="text-muted-foreground h-3.5 w-3.5" />
                    <span>Enter Zen Mode (Ctrl+Alt+Z)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                  }}
                  className="hover:bg-accent text-foreground flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="text-muted-foreground h-3.5 w-3.5" />
                      <span>Switch to Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="text-muted-foreground h-3.5 w-3.5" />
                      <span>Switch to Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
