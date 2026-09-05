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
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

interface HeaderBarProps {
  noteTitle?: string;
  isSaving?: boolean;
  isDirty?: boolean;
  diffSummary?: string;
  onOpenDiff?: () => void;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  onSave?: () => void;
  onExportMarkdown?: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  wordCount?: number;
  charCount?: number;
  editorFont?: "sans" | "serif" | "mono";
  onEditorFontChange?: (font: "sans" | "serif" | "mono") => void;
  isOutlineOpen?: boolean;
  onToggleOutline?: () => void;
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
  onExportMarkdown,
  onToggleSidebar,
  sidebarCollapsed = false,
  wordCount = 0,
  charCount = 0,
  editorFont = "sans",
  onEditorFontChange,
  isOutlineOpen = false,
  onToggleOutline,
}: HeaderBarProps) {
  const { theme, setTheme } = useTheme();
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

  const cleanTitle = noteTitle.replace(/\.md$/i, "");

  return (
    <header className="h-11 border-b border-border/40 bg-background/80 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-3 sticky top-0 z-40 select-none shrink-0">
      {/* Left: Sidebar Toggle & Notion Page Breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 hover:bg-accent/60 rounded-md text-muted-foreground hover:text-foreground transition-colors ${
            sidebarCollapsed ? "flex" : "flex sm:hidden"
          }`}
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Minimal Notion Breadcrumb or Workspace Title */}
        {cleanTitle ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
              <FileText className="w-3.5 h-3.5 text-foreground/70 shrink-0" />
              <span className="truncate font-medium text-foreground text-xs sm:text-sm max-w-[150px] sm:max-w-xs">
                {cleanTitle}
              </span>
            </div>

            {/* Subtle Sync & Diff Badge */}
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
      <div className="flex items-center gap-1 sm:gap-1.5 relative" ref={menuRef}>
        {/* Save Button (prominent only when dirty, like Notion) */}
        {cleanTitle && isDirty && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-foreground text-background hover:opacity-90 transition-all shadow-xs"
            title="Save changes (Ctrl+S)"
          >
            <Save className="w-3 h-3" />
            <span>Save</span>
          </button>
        )}

        {/* Split Editor Toggle */}
        {cleanTitle && onToggleSplitView && (
          <button
            onClick={onToggleSplitView}
            className={`hidden sm:flex p-1.5 rounded-md hover:bg-accent/60 transition-colors ${
              isSplitView ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Split View"
          >
            <Columns className="w-4 h-4" />
          </button>
        )}

        {/* Outline Toggle */}
        {cleanTitle && onToggleOutline && (
          <button
            onClick={onToggleOutline}
            className={`hidden sm:flex p-1.5 rounded-md hover:bg-accent/60 transition-colors ${
              isOutlineOpen ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Document Outline"
          >
            <ListTree className="w-4 h-4" />
          </button>
        )}

        {/* Notion-Style More Options (...) Button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={`p-1.5 rounded-md hover:bg-accent/60 transition-colors ${
            showMoreMenu ? "text-foreground bg-accent" : "text-muted-foreground hover:text-foreground"
          }`}
          title="More Options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Notion Sleek Popover Menu */}
        {showMoreMenu && (
          <div className="absolute right-0 top-9 w-64 bg-card/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
            {/* Font Style Options (Notion Style) */}
            {onEditorFontChange && (
              <div className="p-1.5 pb-2.5 border-b border-border/40">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Typography Style
                </div>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/30">
                  <button
                    onClick={() => onEditorFontChange("sans")}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                      editorFont === "sans"
                        ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    <span className="text-base font-sans font-medium mb-0.5">Ag</span>
                    <span className="text-[10px] leading-none">Default</span>
                  </button>
                  <button
                    onClick={() => onEditorFontChange("serif")}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                      editorFont === "serif"
                        ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    <span className="text-base font-serif font-medium mb-0.5">Ag</span>
                    <span className="text-[10px] leading-none">Literata</span>
                  </button>
                  <button
                    onClick={() => onEditorFontChange("mono")}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-md transition-all cursor-pointer ${
                      editorFont === "mono"
                        ? "bg-background text-foreground shadow-xs font-semibold ring-1 ring-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40"
                    }`}
                  >
                    <span className="text-base font-mono font-medium mb-0.5">Ag</span>
                    <span className="text-[10px] leading-none">Mono</span>
                  </button>
                </div>
              </div>
            )}

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

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShowMoreMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-accent flex items-center gap-2 text-foreground transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Copy Note Link</span>
              </button>

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
