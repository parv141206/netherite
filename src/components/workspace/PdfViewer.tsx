"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
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
  Moon,
  Sun,
  Save,
  CheckCircle2,
  Undo2,
  Search,
  CaseSensitive,
  ChevronUp,
  ChevronDown,
  X,
  Loader2,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { MacFileLoader } from "~/components/ui/MacFileLoader";
import { useTheme } from "~/components/ThemeProvider";
import { api } from "~/trpc/react";
import {
  getPdfHighlights,
  savePdfHighlights,
  addPdfHighlight,
  deletePdfHighlight,
  updatePdfHighlightColor,
  getPdfLastPage,
  savePdfLastPage,
  mergePdfHighlights,
  type PdfHighlight,
  type PdfHighlightColor,
  PDF_HIGHLIGHTS_UPDATED_EVENT,
} from "~/lib/pdfHighlightStorage";
import { getCachedPdf, setCachedPdf } from "~/lib/pdfCache";
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

const EMPTY_HIGHLIGHTS: PdfHighlight[] = [];

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

interface SearchMatch {
  pageNumber: number;
  matchIndex: number;
  matchIndexOnPage: number;
}

export function PdfViewer({
  fileId,
  fileName,
  onOutlineExtracted,
  onHighlightsChanged,
}: PdfViewerProps) {
  const { theme } = useTheme();
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.15);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{
    loaded: number;
    total: number;
    percent: number;
  } | null>(null);
  const [basePageWidth, setBasePageWidth] = useState<number>(612);
  const [basePageHeight, setBasePageHeight] = useState<number>(792);

  // Search in PDF state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const pageTextCacheRef = useRef<Map<number, string>>(new Map());

  const activeSearchMatch = useMemo(() => {
    if (matches.length === 0 || currentMatchIdx < 0 || currentMatchIdx >= matches.length) {
      return null;
    }
    return matches[currentMatchIdx] || null;
  }, [matches, currentMatchIdx]);

  // Night Mode state with persistence
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_pdf_night_mode");
      if (saved !== null) return saved === "true";
    }
    return theme === "dark";
  });

  const toggleNightMode = useCallback(() => {
    setIsNightMode((prev) => {
      const next = !prev;
      localStorage.setItem("netherite_pdf_night_mode", String(next));
      return next;
    });
  }, []);

  const [highlights, setHighlights] = useState<PdfHighlight[]>([]);
  const [floatingMenu, setFloatingMenu] = useState<FloatingMenuState | null>(
    null,
  );
  const [actionMenu, setActionMenu] =
    useState<HighlightActionMenuState | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [resumeNotification, setResumeNotification] = useState<string | null>(null);
  const [jumpInput, setJumpInput] = useState<string>(String(currentPage));

  useEffect(() => {
    setJumpInput(String(currentPage));
  }, [currentPage]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(jumpInput, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      const el = pageRefs.current.get(p);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(p);
    } else {
      setJumpInput(String(currentPage));
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Stable references for parent callbacks to prevent infinite re-render loops
  const onOutlineExtractedRef = useRef(onOutlineExtracted);
  useEffect(() => {
    onOutlineExtractedRef.current = onOutlineExtracted;
  }, [onOutlineExtracted]);

  const onHighlightsChangedRef = useRef(onHighlightsChanged);
  useEffect(() => {
    onHighlightsChangedRef.current = onHighlightsChanged;
  }, [onHighlightsChanged]);

  // Cloud annotations TRPC mutation & query
  const saveAnnotationsMutation = api.notes.savePdfAnnotations.useMutation();
  const { data: driveAnnotations } = api.notes.getPdfAnnotations.useQuery(
    { fileId },
    {
      enabled: !!fileId && !fileId.startsWith("temp-"),
      staleTime: 60000,
    },
  );

  // Load initial local highlights
  useEffect(() => {
    const loaded = getPdfHighlights(fileId);
    setHighlights(loaded);
    onHighlightsChangedRef.current?.(loaded);

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileId: string }>;
      if (customEvent.detail?.fileId === fileId) {
        const fresh = getPdfHighlights(fileId);
        setHighlights(fresh);
        onHighlightsChangedRef.current?.(fresh);
      }
    };

    window.addEventListener(PDF_HIGHLIGHTS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PDF_HIGHLIGHTS_UPDATED_EVENT, handleUpdate);
    };
  }, [fileId]);

  // Merge remote Drive annotations when retrieved
  useEffect(() => {
    if (driveAnnotations?.highlights && driveAnnotations.highlights.length > 0) {
      setHighlights((prev) => {
        const merged = mergePdfHighlights(prev, driveAnnotations.highlights);
        savePdfHighlights(fileId, merged);
        onHighlightsChangedRef.current?.(merged);
        return merged;
      });
    }
  }, [driveAnnotations, fileId]);

  // Save annotations to Google Drive (manual or debounced)
  const triggerSaveToDrive = useCallback(
    (pageToSave = currentPage) => {
      if (!fileId || fileId.startsWith("temp-")) return;
      setSaveStatus("saving");
      saveAnnotationsMutation.mutate(
        {
          fileId,
          highlights,
          lastPage: pageToSave,
        },
        {
          onSuccess: () => {
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2500);
          },
          onError: () => {
            setSaveStatus("idle");
          },
        },
      );
    },
    [fileId, highlights, currentPage, saveAnnotationsMutation],
  );

  // History stack for undoing highlight creations
  const highlightHistoryRef = useRef<string[]>([]);

  // Track & persist last page viewed
  useEffect(() => {
    if (currentPage > 0) {
      savePdfLastPage(fileId, currentPage);
    }
  }, [fileId, currentPage]);

  // Undo highlight function
  const handleUndoHighlight = useCallback(() => {
    const lastCreatedId = highlightHistoryRef.current.pop();
    if (lastCreatedId) {
      deletePdfHighlight(fileId, lastCreatedId);
      triggerSaveToDrive();
      return;
    }
    // Fallback: undo the most recently added highlight if available
    if (highlights.length > 0) {
      const lastHl = highlights[highlights.length - 1];
      if (lastHl) {
        deletePdfHighlight(fileId, lastHl.id);
        triggerSaveToDrive();
      }
    }
  }, [fileId, highlights, triggerSaveToDrive]);

  // Search match navigation
  const handleNextMatch = useCallback(() => {
    if (matches.length === 0) return;
    const nextIdx = (currentMatchIdx + 1) % matches.length;
    setCurrentMatchIdx(nextIdx);
    const m = matches[nextIdx];
    if (m) {
      const targetEl = pageRefs.current.get(m.pageNumber);
      targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      setCurrentPage(m.pageNumber);
    }
  }, [matches, currentMatchIdx]);

  const handlePrevMatch = useCallback(() => {
    if (matches.length === 0) return;
    const prevIdx = (currentMatchIdx - 1 + matches.length) % matches.length;
    setCurrentMatchIdx(prevIdx);
    const m = matches[prevIdx];
    if (m) {
      const targetEl = pageRefs.current.get(m.pageNumber);
      targetEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      setCurrentPage(m.pageNumber);
    }
  }, [matches, currentMatchIdx]);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    searchAbortRef.current?.abort();
    setMatches([]);
    setCurrentMatchIdx(0);
    setIsSearching(false);
  }, []);

  const handleSearchInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrevMatch();
        } else {
          handleNextMatch();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCloseSearch();
      }
    },
    [handleNextMatch, handlePrevMatch, handleCloseSearch],
  );

  // Cooperative non-blocking background search runner
  useEffect(() => {
    if (!isSearchOpen || !pdfDoc || !searchQuery.trim()) {
      setMatches([]);
      setCurrentMatchIdx(0);
      setIsSearching(false);
      searchAbortRef.current?.abort();
      return;
    }

    const timer = setTimeout(() => {
      searchAbortRef.current?.abort();
      const abortController = new AbortController();
      searchAbortRef.current = abortController;

      void (async () => {
        setIsSearching(true);
        const q = matchCase ? searchQuery.trim() : searchQuery.trim().toLowerCase();
        const allMatches: SearchMatch[] = [];
        let firstMatchTriggered = false;

        // Start search from current page, then wrap around
        const pageOrder: number[] = [];
        for (let p = currentPage; p <= numPages; p++) pageOrder.push(p);
        for (let p = 1; p < currentPage; p++) pageOrder.push(p);

        const BATCH_SIZE = 8;
        for (let i = 0; i < pageOrder.length; i += BATCH_SIZE) {
          if (abortController.signal.aborted) return;

          const batch = pageOrder.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (pNum) => {
              if (abortController.signal.aborted) return;

              let text = pageTextCacheRef.current.get(pNum);
              if (text === undefined) {
                try {
                  const page = await pdfDoc.getPage(pNum);
                  const textContent = await page.getTextContent();
                  text = textContent.items
                    .map((item: any) => item.str || "")
                    .join(" ");
                  pageTextCacheRef.current.set(pNum, text);
                } catch {
                  text = "";
                }
              }

              if (abortController.signal.aborted) return;

              const compText = matchCase ? text : text.toLowerCase();
              let pos = 0;
              let onPageIndex = 0;
              while ((pos = compText.indexOf(q, pos)) !== -1) {
                allMatches.push({
                  pageNumber: pNum,
                  matchIndex: allMatches.length,
                  matchIndexOnPage: onPageIndex,
                });
                onPageIndex++;
                pos += q.length;
              }
            }),
          );

          if (abortController.signal.aborted) return;

          if (!firstMatchTriggered && allMatches.length > 0) {
            firstMatchTriggered = true;
            const sorted = [...allMatches].sort((a, b) => {
              const idxA = pageOrder.indexOf(a.pageNumber);
              const idxB = pageOrder.indexOf(b.pageNumber);
              return idxA !== idxB ? idxA - idxB : a.matchIndexOnPage - b.matchIndexOnPage;
            });
            setMatches(sorted);
            setCurrentMatchIdx(0);
            const first = sorted[0];
            if (first) {
              const targetEl = pageRefs.current.get(first.pageNumber);
              targetEl?.scrollIntoView({ behavior: "smooth", block: "start" });
              setCurrentPage(first.pageNumber);
            }
          } else if (allMatches.length > 0) {
            const sorted = [...allMatches].sort((a, b) => {
              const idxA = pageOrder.indexOf(a.pageNumber);
              const idxB = pageOrder.indexOf(b.pageNumber);
              return idxA !== idxB ? idxA - idxB : a.matchIndexOnPage - b.matchIndexOnPage;
            });
            setMatches(sorted);
          }

          // Yield to browser event loop
          await new Promise((r) => setTimeout(r, 0));
        }

        if (abortController.signal.aborted) return;

        // Final sort in document order
        const finalSorted = [...allMatches].sort((a, b) =>
          a.pageNumber !== b.pageNumber
            ? a.pageNumber - b.pageNumber
            : a.matchIndexOnPage - b.matchIndexOnPage,
        );
        for (let idx = 0; idx < finalSorted.length; idx++) {
          finalSorted[idx]!.matchIndex = idx;
        }
        setMatches(finalSorted);
        setIsSearching(false);
      })();
    }, 200);

    return () => {
      clearTimeout(timer);
      searchAbortRef.current?.abort();
    };
  }, [searchQuery, matchCase, isSearchOpen, pdfDoc, numPages, currentPage]);

  // Keyboard shortcuts in PDF viewer: Ctrl+S to save, Ctrl+Z to undo, Ctrl+F to find
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        triggerSaveToDrive();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
        // Prevent browser undo if we have highlights to undo
        if (highlights.length > 0 || highlightHistoryRef.current.length > 0) {
          e.preventDefault();
          handleUndoHighlight();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      } else if (e.key === "Escape" && isSearchOpen) {
        e.preventDefault();
        handleCloseSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerSaveToDrive, handleUndoHighlight, highlights.length, isSearchOpen, handleCloseSearch]);

  // Handle external highlight deletion event (from OutlineSidebar)
  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ fileId?: string; highlightId: string }>;
      if (!customEvent.detail?.fileId || customEvent.detail.fileId === fileId) {
        deletePdfHighlight(fileId, customEvent.detail.highlightId);
        triggerSaveToDrive();
      }
    };

    window.addEventListener("netherite-delete-pdf-highlight", handleDeleteEvent);

    const handleChangeColorEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        fileId?: string;
        highlightId: string;
        color: PdfHighlightColor;
      }>;
      if (!customEvent.detail?.fileId || customEvent.detail.fileId === fileId) {
        updatePdfHighlightColor(
          fileId,
          customEvent.detail.highlightId,
          customEvent.detail.color,
        );
        triggerSaveToDrive();
      }
    };

    window.addEventListener(
      "netherite-change-pdf-highlight-color",
      handleChangeColorEvent,
    );

    return () => {
      window.removeEventListener(
        "netherite-delete-pdf-highlight",
        handleDeleteEvent,
      );
      window.removeEventListener(
        "netherite-change-pdf-highlight-color",
        handleChangeColorEvent,
      );
    };
  }, [fileId, triggerSaveToDrive]);

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

  // Non-blocking background outline parsing
  const parseOutlineInBackground = useCallback(
    async (doc: PDFDocumentProxy) => {
      try {
        const rawOutline = await doc.getOutline();
        if (!rawOutline || rawOutline.length === 0) {
          const fallback: HeadingItem[] = Array.from(
            { length: Math.min(doc.numPages, 50) },
            (_, i) => ({
              id: `page-${i + 1}`,
              text: `Page ${i + 1}`,
              level: 1,
            }),
          );
          onOutlineExtractedRef.current?.(fallback);
          return;
        }

        const parsedHeadings: HeadingItem[] = [];
        const MAX_ITEMS = 2000;
        let count = 0;

        const destCache = new Map<string, any>();
        const pageIndexCache = new Map<string | number, number>();

        const resolvePageIndex = async (dest: any): Promise<number> => {
          if (!dest) return 1;
          if (typeof dest === "number" && !isNaN(dest) && dest >= 0) {
            return dest + 1;
          }
          if (Array.isArray(dest)) {
            const first = dest[0];
            if (typeof first === "number" && !isNaN(first) && first >= 0) {
              return first + 1;
            }
            if (first && typeof first === "object") {
              const key = first.num !== undefined ? `${first.num}_${first.gen ?? 0}` : String(first);
              if (pageIndexCache.has(key)) {
                return pageIndexCache.get(key)!;
              }
              try {
                const idx = await doc.getPageIndex(first);
                if (typeof idx === "number" && !isNaN(idx) && idx >= 0) {
                  const pNum = idx + 1;
                  pageIndexCache.set(key, pNum);
                  return pNum;
                }
              } catch {
                // destination resolution fallback
              }
            }
          }
          return 1;
        };

        const parseNodes = async (nodes: any[], depth = 1) => {
          for (let i = 0; i < nodes.length; i++) {
            if (count >= MAX_ITEMS) break;
            const node = nodes[i];
            if (!node || !node.title) continue;

            let targetPageNumber = 1;
            try {
              if (typeof node.dest === "string") {
                let destArray = destCache.get(node.dest);
                if (!destArray) {
                  destArray = await doc.getDestination(node.dest);
                  if (destArray) destCache.set(node.dest, destArray);
                }
                if (destArray) {
                  targetPageNumber = await resolvePageIndex(destArray);
                }
              } else if (Array.isArray(node.dest)) {
                targetPageNumber = await resolvePageIndex(node.dest);
              }
            } catch {
              // destination resolution fallback
            }

            const cleanTitle = String(node.title || "").trim();
            if (cleanTitle) {
              parsedHeadings.push({
                id: `page-${targetPageNumber}`,
                text: cleanTitle,
                level: Math.min(depth, 3),
              });
              count++;
            }

            // Yield control back to browser to keep UI silky smooth and space out requests
            if (count % 5 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 20));
            }

            // Progressively publish extracted outline in batches so sidebar updates immediately
            if (count > 0 && count % 25 === 0) {
              onOutlineExtractedRef.current?.([...parsedHeadings]);
            }

            if (node.items && node.items.length > 0 && depth < 3) {
              await parseNodes(node.items, depth + 1);
            }
          }
        };

        await parseNodes(rawOutline);
        if (parsedHeadings.length > 0) {
          onOutlineExtractedRef.current?.(parsedHeadings);
        } else {
          const fallback: HeadingItem[] = Array.from(
            { length: Math.min(doc.numPages, 50) },
            (_, i) => ({
              id: `page-${i + 1}`,
              text: `Page ${i + 1}`,
              level: 1,
            }),
          );
          onOutlineExtractedRef.current?.(fallback);
        }
      } catch (e) {
        console.warn("Could not extract PDF outline:", e);
      }
    },
    [],
  );

  // Load PDF Document
  const loadDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadingError(null);
      setLoadingProgress(null);

      // Step 1: Check IndexedDB cache for instant (<100ms) reload
      let pdfData: ArrayBuffer | null = await getCachedPdf(fileId);

      // Step 2: If not in cache, fetch with progressive streaming download
      if (!pdfData) {
        const url = `/api/notes/pdf?id=${encodeURIComponent(fileId)}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Failed to download PDF (${res.status} ${res.statusText})`);
        }

        const contentLengthHeader = res.headers.get("Content-Length");
        const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

        if (res.body) {
          const reader = res.body.getReader();
          const chunks: Uint8Array[] = [];
          let loadedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              loadedBytes += value.length;
              if (totalBytes > 0) {
                setLoadingProgress({
                  loaded: loadedBytes,
                  total: totalBytes,
                  percent: Math.min(100, Math.round((loadedBytes / totalBytes) * 100)),
                });
              } else {
                setLoadingProgress({
                  loaded: loadedBytes,
                  total: 0,
                  percent: 0,
                });
              }
            }
          }

          const combined = new Uint8Array(loadedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          pdfData = combined.buffer;

          // Asynchronously save to IndexedDB cache
          void setCachedPdf(fileId, pdfData);
        } else {
          pdfData = await res.arrayBuffer();
          void setCachedPdf(fileId, pdfData);
        }
      }

      // Step 3: Load document from memory buffer (rock solid, 0 network requests, 0 byte-range bugs)
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfData),
        cMapUrl: "/cmaps/",
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      // Fetch dimensions of Page 1 to estimate layout
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      setBasePageWidth(viewport.width);
      setBasePageHeight(viewport.height);

      // Immediately display document without blocking on outline
      setIsLoading(false);
      setLoadingProgress(null);

      // Run outline extraction after initial page has rendered
      setTimeout(() => {
        void parseOutlineInBackground(doc);
      }, 500);

      // Restore last visited page
      const savedLastPage = getPdfLastPage(fileId);
      if (savedLastPage > 1 && savedLastPage <= doc.numPages) {
        setTimeout(() => {
          const targetEl = pageRefs.current.get(savedLastPage);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
            setCurrentPage(savedLastPage);
            setResumeNotification(`Resumed at Page ${savedLastPage}`);
            setTimeout(() => setResumeNotification(null), 3000);
          }
        }, 150);
      }
    } catch (err: any) {
      console.error("Error loading PDF:", err);
      setLoadingError(err?.message || "Failed to parse PDF document");
      setIsLoading(false);
      setLoadingProgress(null);
    }
  }, [fileId, parseOutlineInBackground]);

  useEffect(() => {
    void loadDocument();
    return () => {
      setPdfDoc(null);
    };
  }, [loadDocument]);

  // Zoom anchor to keep focal point completely stable during trackpad pinch zoom
  const zoomAnchorRef = useRef<{
    pageNum: number;
    ratioY: number;
    clientY: number;
  } | null>(null);

  // Trackpad pinch-to-zoom anchored to the page and point under mouse cursor
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();

        // Identify which page is under the cursor
        let targetPageNum = currentPage;

        for (const [pNum, el] of pageRefs.current.entries()) {
          const pRect = el.getBoundingClientRect();
          if (e.clientY >= pRect.top && e.clientY <= pRect.bottom) {
            targetPageNum = pNum;
            break;
          }
        }

        const targetEl = pageRefs.current.get(targetPageNum);
        if (targetEl) {
          const pRect = targetEl.getBoundingClientRect();
          const pageHeight = Math.max(1, pRect.height);
          zoomAnchorRef.current = {
            pageNum: targetPageNum,
            ratioY: Math.max(0, Math.min(1, (e.clientY - pRect.top) / pageHeight)),
            clientY: e.clientY,
          };
        }

        setScale((prevScale) => {
          // Smooth exponential zoom delta
          const zoomDelta = -e.deltaY * 0.005;
          const nextScale = Math.min(
            3.5,
            Math.max(0.4, prevScale * (1 + zoomDelta)),
          );
          return Math.round(nextScale * 100) / 100;
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [currentPage]);

  // Readjust scroll position synchronously when scale updates so anchor point never shifts
  useLayoutEffect(() => {
    const anchor = zoomAnchorRef.current;
    if (!anchor || !scrollContainerRef.current) return;
    zoomAnchorRef.current = null;

    const el = pageRefs.current.get(anchor.pageNum);
    if (!el) return;

    const container = scrollContainerRef.current;
    const newRect = el.getBoundingClientRect();
    const currentPointY = newRect.top + anchor.ratioY * newRect.height;
    const deltaY = currentPointY - anchor.clientY;

    container.scrollTop += deltaY;
  }, [scale]);

  // Track currently active page via IntersectionObserver focused on top reading band
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
        rootMargin: "-10% 0px -70% 0px",
        threshold: 0,
      },
    );

    pageRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages, scale]);

  // Auto-fit to width
  const handleFitWidth = useCallback(() => {
    if (!scrollContainerRef.current || basePageWidth === 0) return;
    const containerWidth = scrollContainerRef.current.clientWidth;
    const padding = 48;
    const idealScale = Math.max(0.4, (containerWidth - padding) / basePageWidth);
    setScale(Math.round(idealScale * 100) / 100);
  }, [basePageWidth]);

  // Handle Text Selection for Highlighting
  const handleSelectionEnd = useCallback(() => {
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
      const clientRects = Array.from(range.getClientRects()).filter(
        (r) =>
          r.width >= 3 &&
          r.height >= 3 &&
          r.bottom >= pageRect.top &&
          r.top <= pageRect.bottom &&
          r.left >= pageRect.left - 4 &&
          r.right <= pageRect.right + 4,
      );
      if (clientRects.length === 0) return;

      // Merge contiguous/overlapping rects on the same vertical line
      const sortedRects = [...clientRects].sort((a, b) =>
        Math.abs(a.top - b.top) > 5 ? a.top - b.top : a.left - b.left,
      );

      const mergedClientRects: DOMRect[] = [];
      for (const current of sortedRects) {
        const last = mergedClientRects[mergedClientRects.length - 1];
        if (
          last &&
          Math.abs(last.top - current.top) < 6 &&
          Math.abs(last.bottom - current.bottom) < 6 &&
          current.left <= last.right + 4
        ) {
          // Merge with last
          const mergedLeft = Math.min(last.left, current.left);
          const mergedRight = Math.max(last.right, current.right);
          const mergedTop = Math.min(last.top, current.top);
          const mergedBottom = Math.max(last.bottom, current.bottom);
          mergedClientRects[mergedClientRects.length - 1] = new DOMRect(
            mergedLeft,
            mergedTop,
            mergedRight - mergedLeft,
            mergedBottom - mergedTop,
          );
        } else {
          mergedClientRects.push(current);
        }
      }

      const relativeRects = mergedClientRects.map((rect) => ({
        top: ((rect.top - pageRect.top) / pageRect.height) * 100,
        left: ((rect.left - pageRect.left) / pageRect.width) * 100,
        width: (rect.width / pageRect.width) * 100,
        height: (rect.height / pageRect.height) * 100,
      }));

      const rangeRect = range.getBoundingClientRect();
      const popupWidth = 260;
      const popupHeight = 44;
      const topToolbarHeight = 56;

      const centerX = rangeRect.left + rangeRect.width / 2;
      const menuX = Math.min(
        window.innerWidth - popupWidth - 16,
        Math.max(16, centerX - popupWidth / 2),
      );

      // Prefer displaying 12px above selection; if too close to top toolbar, flip 12px below
      const menuY =
        rangeRect.top - popupHeight - 12 > topToolbarHeight
          ? rangeRect.top - popupHeight - 12
          : Math.min(
              window.innerHeight - popupHeight - 16,
              rangeRect.bottom + 12,
            );

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

  // Catch selection releases anywhere on document
  useEffect(() => {
    const handleDocMouseUp = () => {
      handleSelectionEnd();
    };
    document.addEventListener("mouseup", handleDocDocUp);
    document.addEventListener("touchend", handleDocDocUp);
    return () => {
      document.removeEventListener("mouseup", handleDocDocUp);
      document.removeEventListener("touchend", handleDocDocUp);
    };
    function handleDocDocUp() {
      handleDocMouseUp();
    }
  }, [handleSelectionEnd]);

  // Handle click on existing highlight marks
  const handlePageClick = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection();
      if (
        selection &&
        !selection.isCollapsed &&
        selection.toString().trim().length > 0
      ) {
        return;
      }

      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const hlElement = elements.find((el) =>
        el.classList.contains("pdf-highlight-mark"),
      );
      if (hlElement) {
        const hlId = hlElement.getAttribute("data-highlight-id");
        const found = highlights.find((h) => h.id === hlId);
        if (found) {
          e.stopPropagation();
          const rect = hlElement.getBoundingClientRect();
          setActionMenu({
            visible: true,
            x: Math.min(
              window.innerWidth - 240,
              Math.max(20, rect.left + rect.width / 2 - 110),
            ),
            y: Math.max(10, rect.top - 46),
            highlight: found,
          });
          setFloatingMenu(null);
        }
      }
    },
    [highlights],
  );

  const handleApplyHighlight = (color: PdfHighlightColor) => {
    if (!floatingMenu) return;

    const newHl = addPdfHighlight(fileId, {
      pageNumber: floatingMenu.pageNumber,
      text: floatingMenu.text,
      color,
      rects: floatingMenu.rects,
    });

    highlightHistoryRef.current.push(newHl.id);

    // Auto sync to Drive in background
    setTimeout(() => {
      triggerSaveToDrive();
    }, 400);

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
    triggerSaveToDrive();
  };

  const handleDeleteHighlight = (highlightId: string) => {
    deletePdfHighlight(fileId, highlightId);
    setActionMenu(null);
    triggerSaveToDrive();
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

  // Fast O(1) lookup of highlights by page
  const highlightsByPage = useMemo(() => {
    const map = new Map<number, PdfHighlight[]>();
    for (const h of highlights) {
      const list = map.get(h.pageNumber);
      if (list) {
        list.push(h);
      } else {
        map.set(h.pageNumber, [h]);
      }
    }
    return map;
  }, [highlights]);

  return (
    <div
      className={`relative flex h-full w-full flex-col select-none overflow-hidden transition-colors ${
        isNightMode ? "bg-zinc-950 text-zinc-100" : "bg-muted/15 text-foreground"
      }`}
      onClick={() => {
        if (floatingMenu) setFloatingMenu(null);
        if (actionMenu) setActionMenu(null);
      }}
    >
      {/* Top Modern Toolbar */}
      <div
        className={`flex h-12 shrink-0 items-center justify-between border-b px-3 sm:px-4 backdrop-blur-md z-10 select-none ${
          isNightMode
            ? "border-zinc-800 bg-zinc-900/90 text-zinc-100"
            : "border-border/40 bg-background/90 text-foreground"
        }`}
      >
        {/* Left: PDF badge & direct page jump */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[11px] tracking-wider uppercase">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>PDF</span>
          </div>

          {highlights.length > 0 && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:inline-block">
              {highlights.length} {highlights.length === 1 ? "highlight" : "highlights"}
            </span>
          )}

          <div className="w-[1px] h-4 bg-border/60 mx-1 hidden sm:block" />

          {/* Page navigation with interactive jump input */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const prev = Math.max(1, currentPage - 1);
                const el = pageRefs.current.get(prev);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                setCurrentPage(prev);
              }}
              disabled={currentPage <= 1}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onBlur={() => setJumpInput(String(currentPage))}
                className="w-12 h-6 px-1 text-center font-mono text-xs font-semibold rounded bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border/50 focus:border-primary focus:outline-none transition-all"
                title="Type page number and press Enter"
              />
              <span className="text-muted-foreground text-xs font-mono">
                / {numPages || "–"}
              </span>
            </form>

            <button
              onClick={() => {
                const next = Math.min(numPages, currentPage + 1);
                const el = pageRefs.current.get(next);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
                setCurrentPage(next);
              }}
              disabled={currentPage >= numPages}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center: Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.max(0.4, Math.round((s - 0.15) * 100) / 100))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono font-medium px-1 text-foreground min-w-[3.2rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3.5, Math.round((s + 0.15) * 100) / 100))}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleFitWidth}
            className="px-2 py-1 rounded-md text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1"
            title="Fit to Width"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="text-[11px]">Fit</span>
          </button>
        </div>

        {/* Right: Quick actions (Night mode, Undo, Save, Download, External) */}
        <div className="flex items-center gap-1">
          {/* Night Mode Toggle */}
          <button
            onClick={toggleNightMode}
            className={`p-1.5 rounded-md transition-colors ${
              isNightMode
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title={`Night Mode: ${isNightMode ? "On" : "Off"}`}
          >
            {isNightMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          {/* Undo Highlight Button */}
          <button
            onClick={handleUndoHighlight}
            disabled={highlights.length === 0}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Undo Highlight (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>

          {/* Cloud Save Button */}
          <button
            onClick={() => triggerSaveToDrive()}
            className={`p-1.5 rounded-md transition-colors ${
              saveStatus === "saved"
                ? "text-emerald-500"
                : saveStatus === "saving"
                  ? "text-blue-500 animate-spin"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title="Save annotations to Google Drive (Ctrl+S)"
          >
            {saveStatus === "saved" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </button>

          <div className="w-[1px] h-4 bg-border/60 mx-0.5 hidden sm:block" />

          {/* Reload PDF */}
          <button
            onClick={() => void loadDocument()}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden sm:flex"
            title="Reload PDF"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Search in PDF Button */}
          <button
            onClick={() => {
              setIsSearchOpen((prev) => {
                const next = !prev;
                if (next) {
                  setTimeout(() => {
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                  }, 50);
                }
                return next;
              });
            }}
            className={`p-1.5 rounded-md transition-colors ${
              isSearchOpen
                ? "bg-primary/20 text-primary hover:bg-primary/30"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title="Search in PDF (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Download PDF */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Open in New Tab */}
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors hidden md:flex"
            title="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floating Search Bar */}
      {isSearchOpen && (
        <div className="absolute top-13 right-4 sm:right-6 z-40 bg-card/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl p-1.5 flex items-center gap-1.5 text-xs text-foreground animate-in fade-in slide-in-from-top-2 duration-150 select-none">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Find in document…"
              className="w-44 sm:w-60 pl-8 pr-2 py-1 text-xs bg-background/80 border border-border/50 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Match Case Toggle */}
          <button
            onClick={() => setMatchCase((prev) => !prev)}
            className={`p-1 rounded-md transition-colors text-xs font-semibold ${
              matchCase
                ? "bg-primary/20 text-primary border border-primary/40"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
            }`}
            title="Match Case"
            aria-label="Match Case"
          >
            <CaseSensitive className="w-4 h-4" />
          </button>

          {/* Match Count / Status */}
          <div className="text-[11px] font-mono text-muted-foreground px-1 min-w-[3.5rem] text-center shrink-0">
            {isSearching ? (
              <span className="flex items-center justify-center gap-1 text-primary">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{matches.length}</span>
              </span>
            ) : matches.length > 0 ? (
              <span>
                {currentMatchIdx + 1} / {matches.length}
              </span>
            ) : searchQuery.trim() ? (
              <span className="text-muted-foreground/60">0 / 0</span>
            ) : null}
          </div>

          {/* Previous Match */}
          <button
            onClick={handlePrevMatch}
            disabled={matches.length === 0}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Match (Shift+Enter)"
            aria-label="Previous Match"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Next Match */}
          <button
            onClick={handleNextMatch}
            disabled={matches.length === 0}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Match (Enter)"
            aria-label="Next Match"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-border/60 mx-0.5" />

          {/* Close Search */}
          <button
            onClick={handleCloseSearch}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Close Search (Esc)"
            aria-label="Close Search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Canvas Scroll Area */}
      <div
        ref={scrollContainerRef}
        onMouseUp={handleSelectionEnd}
        onTouchEnd={handleSelectionEnd}
        onClick={handlePageClick}
        className="relative flex-1 w-full h-full overflow-y-auto overflow-x-auto p-4 sm:p-6"
      >
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-xs flex items-center justify-center">
            <MacFileLoader
              fileName={fileName}
              fileType="pdf"
              message={
                loadingProgress && loadingProgress.total > 0
                  ? `Loading PDF: ${loadingProgress.percent}% (${(loadingProgress.loaded / (1024 * 1024)).toFixed(1)} MB / ${(loadingProgress.total / (1024 * 1024)).toFixed(1)} MB)…`
                  : loadingProgress && loadingProgress.loaded > 0
                  ? `Downloading PDF: ${(loadingProgress.loaded / (1024 * 1024)).toFixed(1)} MB…`
                  : "Rendering PDF with interactive highlights…"
              }
            />
          </div>
        )}

        {/* Resume notification banner */}
        {resumeNotification && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 bg-card/90 text-foreground border border-border/80 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {resumeNotification}
          </div>
        )}

        {/* Save toast */}
        {saveStatus === "saved" && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-medium shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved annotations to Google Drive</span>
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
                key={`page-${pageNum}`}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
                defaultWidth={basePageWidth}
                defaultHeight={basePageHeight}
                isNightMode={isNightMode}
                highlights={highlightsByPage.get(pageNum) || EMPTY_HIGHLIGHTS}
                onHighlightClick={handleOpenHighlightAction}
                searchQuery={isSearchOpen ? searchQuery : undefined}
                matchCase={matchCase}
                isCurrentSearchPage={activeSearchMatch?.pageNumber === pageNum}
                activeMatchIndexOnPage={activeSearchMatch?.matchIndexOnPage}
                onTextExtracted={(pNum, text) => {
                  if (!pageTextCacheRef.current.has(pNum)) {
                    pageTextCacheRef.current.set(pNum, text);
                  }
                }}
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
              className="group relative flex h-7 w-7 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform cursor-pointer"
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
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
              className={`group relative flex h-7 w-7 items-center justify-center rounded-full hover:scale-110 active:scale-95 transition-transform cursor-pointer ${
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
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Copy Highlighted Text"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handleDeleteHighlight(actionMenu.highlight.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-destructive/15 text-destructive transition-colors cursor-pointer"
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
  isNightMode: boolean;
  highlights: PdfHighlight[];
  onHighlightClick: (e: React.MouseEvent, h: PdfHighlight) => void;
  searchQuery?: string;
  isCurrentSearchPage?: boolean;
  activeMatchIndexOnPage?: number;
  matchCase?: boolean;
  onTextExtracted?: (pageNumber: number, text: string) => void;
}

const VirtualPdfPage = React.memo(
  React.forwardRef<HTMLDivElement, VirtualPdfPageProps>(
    function VirtualPdfPage(
    {
      pdfDoc,
      pageNumber,
      scale,
      defaultWidth,
      defaultHeight,
      isNightMode,
      highlights,
      onHighlightClick,
      searchQuery,
      isCurrentSearchPage,
      activeMatchIndexOnPage,
      matchCase,
      onTextExtracted,
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

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as any).current = node;
      },
      [ref],
    );

    // Pre-buffer 450px around viewport for seamless scrolling without thrashing bandwidth on start
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
        { rootMargin: "450px 0px" },
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    // Render canvas and text layer when visible
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

          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const transform =
            pixelRatio !== 1
              ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
              : undefined;

          renderTask = page.render({
            canvasContext: context,
            viewport,
            transform,
          });

          await renderTask.promise;
          if (isCancelled) return;

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

            // Cache text for lightning fast searches
            const pageStr = textContent.items
              .map((item: any) => item.str || "")
              .join(" ");
            onTextExtracted?.(pageNumber, pageStr);

            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textLayerContainer,
              viewport,
            });

            await textLayer.render();
            if (isCancelled) return;

            const endOfContent = document.createElement("div");
            endOfContent.className = "endOfContent";
            textLayerContainer.append(endOfContent);

            textLayerContainer.onpointerdown = () => {
              textLayerContainer.classList.add("selecting");
            };
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
    }, [pdfDoc, pageNumber, scale, isVisible, onTextExtracted]);

    // Highlight search query occurrences in rendered textLayer
    useEffect(() => {
      const textLayerContainer = textLayerRef.current;
      if (!textLayerContainer || !isRendered) return;

      // Clean up previous search highlights
      const existingMarks = textLayerContainer.querySelectorAll(".pdf-search-match");
      existingMarks.forEach((m) => {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent || ""), m);
          parent.normalize();
        }
      });

      const cleanQuery = searchQuery?.trim() || "";
      if (!cleanQuery) return;

      const query = matchCase ? cleanQuery : cleanQuery.toLowerCase();
      const walker = document.createTreeWalker(
        textLayerContainer,
        NodeFilter.SHOW_TEXT,
        null,
      );

      const nodesToReplace: { node: Text; matchIdx: number }[] = [];
      let currentNode: Text | null = null;
      while ((currentNode = walker.nextNode() as Text | null)) {
        const val = currentNode.nodeValue || "";
        const comp = matchCase ? val : val.toLowerCase();
        const idx = comp.indexOf(query);
        if (idx !== -1) {
          nodesToReplace.push({ node: currentNode, matchIdx: idx });
        }
      }

      let matchCountOnPage = 0;
      nodesToReplace.forEach(({ node, matchIdx }) => {
        const text = node.nodeValue || "";
        const before = text.substring(0, matchIdx);
        const matched = text.substring(matchIdx, matchIdx + cleanQuery.length);
        const after = text.substring(matchIdx + cleanQuery.length);

        const isCurrentActive =
          isCurrentSearchPage && matchCountOnPage === activeMatchIndexOnPage;
        matchCountOnPage++;

        const mark = document.createElement("mark");
        mark.className = `pdf-search-match rounded-2xs transition-all ${
          isCurrentActive
            ? "bg-amber-400 text-black font-semibold ring-2 ring-primary ring-offset-1 shadow-md animate-pulse"
            : "bg-amber-300/40 dark:bg-amber-400/30 text-inherit"
        }`;
        mark.textContent = matched;

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));

        node.parentNode?.replaceChild(frag, node);

        if (isCurrentActive) {
          setTimeout(() => {
            mark.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 40);
        }
      });
    }, [
      isRendered,
      searchQuery,
      isCurrentSearchPage,
      activeMatchIndexOnPage,
      matchCase,
    ]);

    // Clean up selecting class on global pointer release
    useEffect(() => {
      const handlePointerUp = () => {
        textLayerRef.current?.classList.remove("selecting");
      };
      document.addEventListener("pointerup", handlePointerUp);
      return () => {
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, []);

    const colorClasses: Record<PdfHighlightColor, string> = {
      yellow: "bg-amber-300/40 dark:bg-amber-400/40 border-b border-amber-400/70",
      green: "bg-emerald-300/40 dark:bg-emerald-400/40 border-b border-emerald-400/70",
      blue: "bg-sky-300/40 dark:bg-sky-400/40 border-b border-sky-400/70",
      pink: "bg-pink-300/40 dark:bg-pink-400/40 border-b border-pink-400/70",
      purple: "bg-purple-300/40 dark:bg-purple-400/40 border-b border-purple-400/70",
      orange: "bg-orange-300/40 dark:bg-orange-400/40 border-b border-orange-400/70",
    };

    return (
      <div
        ref={setRefs}
        data-page-number={pageNumber}
        style={{
          width: `${Math.floor(pageWidth)}px`,
          minHeight: `${Math.floor(pageHeight)}px`,
        }}
        className={`pdf-page-container relative shadow-md rounded-sm transition-shadow ${
          isNightMode
            ? "bg-[#18181b] border border-zinc-800 text-zinc-100"
            : "bg-white border border-border/40 text-black"
        }`}
      >
        {isVisible ? (
          <>
            <canvas
              ref={canvasRef}
              className={`block select-none pdf-canvas-underlay ${
                isNightMode ? "pdf-canvas-night-mode" : ""
              }`}
            />

            {/* Rendered Highlights Overlay (behind text layer in z-axis) */}
            <div className="pdf-highlights-underlay">
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

            {/* Interactive Text Layer for selection (above highlights in z-axis) */}
            <div ref={textLayerRef} className="pdf-text-layer textLayer" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center pointer-events-none">
            <div className="h-2 w-16 rounded-full bg-muted/20 animate-pulse" />
          </div>
        )}
      </div>
    );
  }),
);
