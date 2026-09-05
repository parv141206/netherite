"use client";

import React from "react";
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
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

interface MobileBottomBarProps {
  onToggleSidebar: () => void;
  onCreateNote: () => void;
  onToggleOutline: () => void;
  onToggleSplitView?: () => void;
  isSplitView?: boolean;
  isOutlineOpen: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onOpenDiff?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  diffSummary?: string;
}

export function MobileBottomBar({
  onToggleSidebar,
  onCreateNote,
  onToggleOutline,
  isOutlineOpen,
  isDirty = false,
  isSaving = false,
  onSave,
  onOpenDiff,
  onManualSync,
  isSyncing = false,
  diffSummary = "",
}: MobileBottomBarProps) {
  const { theme, setTheme } = useTheme();

  const dispatchEditorCommand = (command: string, payload?: any) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("netherite:editor-command", {
          detail: { command, payload },
        })
      );
    }
  };

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col select-none safe-area-bottom">
      {/* Obsidian-Style Mobile Quick-Formatting Accessory Ribbon */}
      <div className="h-10 bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center px-2 gap-1 overflow-x-auto scrollbar-none text-muted-foreground shadow-sm">
        {/* Math Quick Keys (Single Tap) */}
        <button
          onClick={() => dispatchEditorCommand("math-inline")}
          className="px-2 py-1 bg-accent/70 hover:bg-accent text-foreground text-xs font-mono font-bold rounded-md active:scale-95 transition-all flex items-center gap-1 shrink-0"
          title="Insert Inline Math ($)"
        >
          <Sigma className="w-3.5 h-3.5 text-foreground" />
          <span>$</span>
        </button>

        <button
          onClick={() => dispatchEditorCommand("math-block")}
          className="px-2 py-1 bg-accent/70 hover:bg-accent text-foreground text-xs font-mono font-bold rounded-md active:scale-95 transition-all shrink-0"
          title="Insert Display Math Block ($$)"
        >
          $$
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

        {/* Headings */}
        <button
          onClick={() => dispatchEditorCommand("h1")}
          className="px-2 py-1 hover:bg-accent/70 text-foreground text-xs font-bold rounded-md active:scale-95 transition-all shrink-0"
          title="Heading 1"
        >
          H1
        </button>

        <button
          onClick={() => dispatchEditorCommand("h2")}
          className="px-2 py-1 hover:bg-accent/70 text-foreground text-xs font-bold rounded-md active:scale-95 transition-all shrink-0"
          title="Heading 2"
        >
          H2
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

        {/* Bold & Italic */}
        <button
          onClick={() => dispatchEditorCommand("bold")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("italic")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

        {/* Lists & Task */}
        <button
          onClick={() => dispatchEditorCommand("bullet")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Bullet List"
        >
          <List className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("task")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Task List"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("ordered")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Numbered List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("quote")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Quote"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("code")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-border/60 mx-0.5 shrink-0" />

        {/* Undo & Redo */}
        <button
          onClick={() => dispatchEditorCommand("undo")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => dispatchEditorCommand("redo")}
          className="p-1.5 hover:bg-accent/70 text-foreground rounded-md active:scale-95 transition-all shrink-0"
          title="Redo"
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
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="text-[10px] font-medium">Sync</span>
            </button>
          </>
        )}
      </div>

      {/* Main Navigation Tab Bar */}
      <div className="h-12 bg-background/95 backdrop-blur-xl border-t border-border/40 flex items-center justify-around px-2 shadow-2xl">
        <button
          onClick={onToggleSidebar}
          className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          title="Pages"
        >
          <Folder className="w-4 h-4 text-foreground/80" />
          <span className="text-[10px] font-medium">Pages</span>
        </button>

        <button
          onClick={onToggleOutline}
          className={`flex flex-col items-center gap-0.5 p-1 active:scale-95 transition-all ${
            isOutlineOpen ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
          }`}
          title="Outline"
        >
          <ListTree className="w-4 h-4" />
          <span className="text-[10px] font-medium">Outline</span>
        </button>

        {/* Floating Center Action Button */}
        {isDirty ? (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center -mt-3 shadow-lg active:scale-90 transition-transform font-bold"
            title="Save to Drive"
          >
            {isSaving ? (
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-[10px] font-bold tracking-tight">SAVE</span>
            )}
          </button>
        ) : (
          <button
            onClick={onCreateNote}
            className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center -mt-3 shadow-lg active:scale-90 transition-transform"
            title="New Note"
          >
            <Plus className="w-4.5 h-4.5" />
          </button>
        )}

        <button
          onClick={onOpenDiff}
          className={`flex flex-col items-center gap-0.5 p-1 active:scale-95 transition-all ${
            isDirty ? "text-amber-500 font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
          title="View Diff"
        >
          <span className="text-[10px] font-mono font-bold leading-none mt-0.5">
            {diffSummary || "±0"}
          </span>
          <span className="text-[10px] font-medium">Diff</span>
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex flex-col items-center gap-0.5 p-1 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          title="Theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-foreground/80" />}
          <span className="text-[10px] font-medium">Theme</span>
        </button>
      </div>
    </div>
  );
}
