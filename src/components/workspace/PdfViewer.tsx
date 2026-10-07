"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  FileText,
  Download,
  ExternalLink,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Check,
  Sparkles,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { MacFileLoader } from "~/components/ui/MacFileLoader";
import {
  getPdfHighlights,
  addPdfHighlight,
  deletePdfHighlight,
  updatePdfHighlightColor,
  type PdfHighlight,
  type PdfHighlightColor,
  PDF_HIGHLIGHTS_UPDATED_EVENT,
} from "~/lib/pdfHighlightStorage";
import type { HeadingItem } from "./OutlineSidebar";

// Configure worker
if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

export interface PdfViewerProps {
  fileId: string;
  fileName: string;
  onOutlineExtracted?: (headings: HeadingItem[]) => void;
  onHighlightsChanged?: (highlights: PdfHighlight[]) => void;
}

const COLOR_PALETTE: Array<{
  color: PdfHighlightColor;
  label: string;
  bgClass: string;
  dotClass: string;
  hex: string;
}> = [
  {
    color: "yellow",
    label: "Yellow",
    bgClass: "bg-amber-300/40 dark:bg-amber-400/35 border-b border-amber-400/60",
    dotClass: "bg-amber-400",
    hex: "#facc15",
  },
  {
    color: "green",
    label: "Green",
    bgClass: "bg-emerald-300/40 dark:bg-emerald-400/35 border-b border-emerald-400/60",
    dotClass: "bg-emerald-400",
    hex: "#4ade80",
  },
  {
    color: "blue",
    label: "Blue",
    bgClass: "bg-sky-300/40 dark:bg-sky-400/35 border-b border-sky-400/60",
    dotClass: "bg-sky-400",
    hex: "#38bdf8",
  },
  {
    color: "pink",
    label: "Pink",
    bgClass: "bg-pink-300/40 dark:bg-pink-400/35 border-b border-pink-400/60",
    dotClass: "bg-pink-400",
    hex: "#f472b6",
  },
  {
    color: "purple",
    label: "Purple",
    bgClass: "bg-purple-300/40 dark:bg-purple-400/35 border-b border-purple-400/60",
    dotClass: "bg-purple-400",
    hex: "#c084fc",
  },
  {
    color: "orange",
    label: "Orange",
    bgClass: "bg-orange-300/40 dark:bg-orange-400/35 border-b border-orange-400/60",
    dotClass: "bg-orange-400",
    hex: "#fb923c",
  },
];

interface FloatingMenuState {
  visible: boolean;
  x: number;
  y: number;
  pageNumber: number;
  text: string;
  rects: Array<{ top: number; left: number; width: number; height: number }>;
}

interface HighlightActionMenuState {
  visible: boolean;
  x: number;
  y: number;
  highlight: PdfHighlight;
}

