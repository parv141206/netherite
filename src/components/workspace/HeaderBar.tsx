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
  isCopilotOpen = false,
  onToggleCopilot,
  onOpenGlobalSearch,
  zenMode = false,
  onToggleZenMode,
}: HeaderBarProps) {
  const {
    theme,
    setTheme,
    mdTheme,
    setMdTheme,
    globalFont,
    setGlobalFont,
  } = useTheme();
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
        root.style.setProperty("--border", `rgb(${borderR}, ${borderG}, ${borderB})`);
        root.style.setProperty("--editor-filter", `sepia(${warmth * 0.25}%) hue-rotate(-${warmth * 0.06}deg)`);
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
        root.style.setProperty("--border", `rgb(${borderR}, ${borderG}, ${borderB})`);
        root.style.setProperty("--editor-filter", `sepia(${warmth * 0.25}%) hue-rotate(-${warmth * 0.06}deg)`);
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

  const isDrawing = noteTitle.endsWith(".excalidraw");
  const isUml = noteTitle.endsWith(".apollon") || noteTitle.endsWith(".uml");
  const isMermaid = noteTitle.endsWith(".mmd") || noteTitle.endsWith(".mermaid");
  const cleanTitle = noteTitle.replace(/\.(md|excalidraw|apollon|uml|mmd|mermaid)$/i, "");

  return (
    <header
      className="h-11 border-b border-border/40 bg-background/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 sticky top-0 z-40 select-none shrink-0"
      data-tauri-drag-region
    >
      {/* Left: Sidebar Toggle & Notion Page Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 hover:bg-accent/60 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer ${
            zenMode || sidebarCollapsed ? "flex" : "flex sm:hidden"
          }`}
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {sidebarCollapsed && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold mr-1">
            <NetheriteLogo className="h-5 w-auto text-foreground shrink-0" />
            <span className="tracking-widest text-[10px] font-extrabold">NETHERITE</span>
          </div>
        )}

        {/* Minimal Notion Breadcrumb or Workspace Title */}
        {cleanTitle ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              {isDrawing ? (
                <Palette className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              ) : isUml ? (
                <Network className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
              ) : isMermaid ? (
                <Workflow className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
              )}
              <span className="truncate font-medium text-foreground text-xs sm:text-sm max-w-[110px] xs:max-w-[160px] sm:max-w-xs">
                {cleanTitle}
              </span>
            </div>

            {/* Subtle Sync & Diff Badge (Hidden in Zen Mode) */}
            {!zenMode && (
              <button
                onClick={onOpenDiff}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] text-muted-foreground hover:bg-accent/50 transition-colors cursor-pointer"
                title="View changelog & diff"
              >
                {isSaving ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="hidden xs:inline">Saving...</span>
                  </>
                ) : isDirty ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="font-mono text-amber-500 font-medium">
                      {diffSummary || "Unsaved"}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="hidden xs:inline text-muted-foreground/80">Synced</span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
            <span className="font-semibold text-foreground tracking-tight text-xs sm:text-sm">
              Netherite
            </span>
          </div>
        )}
      </div>

      {/* Right: Whisper-quiet Notion Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 relative" ref={menuRef} data-tauri-no-drag>
        {zenMode ? (
          onToggleZenMode && (
            <button
              onClick={onToggleZenMode}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-accent text-foreground hover:bg-accent/80 transition-all cursor-pointer border border-border/60 shadow-2xs"
              title="Exit Zen Mode (Esc or Ctrl+Alt+Z)"
            >
              <Minimize2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px]">Exit Zen</span>
              <kbd className="hidden sm:inline text-[9px] font-mono px-1 py-0.2 bg-muted/60 border border-border/40 rounded text-muted-foreground">
                Esc
              </kbd>
            </button>
          )
        ) : (
          <>
            {/* Save Button (prominent only when dirty, like Notion) */}
            {cleanTitle && isDirty && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-foreground text-background hover:opacity-90 transition-all shadow-xs cursor-pointer"
                title="Save changes (Ctrl+S)"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            )}

            {/* Sync with Drive Button */}
            {onManualSync && (
              <button
                onClick={onManualSync}
                disabled={isSyncing || isSaving}
                className={`p-1.5 rounded-md hover:bg-accent/60 transition-colors cursor-pointer ${
                  isSyncing ? "text-foreground bg-accent/40" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Sync with Google Drive (Pull Latest)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-foreground" : ""}`} />
              </button>
            )}

            {/* Split Editor Toggle */}
            {cleanTitle && onToggleSplitView && (
              <button
                onClick={onToggleSplitView}
                className={`hidden sm:flex p-1.5 rounded-md hover:bg-accent/60 transition-colors cursor-pointer ${
                  isSplitView ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Toggle Split View"
              >
                <Columns className="w-4 h-4" />
              </button>
            )}

            {/* Git Diff Sidebar Toggle */}
            {cleanTitle && onToggleDiff && (
              <button
                onClick={onToggleDiff}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isDiffOpen
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs font-semibold"
                    : isDirty
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
                title="Toggle Git Diff Inspector (Ctrl+Shift+D)"
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">Diff</span>
                {isDirty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                )}
              </button>
            )}

            {/* Global Search Button */}
            {onOpenGlobalSearch && (
              <button
                onClick={onOpenGlobalSearch}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                title="Global Search (Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden md:inline">Search</span>
                <kbd className="hidden lg:inline text-[9px] font-mono px-1 py-0.2 bg-muted/60 border border-border/40 rounded">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Gemini Copilot Toggle Button */}
            {onToggleCopilot && (
              <button
                onClick={onToggleCopilot}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  isCopilotOpen
                    ? "bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                }`}
                title="Toggle Gemini AI Copilot (Ctrl+J)"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline text-[11px]">Copilot</span>
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
                  className={`hidden sm:flex p-1.5 rounded-md hover:bg-accent/60 transition-colors cursor-pointer ${
                    isOutlineOpen ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Toggle Document Outline"
                >
                  <ListTree className="w-4 h-4" />
                </button>
              )}

            {/* Quick PDF Export Button */}
            {cleanTitle && onExportPdf && (
              <button
                onClick={onExportPdf}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                title="Export as PDF Document (Ctrl+P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px]">PDF</span>
              </button>
            )}

            {/* Zen Mode Button */}
            {onToggleZenMode && (
              <button
                onClick={onToggleZenMode}
                className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
                title="Enter Zen Mode (Ctrl+Alt+Z)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline text-[11px]">Zen</span>
              </button>
            )}

            {/* Notion-Style More Options (...) Button */}
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`p-1.5 rounded-md hover:bg-accent/60 transition-colors cursor-pointer ${
                showMoreMenu ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
              }`}
              title="More Options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Notion Sleek Popover Menu */}
        {showMoreMenu && (
          <div className="absolute right-0 top-9 w-72 sm:w-80 max-w-[calc(100vw-1.5rem)] bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs max-h-[85vh] overflow-y-auto">
            {/* Markdown Themes (7 Themes in both Light & Dark = 14) */}
            <div className="p-1.5 pb-2.5 border-b border-border/40">
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-primary" />
                  <span>Theme & Palette (14 Styles)</span>
                </div>
                <span className="text-[10px] font-mono text-primary font-medium capitalize">
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
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-2xs ring-1 ring-primary/30"
                          : "border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-border/40"
                        style={{ backgroundColor: t.previewColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] truncate leading-tight font-medium">
                          {t.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global Google Fonts Selection */}
            <div className="p-1.5 py-2.5 border-b border-border/40 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-primary" />
                  <span>Global Google Font</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {GLOBAL_FONTS.find((f) => f.id === globalFont)?.name?.split(" ")[0]}
                </span>
              </div>
              <select
                value={globalFont}
                onChange={(e) => {
                  const f = e.target.value as GlobalFontId;
                  setGlobalFont(f);
                  onEditorFontChange?.(f);
                }}
                className="w-full bg-background border border-border/70 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <optgroup label="Cursive & Handwritten">
                  <option value="crafty-girls">Girly (Crafty Girls)</option>
                  <option value="excalifont">Excalifont (Handwritten Sketch)</option>
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
            <div className="p-2 border-b border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                  <span>Blue Light Filter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-muted-foreground font-medium">
                    {warmth === 0 ? "Off" : `${warmth}%`}
                  </span>
                  {warmth > 0 && (
                    <button
                      onClick={() => setWarmth(0)}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.2 rounded hover:bg-accent transition-colors"
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
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                />
              </div>
            </div>

            {/* Document Word & Character Count */}
            <div className="p-1.5 border-b border-border/40 space-y-1 text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Words:</span>
                <span className="font-mono text-foreground font-medium">{wordCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Characters:</span>
                <span className="font-mono text-foreground font-medium">{charCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Reading time:</span>
                <span className="font-mono text-foreground font-medium">
                  {Math.max(1, Math.ceil(wordCount / 200))} min
                </span>
              </div>
            </div>

            {/* Actions: Export Markdown & Copy Link */}
            <div className="p-1 space-y-0.5">
              {onManualSync && (
                <button
                  onClick={() => {
                    onManualSync();
                    setShowMoreMenu(false);
                  }}
                  disabled={isSyncing}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isSyncing ? "animate-spin" : ""}`} />
                  <span>Sync with Google Drive</span>
                </button>
              )}

              {onExportMarkdown && (
                <button
                  onClick={() => {
                    onExportMarkdown();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Export Markdown (.md)</span>
                </button>
              )}

              {onExportPdf && (
                <button
                  onClick={() => {
                    onExportPdf();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Export PDF Document...</span>
                </button>
              )}

              {onToggleZenMode && (
                <button
                  onClick={() => {
                    onToggleZenMode();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Enter Zen Mode (Ctrl+Alt+Z)</span>
                </button>
              )}

              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors"
              >
                {theme === "dark" ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Switch to Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Switch to Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
