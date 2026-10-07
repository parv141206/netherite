import { safeLocalStorageSet, idbSetDoc } from "./storageEngine";

export type PdfHighlightColor =
  | "yellow"
  | "green"
  | "blue"
  | "pink"
  | "purple"
  | "orange";

export interface PdfHighlightRect {
  top: number; // percentage (0 - 100)
  left: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
}

export interface PdfHighlight {
  id: string;
  fileId: string;
  pageNumber: number;
  text: string;
  color: PdfHighlightColor;
  rects: PdfHighlightRect[];
  createdAt: string;
}

export const PDF_HIGHLIGHTS_UPDATED_EVENT = "netherite-pdf-highlights-updated";

const getStorageKey = (fileId: string) => `netherite_pdf_highlights_${fileId}`;

export function getPdfHighlights(fileId: string): PdfHighlight[] {
  if (!fileId || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(fileId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load PDF highlights from localStorage:", err);
    return [];
  }
}

export function savePdfHighlights(fileId: string, highlights: PdfHighlight[]): void {
  if (!fileId || typeof window === "undefined") return;
  try {
    const json = JSON.stringify(highlights);
    safeLocalStorageSet(getStorageKey(fileId), json);
    void idbSetDoc(getStorageKey(fileId), json);

    window.dispatchEvent(
      new CustomEvent(PDF_HIGHLIGHTS_UPDATED_EVENT, {
        detail: { fileId, highlights },
      }),
    );
  } catch (err) {
    console.warn("Failed to save PDF highlights:", err);
  }
}

export function addPdfHighlight(
  fileId: string,
  data: Omit<PdfHighlight, "id" | "createdAt" | "fileId">,
): PdfHighlight {
  const current = getPdfHighlights(fileId);
  const newHighlight: PdfHighlight = {
    ...data,
    id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    fileId,
    createdAt: new Date().toISOString(),
  };

  const updated = [...current, newHighlight];
  savePdfHighlights(fileId, updated);
  return newHighlight;
}

export function deletePdfHighlight(fileId: string, highlightId: string): PdfHighlight[] {
  const current = getPdfHighlights(fileId);
  const updated = current.filter((h) => h.id !== highlightId);
  savePdfHighlights(fileId, updated);
  return updated;
}

export function updatePdfHighlightColor(
  fileId: string,
  highlightId: string,
  color: PdfHighlightColor,
): PdfHighlight[] {
  const current = getPdfHighlights(fileId);
  const updated = current.map((h) => (h.id === highlightId ? { ...h, color } : h));
  savePdfHighlights(fileId, updated);
  return updated;
}

const getLastPageKey = (fileId: string) => `netherite_pdf_last_page_${fileId}`;

export function getPdfLastPage(fileId: string): number {
  if (!fileId || typeof window === "undefined") return 1;
  try {
    const raw = localStorage.getItem(getLastPageKey(fileId));
    if (!raw) return 1;
    const num = parseInt(raw, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  } catch {
    return 1;
  }
}

export function savePdfLastPage(fileId: string, pageNumber: number): void {
  if (!fileId || typeof window === "undefined" || !pageNumber || pageNumber < 1) return;
  try {
    safeLocalStorageSet(getLastPageKey(fileId), String(pageNumber));
  } catch {}
}

export function mergePdfHighlights(
  local: PdfHighlight[],
  remote: PdfHighlight[],
): PdfHighlight[] {
  const map = new Map<string, PdfHighlight>();
  // Add remote first
  for (const h of remote) {
    if (h && h.id) map.set(h.id, h);
  }
  // Overlay local (keeps user's latest offline changes)
  for (const h of local) {
    if (h && h.id) map.set(h.id, h);
  }
  return Array.from(map.values());
}

