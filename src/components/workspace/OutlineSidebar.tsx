"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { ListTree, X, AlignLeft, Highlighter, Sparkles, Hash, Search, Trash2, Palette } from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export interface HighlightItem {
  id: string;
  text: string;
  color: "yellow" | "green" | "blue" | "pink" | "purple" | "orange" | "other";
  sectionTitle?: string;
  pageNumber?: number;
  sectionLevel?: number;
}

interface OutlineSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  headings: HeadingItem[];
  highlights?: HighlightItem[];
  activeHeadingId?: string;
  onSelectHeading: (text: string, level: number, id?: string) => void;
  onSelectHighlight?: (text: string, id: string) => void;
  onDeleteHighlight?: (id: string, text: string) => void;
  onUpdateHighlightColor?: (id: string, color: HighlightItem["color"]) => void;
}

const COLOR_MAP: Record<
  HighlightItem["color"],
  { dot: string; bg: string; border: string; label: string }
> = {
  yellow: {
    dot: "bg-amber-400 dark:bg-amber-500",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-400/50 dark:border-amber-500/50",
    label: "Yellow",
  },
  green: {
    dot: "bg-emerald-400 dark:bg-emerald-500",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-400/50 dark:border-emerald-500/50",
    label: "Green",
  },
  blue: {
    dot: "bg-sky-400 dark:bg-sky-500",
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    border: "border-sky-400/50 dark:border-sky-500/50",
    label: "Blue",
  },
  pink: {
    dot: "bg-pink-400 dark:bg-pink-500",
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    border: "border-pink-400/50 dark:border-pink-500/50",
    label: "Pink",
  },
  purple: {
    dot: "bg-purple-400 dark:bg-purple-500",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    border: "border-purple-400/50 dark:border-purple-500/50",
    label: "Purple",
  },
  orange: {
    dot: "bg-orange-400 dark:bg-orange-500",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    border: "border-orange-400/50 dark:border-orange-500/50",
    label: "Orange",
  },
  other: {
    dot: "bg-zinc-400 dark:bg-zinc-500",
    bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
    border: "border-zinc-400/50 dark:border-zinc-500/50",
    label: "Highlight",
  },
};