export function PdfViewer({
  fileId,
  fileName,
  onOutlineExtracted,
  onHighlightsChanged,
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [basePageWidth, setBasePageWidth] = useState<number>(612);
  const [basePageHeight, setBasePageHeight] = useState<number>(792);

  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState | null>(
    null,
  );
  const [actionMenu, setActionMenu] =
    useState<HighlightActionMenuState | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Load saved highlights
  useEffect(() => {
    const loaded = getPdfHighlights(fileId);
    setHighlights(loaded);
    onHighlightsChanged?.(loaded);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileId: string }>;
      if (customEvent.detail?.fileId === fileId) {
        const fresh = getPdfHighlights(fileId);
        setHighlights(fresh);
        onHighlightsChanged?.(fresh);
      }
    };

    window.addEventListener(PDF_HIGHLIGHTS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PDF_HIGHLIGHTS_UPDATED_EVENT, handleUpdate);
    };
  }, [fileId, onHighlightsChanged]);

  // Jump to specific page / highlight via custom window events (fired by OutlineSidebar)
  useEffect(() => {
    const handleJumpToPage = (e: Event) => {
      const customEvent = e as CustomEvent<{
        fileId?: string;
        pageNumber: number;
      }>;
      if (
        !customEvent.detail?.fileId ||
        customEvent.detail.fileId === fileId
      ) {
        const pageEl = pageRefs.current.get(customEvent.detail.pageNumber);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
          setCurrentPage(customEvent.detail.pageNumber);
        }
      }
    };

    const handleJumpToHighlight = (e: Event) => {
      const customEvent = e as CustomEvent<{
        fileId?: string;
        highlightId: string;
      }>;
      if (
        !customEvent.detail?.fileId ||
        customEvent.detail.fileId === fileId
      ) {
        const target = highlights.find(
          (h) => h.id === customEvent.detail.highlightId,
        );
        if (target) {
          const pageEl = pageRefs.current.get(target.pageNumber);
          if (pageEl) {
            pageEl.scrollIntoView({ behavior: "smooth", block: "center" });
            setCurrentPage(target.pageNumber);

            // Add pulsing animation to target highlight elements
            const hlEls = document.querySelectorAll(
              `[data-highlight-id="${target.id}"]`,
            );
            hlEls.forEach((el) => {
              el.classList.add(
                "ring-4",
                "ring-primary",
                "ring-offset-2",
                "animate-pulse",
              );
              setTimeout(() => {
                el.classList.remove(
                  "ring-4",
                  "ring-primary",
                  "ring-offset-2",
                  "animate-pulse",
                );
              }, 2500);
            });
          }
        }
      }
    };

    window.addEventListener("netherite-jump-to-pdf-page", handleJumpToPage);
    window.addEventListener(
      "netherite-jump-to-pdf-highlight",
      handleJumpToHighlight,
    );
    return () => {
      window.removeEventListener(
        "netherite-jump-to-pdf-page",
        handleJumpToPage,
      );
      window.removeEventListener(
        "netherite-jump-to-pdf-highlight",
        handleJumpToHighlight,
      );
    };
  }, [fileId, highlights]);

  // Load PDF Document
  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);

      const url = `/api/notes/pdf?id=${encodeURIComponent(fileId)}`;
      const loadingTask = pdfjsLib.getDocument({
        url,
        rangeChunkSize: 65536,
        disableAutoFetch: false,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Fetch dimensions of Page 1 to estimate layout
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      setBasePageWidth(viewport.width);
      setBasePageHeight(viewport.height);

      // Extract outline / bookmarks
      try {
        const rawOutline = await doc.getOutline();
        if (rawOutline && rawOutline.length > 0) {
          const parsedHeadings: HeadingItem[] = [];

          const parseNodes = async (nodes: any[], depth = 1) => {
            for (let i = 0; i < nodes.length; i++) {
              const node = nodes[i];
              let targetPageNumber = 1;

              if (typeof node.dest === "string") {
                const destArray = await doc.getDestination(node.dest);
                if (destArray && destArray[0]) {
                  const idx = await doc.getPageIndex(destArray[0]);
                  targetPageNumber = idx + 1;
                }
              } else if (Array.isArray(node.dest) && node.dest[0]) {
                const idx = await doc.getPageIndex(node.dest[0]);
                targetPageNumber = idx + 1;
              }

              parsedHeadings.push({
                id: `page-${targetPageNumber}`,
                text: node.title,
                level: Math.min(depth, 3),
              });

              if (node.items && node.items.length > 0) {
                await parseNodes(node.items, depth + 1);
              }
            }
          };

          await parseNodes(rawOutline);
          if (parsedHeadings.length > 0) {
            onOutlineExtracted?.(parsedHeadings);
          } else {
            // Fallback outline if empty
            const fallback: HeadingItem[] = Array.from(
              { length: Math.min(doc.numPages, 30) },
              (_, i) => ({
                id: `page-${i + 1}`,
                text: `Page ${i + 1}`,
                level: 1,
              }),
            );
            onOutlineExtracted?.(fallback);
          }
        } else {
          // Provide page bookmarks as topics
          const fallback: HeadingItem[] = Array.from(
            { length: Math.min(doc.numPages, 30) },
            (_, i) => ({
              id: `page-${i + 1}`,
              text: `Page ${i + 1}`,
              level: 1,
            }),
          );
          onOutlineExtracted?.(fallback);
        }
      } catch (e) {
        console.warn("Could not extract PDF outline:", e);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setLoadingError(err?.message || "Failed to parse PDF document");
      setIsLoading(false);
    }
  }, [fileId, onOutlineExtracted]);

  useEffect(() => {
    void loadDocument();
    return () => {
      setPdfDoc(null);
    };
  }, [loadDocument]);

  // Track currently active page via IntersectionObserver
  useEffect(() => {
    if (!scrollContainerRef.current || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pNum = Number(entry.target.getAttribute("data-page-number"));
            if (pNum) setCurrentPage(pNum);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.3,
      },
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages, scale]);

  // Auto-fit to width on initial load
  const handleFitWidth = useCallback(() => {
    if (!scrollContainerRef.current || basePageWidth === 0) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const padding = 48; // Left & right gutter
    const idealScale = Math.max(0.4, (containerWidth - padding) / basePageWidth);
    setScale(Math.round(idealScale * 100) / 100);
  }, [basePageWidth]);

  // Handle Text Selection for Highlighting
  const handleSelectionEnd = useCallback(() => {
    // Small delay to allow selection coordinates to resolve
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const text = selection.toString().trim();
      if (!text || text.length === 0) {
        return;
      }

      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;
      const textLayerEl = (
        startContainer instanceof Element
          ? startContainer
          : startContainer.parentElement
      )?.closest(".pdf-page-container");

      if (!textLayerEl) return;

      const pageNumber = Number(textLayerEl.getAttribute("data-page-number"));
      if (!pageNumber) return;

      const pageRect = textLayerEl.getBoundingClientRect();
      const clientRects = Array.from(range.getClientRects());
      if (clientRects.length === 0) return;

      // Convert client rects to page-relative percentages
      const relativeRects = clientRects.map((rect) => ({
        top: ((rect.top - pageRect.top) / pageRect.height) * 100,
        left: ((rect.left - pageRect.left) / pageRect.width) * 100,
        width: (rect.width / pageRect.width) * 100,
        height: (rect.height / pageRect.height) * 100,
      }));

      // Calculate placement for the floating highlight palette
      const firstRect = clientRects[0]!;
      const lastRect = clientRects[clientRects.length - 1]!;
      const menuX = Math.min(
        window.innerWidth - 220,
        Math.max(20, (firstRect.left + lastRect.right) / 2 - 100),
      );
      const menuY = Math.max(10, firstRect.top - 46);

      setFloatingMenu({
        visible: true,
        x: menuX,
        y: menuY,
        pageNumber,
        text,
        rects: relativeRects,
      });
      setActionMenu(null);
    }, 40);
  }, []);

  const handleApplyHighlight = (color: PdfHighlightColor) => {
    if (!floatingMenu) return;

    addPdfHighlight(fileId, {
      pageNumber: floatingMenu.pageNumber,
      text: floatingMenu.text,
      color,
      rects: floatingMenu.rects,
    });

    // Clear selection
    window.getSelection()?.removeAllRanges();
    setFloatingMenu(null);
  };

  const handleCopySelectedText = () => {
    if (!floatingMenu?.text) return;
    navigator.clipboard.writeText(floatingMenu.text);
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
      setFloatingMenu(null);
      window.getSelection()?.removeAllRanges();
    }, 800);
  };

  const handleOpenHighlightAction = (
    e: React.MouseEvent,
    highlight: PdfHighlight,
  ) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setActionMenu({
      visible: true,
      x: Math.min(window.innerWidth - 200, rect.left),
      y: Math.max(10, rect.top - 46),
      highlight,
    });
    setFloatingMenu(null);
  };

  const handleChangeHighlightColor = (
    highlight: PdfHighlight,
    color: PdfHighlightColor,
  ) => {
    updatePdfHighlightColor(fileId, highlight.id, color);
    setActionMenu(null);
  };

  const handleDeleteHighlight = (highlightId: string) => {
    deletePdfHighlight(fileId, highlightId);
    setActionMenu(null);
  };

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = `/api/notes/pdf?id=${encodeURIComponent(fileId)}&download=1`;
    a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [fileId, fileName]);

  const handleOpenExternal = useCallback(() => {
    window.open(
      `/api/notes/pdf?id=${encodeURIComponent(fileId)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [fileId]);

  return (
    <div
      className="relative flex h-full w-full flex-col bg-muted/15 select-none overflow-hidden"
      onClick={() => {
        if (floatingMenu) setFloatingMenu(null);
        if (actionMenu) setActionMenu(null);
      }}
    >
      {/* Top Cupertino Toolbar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3.5 bg-background/90 backdrop-blur-md z-10 select-none">
        {/* Left: Document info */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center rounded-md bg-rose-500/10 p-1 text-rose-500 dark:text-rose-400">
            <FileText className="h-4 w-4 shrink-0" />
          </div>
          <span
            className="text-xs sm:text-sm font-medium truncate text-foreground max-w-[140px] sm:max-w-xs"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hidden sm:inline-block">
            PDF
          </span>
          {highlights.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {highlights.length} {highlights.length === 1 ? "note" : "notes"}
            </span>
          )}
        </div>

        {/* Center: Page controls */}
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => {
              const prev = Math.max(1, currentPage - 1);
              const el = pageRefs.current.get(prev);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-muted-foreground px-1 text-[11px] whitespace-nowrap">
            <strong className="text-foreground">{currentPage}</strong> /{" "}
            {numPages || "–"}
          </span>
          <button
            onClick={() => {
              const next = Math.min(numPages, currentPage + 1);
              const el = pageRefs.current.get(next);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Zoom & Export actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.4, s - 0.15))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-medium px-1 text-muted-foreground min-w-[3rem] text-center hidden sm:inline-block">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3.0, s + 0.15))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitWidth}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Fit to Width"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <div className="w-[1px] h-4 bg-border/60 mx-1 hidden sm:block" />
          <button
            onClick={() => void loadDocument()}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Reload PDF"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
            title="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={scrollContainerRef}
        onMouseUp={handleSelectionEnd}
        onTouchEnd={handleSelectionEnd}
        className="relative flex-1 w-full h-full overflow-y-auto overflow-x-auto p-4 sm:p-6"
      >
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-xs flex items-center justify-center">
            <MacFileLoader
              fileName={fileName}
              fileType="pdf"
              message="Rendering PDF with interactive highlights…"
            />
          </div>
        )}

        {loadingError && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Unable to parse PDF
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {loadingError}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => void loadDocument()}
                className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleOpenExternal}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Open in Browser
              </button>
            </div>
          </div>
        )}

        {pdfDoc && numPages > 0 && (
          <div className="flex flex-col items-center gap-6 pb-20">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <VirtualPdfPage
                key={`page-${pageNum}-${scale}`}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                defaultWidth={basePageWidth}
                defaultHeight={basePageHeight}
                highlights={highlights.filter((h) => h.pageNumber === pageNum)}
                onHighlightClick={handleOpenHighlightAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Highlight Creation Palette */}
      {floatingMenu?.visible && (
        <div
          style={{ top: `${floatingMenu.y}px`, left: `${floatingMenu.x}px` }}
          className="fixed z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-card/95 border border-border/80 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {COLOR_PALETTE.map((item) => (
            <button
              key={item.color}
              onClick={() => handleApplyHighlight(item.color)}
              className="group relative flex h-7 w-7 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform"
              title={`Highlight ${item.label}`}
            >
              <span
                style={{ backgroundColor: item.hex }}
                className="h-5 w-5 rounded-full shadow-2xs border border-black/10 dark:border-white/20"
              />
            </button>
          ))}
          <div className="w-[1px] h-4 bg-border/60 mx-0.5" />
          <button
            onClick={handleCopySelectedText}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Text"
          >
            {copiedNotification ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {/* Highlight Action Popover (Edit / Delete) */}
      {actionMenu?.visible && (
        <div
          style={{ top: `${actionMenu.y}px`, left: `${actionMenu.x}px` }}
          className="fixed z-50 flex items-center gap-1.5 p-1.5 rounded-full bg-card/95 border border-border/80 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {COLOR_PALETTE.map((item) => (
            <button
              key={item.color}
              onClick={() =>
                handleChangeHighlightColor(actionMenu.highlight, item.color)
              }
              className={`group relative flex h-7 w-7 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform ${
                actionMenu.highlight.color === item.color
                  ? "ring-2 ring-primary ring-offset-1"
                  : ""
              }`}
              title={`Change to ${item.label}`}
            >
              <span
                style={{ backgroundColor: item.hex }}
                className="h-5 w-5 rounded-full shadow-2xs border border-black/10 dark:border-white/20"
              />
            </button>
          ))}
          <div className="w-[1px] h-4 bg-border/60 mx-0.5" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(actionMenu.highlight.text);
              setActionMenu(null);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Highlighted Text"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDeleteHighlight(actionMenu.highlight.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/15 text-destructive transition-colors"
            title="Delete Highlight"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Virtualized Single Page Renderer
// -------------------------------------------------------------

interface VirtualPdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  defaultWidth: number;
  defaultHeight: number;
  highlights: PdfHighlight[];
  onHighlightClick: (e: React.MouseEvent, h: PdfHighlight) => void;
}

const VirtualPdfPage = React.forwardRef<HTMLDivElement, VirtualPdfPageProps>(
  function VirtualPdfPage(
    {
      pdfDoc,
      pageNumber,
      scale,
      defaultWidth,
      defaultHeight,
      highlights,
      onHighlightClick,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const textLayerRef = useRef<HTMLDivElement | null>(null);

    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [pageWidth, setPageWidth] = useState<number>(defaultWidth * scale);
    const [pageHeight, setPageHeight] = useState<number>(defaultHeight * scale);
    const [isRendered, setIsRendered] = useState<boolean>(false);

    // Merge internal and external refs
    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as any).current = node;
      },
      [ref],
    );

    // IntersectionObserver to only render visible pages
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) {
            setIsVisible(entry.isIntersecting);
          }
        },
        { rootMargin: "450px 0px" }, // Buffer 450px ahead of scroll
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Render page canvas and text layer when visible
    useEffect(() => {
      let isCancelled = false;
      let renderTask: any = null;

      if (!isVisible) {
        setIsRendered(false);
        return;
      }

      const renderPage = async () => {
        try {
          const page = await pdfDoc.getPage(pageNumber);
          if (isCancelled) return;

          const viewport = page.getViewport({ scale });
          setPageWidth(viewport.width);
          setPageHeight(viewport.height);

          const canvas = canvasRef.current;
          if (!canvas) return;

          const context = canvas.getContext("2d");
          if (!context) return;

          // HiDPI / Retina pixel ratio scaling
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

          renderTask = page.render({
            canvasContext: context,
            viewport,
          });

          await renderTask.promise;
          if (isCancelled) return;

          // Render interactive TextLayer for selection
          const textLayerContainer = textLayerRef.current;
          if (textLayerContainer) {
            textLayerContainer.innerHTML = "";
            textLayerContainer.style.width = `${Math.floor(viewport.width)}px`;
            textLayerContainer.style.height = `${Math.floor(viewport.height)}px`;
            (textLayerContainer.style as any).setProperty(
              "--scale-factor",
              String(viewport.scale),
            );

            const textContent = await page.getTextContent();
            if (isCancelled) return;

            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerContainer,
              viewport,
            });

            await textLayer.render();
          }

          setIsRendered(true);
        } catch (err: any) {
          if (err?.name !== "RenderingCancelledException") {
            console.error(`Page ${pageNumber} render error:`, err);
          }
        }
      };

      void renderPage();

      return () => {
        isCancelled = true;
        if (renderTask) {
          try {
            renderTask.cancel();
          } catch {}
        }
      };
    }, [pdfDoc, pageNumber, scale, isVisible]);

    const colorClasses: Record<PdfHighlightColor, string> = {
      yellow: "bg-amber-300/40 dark:bg-amber-400/35 border-b border-amber-400/60",
      green: "bg-emerald-300/40 dark:bg-emerald-400/35 border-b border-emerald-400/60",
      blue: "bg-sky-300/40 dark:bg-sky-400/35 border-b border-sky-400/60",
      pink: "bg-pink-300/40 dark:bg-pink-400/35 border-b border-pink-400/60",
      purple: "bg-purple-300/40 dark:bg-purple-400/35 border-b border-purple-400/60",
      orange: "bg-orange-300/40 dark:bg-orange-400/35 border-b border-orange-400/60",
    };

    return (
      <div
        ref={setRefs}
        data-page-number={pageNumber}
        style={{
          width: `${Math.floor(pageWidth)}px`,
          minHeight: `${Math.floor(pageHeight)}px`,
        }}
        className="pdf-page-container relative shadow-md bg-white dark:bg-zinc-950 border border-border/40 rounded-sm select-none transition-shadow"
      >
        {isVisible ? (
          <>
            <canvas ref={canvasRef} className="block select-none" />

            {/* Interactive Text Layer for text selection */}
            <div ref={textLayerRef} className="pdf-text-layer" />

            {/* Rendered Highlights Overlay */}
            <div className="absolute inset-0 pointer-events-none z-1">
              {highlights.map((highlight) =>
                highlight.rects.map((r, rectIndex) => (
                  <div
                    key={`${highlight.id}-${rectIndex}`}
                    data-highlight-id={highlight.id}
                    onClick={(e) => onHighlightClick(e, highlight)}
                    style={{
                      top: `${r.top}%`,
                      left: `${r.left}%`,
                      width: `${r.width}%`,
                      height: `${r.height}%`,
                    }}
                    className={`pdf-highlight-mark absolute pointer-events-auto cursor-pointer rounded-[2px] transition-all hover:brightness-95 hover:shadow-2xs ${
                      colorClasses[highlight.color] || colorClasses.yellow
                    }`}
                    title={highlight.text}
                  />
                )),
              )}
            </div>
          </>
        ) : (
          /* Lightweight virtual placeholder to keep scroll position intact */
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground/40 font-mono">
            Page {pageNumber}
          </div>
        )}
      </div>
    );
  },
);