function HighlightCard({
  item,
  editingHighlightId,
  setEditingHighlightId,
  onSelectHighlight,
  onDeleteHighlight,
  onUpdateHighlightColor,
  onClose,
}: {
  item: HighlightItem;
  editingHighlightId: string | null;
  setEditingHighlightId: (id: string | null) => void;
  onSelectHighlight?: (text: string, id: string) => void;
  onDeleteHighlight?: (id: string, text: string) => void;
  onUpdateHighlightColor?: (id: string, color: HighlightItem["color"]) => void;
  onClose: () => void;
}) {
  const style = COLOR_MAP[item.color] || COLOR_MAP.other;

  return (
    <div
      className={`relative group/item rounded-lg border border-border/40 hover:border-border transition-all hover:shadow-2xs ${style.bg}`}
    >
      <button
        onClick={() => {
          onSelectHighlight?.(item.text, item.id);
          if (typeof window !== "undefined" && window.innerWidth < 640) {
            onClose();
          }
        }}
        className="w-full text-left p-2 pr-7 flex flex-col gap-1 cursor-pointer"
        title={`Jump to: "${item.text}"`}
      >
        <div className="flex items-start gap-1.5">
          <span className={`w-2 h-2 rounded-full ${style.dot} shrink-0 mt-1`} />
          <span className="font-normal text-foreground line-clamp-3 leading-relaxed text-[11.5px]">
            {item.text}
          </span>
        </div>

        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pl-3.5 truncate opacity-80 group-hover/item:opacity-100">
          {item.pageNumber ? (
            <span className="font-mono text-[9.5px] px-1 py-0.2 rounded bg-background/60 border border-border/30">
              Page {item.pageNumber}
            </span>
          ) : item.sectionTitle ? (
            <span className="truncate flex items-center gap-1">
              <Hash className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{item.sectionTitle}</span>
            </span>
          ) : null}
        </div>
      </button>

      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150">
        {onUpdateHighlightColor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingHighlightId(
                editingHighlightId === item.id ? null : item.id,
              );
            }}
            className="p-1 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Change Color"
            aria-label="Change Color"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        )}
        {onDeleteHighlight && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteHighlight(item.id, item.text);
            }}
            className="p-1 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Remove Highlight"
            aria-label="Remove Highlight"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Inline Color Selection Palette when Editing */}
      {editingHighlightId === item.id && onUpdateHighlightColor && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 px-2 py-1.5 border-t border-border/40 bg-background/95 rounded-b-lg backdrop-blur-sm"
        >
          <span className="text-[10px] text-muted-foreground font-medium mr-1">
            Color:
          </span>
          {(
            ["yellow", "green", "blue", "pink", "purple", "orange"] as const
          ).map((c) => {
            const cStyle = COLOR_MAP[c];
            const isCurrent = item.color === c;
            return (
              <button
                key={c}
                onClick={() => {
                  onUpdateHighlightColor(item.id, c);
                  setEditingHighlightId(null);
                }}
                className={`w-4 h-4 rounded-full ${cStyle.dot} transition-transform hover:scale-125 ${
                  isCurrent ? "ring-2 ring-foreground ring-offset-1" : ""
                }`}
                title={cStyle.label}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OutlineSidebar({
  isOpen,
  onClose,
  headings = [],
  highlights = [],
  activeHeadingId,
  onSelectHeading,
  onSelectHighlight,
  onDeleteHighlight,
  onUpdateHighlightColor,
}: OutlineSidebarProps) {
  const { modernUi } = useTheme();
  const [activeTab, setActiveTab] = useState<"topics" | "highlights">("topics");
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>("all");
  const [highlightSortMode, setHighlightSortMode] = useState<"section" | "order" | "color">("section");
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>("");
  const [editingHighlightId, setEditingHighlightId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Deeply sanitize headings to guarantee pure primitive objects
  const safeHeadings = useMemo<HeadingItem[]>(() => {
    if (!headings || !Array.isArray(headings)) return [];
    return headings
      .filter((h): h is HeadingItem => Boolean(h && typeof h === "object"))
      .map((h, i) => {
        const rawText = h.text !== undefined && h.text !== null ? String(h.text) : "";
        const id = h.id ? String(h.id) : `heading-${i}`;
        const level = typeof h.level === "number" && !isNaN(h.level) ? Math.min(Math.max(1, h.level), 6) : 1;
        return {
          id,
          text: rawText,
          level,
        };
      })
      .filter((h) => h.text.trim().length > 0);
  }, [headings]);

  // Deeply sanitize highlights to guarantee pure primitive objects
  const safeHighlights = useMemo<HighlightItem[]>(() => {
    if (!highlights || !Array.isArray(highlights)) return [];
    return highlights
      .filter((hl): hl is HighlightItem => Boolean(hl && typeof hl === "object"))
      .map((hl, i) => {
        const id = hl.id ? String(hl.id) : `hl-${i}`;
        const text = hl.text !== undefined && hl.text !== null ? String(hl.text) : "";
        const color = (hl.color && COLOR_MAP[hl.color] ? hl.color : "yellow") as HighlightItem["color"];
        const sectionTitle = hl.sectionTitle ? String(hl.sectionTitle) : undefined;
        const pageNumber = typeof hl.pageNumber === "number" ? hl.pageNumber : undefined;
        const sectionLevel = typeof hl.sectionLevel === "number" ? hl.sectionLevel : undefined;
        return {
          id,
          text,
          color,
          sectionTitle,
          pageNumber,
          sectionLevel,
        };
      })
      .filter((hl) => hl.text.trim().length > 0);
  }, [highlights]);

  // Auto-scroll the topics list so the currently active heading stays visible
  useEffect(() => {
    if (activeTab !== "topics" || !activeHeadingId) return;
    try {
      const activeEl = itemRefs.current.get(activeHeadingId);
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    } catch {
      // Safe scroll fallback
    }
  }, [activeHeadingId, activeTab]);

  if (!isOpen) return null;

  // Filtered headings by search query
  const filteredHeadings = useMemo(() => {
    if (!topicSearchQuery.trim()) return safeHeadings;
    const q = topicSearchQuery.trim().toLowerCase();
    return safeHeadings.filter((h) => h.text.toLowerCase().includes(q));
  }, [safeHeadings, topicSearchQuery]);

  // Filtered highlights by color
  const filteredHighlights = useMemo(() => {
    if (selectedColorFilter === "all") return safeHighlights;
    return safeHighlights.filter((h) => h.color === selectedColorFilter);
  }, [safeHighlights, selectedColorFilter]);

  // Hierarchical grouping by Chapter / Section (#, ##)
  const groupedHighlightsBySection = useMemo(() => {
    const groups: {
      sectionKey: string;
      sectionName: string;
      sectionLevel: number;
      items: HighlightItem[];
    }[] = [];

    const map = new Map<string, (typeof groups)[0]>();

    for (const hl of filteredHighlights) {
      let key = hl.sectionTitle || "General";
      let name = key;
      let level = hl.sectionLevel || 1;

      // Extract markdown hashes if present (e.g. "# Chapter 1")
      const match = key.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        level = match[1].length;
        name = match[2];
      }

      if (!map.has(key)) {
        const groupObj = {
          sectionKey: key,
          sectionName: name,
          sectionLevel: level,
          items: [],
        };
        map.set(key, groupObj);
        groups.push(groupObj);
      }
      map.get(key)!.items.push(hl);
    }

    return groups;
  }, [filteredHighlights]);

  // Grouped by color
  const groupedHighlightsByColor = useMemo(() => {
    const groups: {
      color: HighlightItem["color"];
      items: HighlightItem[];
    }[] = [];
    const colorOrder: HighlightItem["color"][] = [
      "yellow",
      "green",
      "blue",
      "pink",
      "purple",
      "orange",
    ];
    for (const c of colorOrder) {
      const items = filteredHighlights.filter((h) => h.color === c);
      if (items.length > 0) {
        groups.push({ color: c, items });
      }
    }
    return groups;
  }, [filteredHighlights]);

  // Ordered by document page sequence
  const orderedHighlights = useMemo(() => {
    if (highlightSortMode === "order") {
      return [...filteredHighlights].sort((a, b) => {
        if (a.pageNumber !== undefined && b.pageNumber !== undefined) {
          return a.pageNumber - b.pageNumber;
        }
        return 0;
      });
    }
    return filteredHighlights;
  }, [filteredHighlights, highlightSortMode]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="sm:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
        onClick={onClose}
      />

      <aside className="fixed sm:relative inset-y-0 right-0 z-30 sm:z-20 w-80 sm:w-68 border-l border-border/40 bg-background/90 backdrop-blur-md flex flex-col h-full select-none shrink-0 shadow-2xl sm:shadow-none animate-in slide-in-from-right-full duration-150">
        {/* Top Header Bar */}
        <div
          className={`px-3 py-2.5 border-b border-border/40 flex items-center justify-between ${
            modernUi ? "bg-background/40" : ""
          }`}
        >
          <div className="flex items-center gap-1.5 p-0.5 bg-muted/60 dark:bg-muted/40 rounded-lg border border-border/40">
            <button
              onClick={() => setActiveTab("topics")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "topics"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Topics</span>
              {safeHeadings.length > 0 && (
                <span className="text-[10px] font-mono opacity-70 bg-accent/60 px-1 py-0.2 rounded-full">
                  {safeHeadings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("highlights")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                activeTab === "highlights"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-500" />
              <span>Highlights</span>
              {safeHighlights.length > 0 && (
                <span className="text-[10px] font-mono opacity-80 bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.2 rounded-full font-semibold">
                  {safeHighlights.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent/60 rounded-md text-muted-foreground hover:text-foreground transition-colors ml-2"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: Topics / Headings Tree */}
        {/* ======================================================== */}
        {activeTab === "topics" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {safeHeadings.length > 3 && (
              <div className="px-2.5 pt-2 pb-1.5 border-b border-border/30">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={topicSearchQuery}
                    onChange={(e) => setTopicSearchQuery(e.target.value)}
                    placeholder="Search topics & chapters…"
                    className="w-full bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/40 focus:border-primary/50 text-[11px] rounded-md pl-7 pr-7 py-1 text-foreground placeholder:text-muted-foreground transition-all outline-none"
                  />
                  {topicSearchQuery && (
                    <button
                      onClick={() => setTopicSearchQuery("")}
                      className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div
              className={`flex-1 overflow-y-auto px-2 py-2 text-xs space-y-0.5 ${
                modernUi ? "modern-toc-guide" : ""
              }`}
            >
              {filteredHeadings.length === 0 ? (
                <div className="px-3 py-10 text-center text-[11px] text-muted-foreground flex flex-col items-center gap-2">
                  <AlignLeft className="w-6 h-6 opacity-30" />
                  <span>
                    {topicSearchQuery
                      ? "No matching topics found"
                      : "No headings in document"}
                  </span>
                </div>
              ) : (
                filteredHeadings.map((h: HeadingItem, index: number) => {
                const isActive = h.id === activeHeadingId;
                const isMainTitle = h.level <= 2;

                const indentPadding =
                  h.level === 1
                    ? "pl-2.5"
                    : h.level === 2
                    ? "pl-4"
                    : h.level === 3
                    ? "pl-6"
                    : "pl-8";

                const activeClasses = isActive
                  ? "bg-primary/10 text-primary font-semibold shadow-xs border-l-2 border-primary dark:bg-primary/20"
                  : "text-foreground/80 hover:bg-accent/60 hover:text-foreground border-l-2 border-transparent";

                const levelWeightClass = isMainTitle
                  ? "font-medium"
                  : "text-muted-foreground font-normal text-[11.5px]";

                return (
                  <button
                    key={`${h.id}-${index}`}
                    ref={(el) => {
                      if (el) {
                        itemRefs.current.set(h.id, el);
                      } else {
                        itemRefs.current.delete(h.id);
                      }
                    }}
                    onClick={() => {
                      onSelectHeading(h.text, h.level, h.id);
                      if (
                        typeof window !== "undefined" &&
                        window.innerWidth < 640
                      ) {
                        onClose();
                      }
                    }}
                    className={`w-full group text-left py-1.5 pr-2 rounded-r-lg truncate transition-all duration-150 font-sans flex items-center justify-between gap-1.5 ${indentPadding} ${activeClasses} ${levelWeightClass}`}
                    title={`H${h.level}: ${h.text}`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                      <span className="truncate">{h.text}</span>
                    </span>
                    <span className="opacity-0 group-hover:opacity-60 text-[9px] font-mono text-muted-foreground shrink-0 uppercase">
                      H{h.level}
                    </span>
                  </button>
                );
              })
            )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: Highlights in Document */}
        {/* ======================================================== */}
        {activeTab === "highlights" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sort & Filter Controls Header */}
            {safeHighlights.length > 0 && (
              <div className="px-2.5 py-1.5 border-b border-border/40 flex flex-col gap-1.5 bg-muted/20 select-none shrink-0">
                {/* Sort Mode Selector */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                    Sort by
                  </span>
                  <div className="inline-flex rounded-md p-0.5 bg-muted/80 border border-border/40 text-[10px]">
                    <button
                      onClick={() => setHighlightSortMode("section")}
                      className={`px-2 py-0.5 rounded transition-all font-medium ${
                        highlightSortMode === "section"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Group by Chapter and Section (#, ##)"
                    >
                      # Section
                    </button>
                    <button
                      onClick={() => setHighlightSortMode("order")}
                      className={`px-2 py-0.5 rounded transition-all font-medium ${
                        highlightSortMode === "order"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Sort by Page Order in document"
                    >
                      Page Order
                    </button>
                    <button
                      onClick={() => setHighlightSortMode("color")}
                      className={`px-2 py-0.5 rounded transition-all font-medium ${
                        highlightSortMode === "color"
                          ? "bg-background text-foreground shadow-2xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title="Group by Highlight Color"
                    >
                      By Color
                    </button>
                  </div>
                </div>

                {/* Color Filter Chips Bar */}
                <div className="flex items-center gap-1 overflow-x-auto text-[11px] pt-0.5 scrollbar-none">
                  <button
                    onClick={() => setSelectedColorFilter("all")}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors shrink-0 ${
                      selectedColorFilter === "all"
                        ? "bg-foreground text-background font-semibold"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    }`}
                  >
                    All ({safeHighlights.length})
                  </button>

                  {(["yellow", "green", "blue", "pink", "purple", "orange"] as const).map(
                    (col) => {
                      const count = safeHighlights.filter((h) => h.color === col).length;
                      if (count === 0) return null;
                      const style = COLOR_MAP[col];

                      return (
                        <button
                          key={col}
                          onClick={() => setSelectedColorFilter(col)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] transition-all border shrink-0 ${
                            selectedColorFilter === col
                              ? `${style.bg} ${style.border} font-semibold text-foreground`
                              : "border-transparent text-muted-foreground hover:bg-accent/50"
                          }`}
                          title={`Filter by ${style.label}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                          <span>{count}</span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Highlights List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 text-xs">
              {safeHighlights.length === 0 ? (
                <div className="px-4 py-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-500/10 text-amber-500">
                    <Highlighter className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground text-xs">
                      No highlights yet
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal max-w-[200px]">
                      Select text in the note to highlight in yellow, green, blue, pink, or purple.
                    </p>
                  </div>
                </div>
              ) : filteredHighlights.length === 0 ? (
                <div className="px-3 py-8 text-center text-[11px] text-muted-foreground">
                  No highlights matching this color.
                </div>
              ) : highlightSortMode === "section" ? (
                /* Grouped by Section / Chapter (#, ##) */
                groupedHighlightsBySection.map((group) => (
                  <div key={group.sectionKey} className="space-y-1.5 pb-2">
                    <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-semibold text-foreground border-b border-border/30 select-none">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-primary text-[10px] shrink-0 font-bold">
                          {"#".repeat(Math.min(group.sectionLevel, 4))}
                        </span>
                        <span className="truncate" title={group.sectionName}>
                          {group.sectionName}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-full shrink-0 ml-1.5">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-1">
                      {group.items.map((item, idx) => (
                        <HighlightCard
                          key={`${item.id}-${idx}`}
                          item={item}
                          onSelectHighlight={onSelectHighlight}
                          onDeleteHighlight={onDeleteHighlight}
                          onUpdateHighlightColor={onUpdateHighlightColor}
                          editingHighlightId={editingHighlightId}
                          setEditingHighlightId={setEditingHighlightId}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : highlightSortMode === "color" ? (
                /* Grouped by Color */
                groupedHighlightsByColor.map((group) => (
                  <div key={group.color} className="space-y-1.5 pb-2">
                    <div className="pt-2 pb-1 px-1 flex items-center justify-between text-[11px] font-semibold text-foreground border-b border-border/30 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP[group.color].dot}`} />
                        <span>{COLOR_MAP[group.color].label}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-full shrink-0">
                        {group.items.length}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.map((item, idx) => (
                        <HighlightCard
                          key={`${item.id}-${idx}`}
                          item={item}
                          onSelectHighlight={onSelectHighlight}
                          onDeleteHighlight={onDeleteHighlight}
                          onUpdateHighlightColor={onUpdateHighlightColor}
                          editingHighlightId={editingHighlightId}
                          setEditingHighlightId={setEditingHighlightId}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Ordered by Page */
                orderedHighlights.map((item, idx) => (
                  <HighlightCard
                    key={`${item.id}-${idx}`}
                    item={item}
                    onSelectHighlight={onSelectHighlight}
                    onDeleteHighlight={onDeleteHighlight}
                    onUpdateHighlightColor={onUpdateHighlightColor}
                    editingHighlightId={editingHighlightId}
                    setEditingHighlightId={setEditingHighlightId}
                    onClose={onClose}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
