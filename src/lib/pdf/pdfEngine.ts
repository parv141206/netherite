"use client";

import { jsPDF } from "jspdf";

export interface PdfEngineConfig {
  fileName: string;
  pageSize?: "a4" | "letter" | "legal";
  orientation?: "portrait" | "landscape";
  margin?: "normal" | "compact" | "wide" | "none";
  colorMode?: "light" | "dark" | "monochrome";
  themePreset?: "academic" | "engineering" | "executive" | "monochrome" | "nord" | "dracula";
  fontFamily?: string;
  baseFontSize?: "13px" | "14px" | "15px" | "16px";
  showHeaderTitle?: boolean;
  showDate?: boolean;
  showPageNumbers?: boolean;
  customSubtitle?: string;
  includeCoverPage?: boolean;
  onProgress?: (status: string) => void;
}

export const PAGE_SPECS = {
  a4: {
    portrait: { widthMm: 210, heightMm: 297, ratio: 297 / 210 },
    landscape: { widthMm: 297, heightMm: 210, ratio: 210 / 297 },
  },
  letter: {
    portrait: { widthMm: 215.9, heightMm: 279.4, ratio: 279.4 / 215.9 },
    landscape: { widthMm: 279.4, heightMm: 215.9, ratio: 215.9 / 279.4 },
  },
  legal: {
    portrait: { widthMm: 215.9, heightMm: 355.6, ratio: 355.6 / 215.9 },
    landscape: { widthMm: 355.6, heightMm: 215.9, ratio: 215.9 / 355.6 },
  },
};

export const MARGIN_SPECS = {
  normal: { topMm: 18, bottomMm: 18, leftMm: 20, rightMm: 20 },
  compact: { topMm: 12, bottomMm: 12, leftMm: 12, rightMm: 12 },
  wide: { topMm: 24, bottomMm: 24, leftMm: 26, rightMm: 26 },
  none: { topMm: 0, bottomMm: 0, leftMm: 0, rightMm: 0 },
};

/**
 * Builds the comprehensive stylesheet tailored specifically for publication-grade PDF documents.
 */
export function buildPdfStylesheet(config: PdfEngineConfig): string {
  const {
    pageSize = "a4",
    orientation = "portrait",
    margin = "normal",
    colorMode = "light",
    themePreset = "academic",
    fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    baseFontSize = "14px",
  } = config;

  const isDark = colorMode === "dark";
  const isMono = colorMode === "monochrome" || themePreset === "monochrome";

  // Palette definitions
  const bgColor = isDark ? "#121215" : "#ffffff";
  const fgColor = isDark ? "#f4f4f6" : isMono ? "#000000" : "#1a1a1d";
  const mutedColor = isDark ? "#a1a1aa" : isMono ? "#444444" : "#64748b";
  const borderColor = isDark ? "#27272a" : isMono ? "#000000" : "#e2e8f0";
  const codeBg = isDark ? "#18181c" : isMono ? "#f5f5f5" : "#f8fafc";
  const calloutNoteBg = isDark ? "#172338" : isMono ? "#f5f5f5" : "#f0f9ff";
  const calloutTipBg = isDark ? "#112b20" : isMono ? "#f5f5f5" : "#f0fdf4";
  const calloutWarnBg = isDark ? "#2c2010" : isMono ? "#f5f5f5" : "#fefce8";
  const calloutDangerBg = isDark ? "#2d1515" : isMono ? "#f5f5f5" : "#fef2f2";
  const tableZebraBg = isDark ? "#16161a" : isMono ? "#f9f9f9" : "#f8fafc";

  const marginMm = MARGIN_SPECS[margin];

  return `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=Lora:ital,wght@0,400..700;1,400..700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    @page {
      size: ${pageSize} ${orientation};
      margin: ${marginMm.topMm}mm ${marginMm.rightMm}mm ${marginMm.bottomMm}mm ${marginMm.leftMm}mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    :root, body, .pdf-root-container {
      margin: 0;
      padding: 0;
      background-color: ${bgColor};
      color: ${fgColor};
      font-family: ${fontFamily};
      font-size: ${baseFontSize};
      line-height: 1.5;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;

      /* Highlight Color Variables */
      --highlight-yellow: ${isDark ? "#854d0e" : "#fef08a"};
      --highlight-green: ${isDark ? "#166534" : "#bbf7d0"};
      --highlight-blue: ${isDark ? "#1e40af" : "#bfdbfe"};
      --highlight-pink: ${isDark ? "#9d174d" : "#fbcfe8"};
      --highlight-purple: ${isDark ? "#6b21a8" : "#e9d5ff"};
    }

    /* Highlights */
    mark, .pdf-highlight {
      background-color: var(--highlight-yellow);
      color: inherit;
      padding: 0.12em 0.35em;
      border-radius: 4px;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      font-weight: 500;
    }

    mark[data-color*="pink"], .pdf-highlight-pink { background-color: var(--highlight-pink) !important; }
    mark[data-color*="yellow"], .pdf-highlight-yellow { background-color: var(--highlight-yellow) !important; }
    mark[data-color*="green"], .pdf-highlight-green { background-color: var(--highlight-green) !important; }
    mark[data-color*="blue"], .pdf-highlight-blue { background-color: var(--highlight-blue) !important; }
    mark[data-color*="purple"], .pdf-highlight-purple { background-color: var(--highlight-purple) !important; }

    ${
      isMono
        ? `
      mark, .pdf-highlight,
      mark[data-color*="pink"],
      mark[data-color*="yellow"],
      mark[data-color*="green"],
      mark[data-color*="blue"],
      mark[data-color*="purple"] {
        background-color: #e5e5e5 !important;
        color: #000000 !important;
        border-bottom: 1.5px solid #000000;
      }
    `
        : ""
    }

    /* Document Sheet Wrapper */
    .pdf-compiled-document {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    /* Headings */
    .pdf-heading {
      color: ${fgColor};
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-top: 1.2em;
      margin-bottom: 0.35em;
      page-break-after: avoid;
      break-after: avoid;
      line-height: 1.25;
    }

    .pdf-heading-num {
      color: ${isMono ? fgColor : "#6366f1"};
      margin-right: 0.35em;
      font-weight: 600;
    }

    .pdf-h1 {
      font-size: 1.75em;
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 0.25em;
      margin-top: 0.8em;
    }

    .pdf-h2 {
      font-size: 1.35em;
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 0.2em;
      margin-top: 1em;
    }

    .pdf-h3 { font-size: 1.15em; margin-top: 0.9em; }
    .pdf-h4 { font-size: 1.02em; margin-top: 0.8em; }
    .pdf-h5 { font-size: 0.92em; margin-top: 0.7em; }
    .pdf-h6 { font-size: 0.82em; text-transform: uppercase; color: ${mutedColor}; margin-top: 0.6em; }

    /* Paragraphs & Text */
    .pdf-paragraph {
      margin-top: 0;
      margin-bottom: 0.65em;
      color: ${fgColor};
      text-align: left !important;
      hyphens: none;
      line-height: 1.55;
      overflow-wrap: break-word;
      word-break: normal;
    }

    /* Mathematical Formulas (KaTeX) */
    .pdf-math-display {
      margin: 0.9em 0;
      padding: 0.5em 0;
      text-align: center;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-math-inline {
      padding: 0 0.2em;
      display: inline-block;
      vertical-align: middle;
    }

    .katex {
      font-size: 1.06em;
      color: ${fgColor};
    }

    /* Diagrams & SVGs */
    .pdf-diagram-wrapper {
      margin: 1.2em auto;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
      max-width: 100%;
      overflow: hidden;
      padding: 10px;
      border-radius: 8px;
      background: ${isDark ? "#18181c" : "#fafafa"};
      border: 1px solid ${borderColor};
    }

    .pdf-diagram-wrapper svg {
      max-width: 100%;
      height: auto;
      margin: 0 auto;
      display: block;
    }

    /* Images */
    .pdf-image-container {
      margin: 1.2em 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-image {
      max-width: 100%;
      max-height: 440px;
      height: auto;
      border-radius: 8px;
      border: 1px solid ${borderColor};
      display: inline-block;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .pdf-figcaption {
      margin-top: 0.4em;
      font-size: 0.82em;
      color: ${mutedColor};
      font-style: italic;
    }

    /* Code Blocks */
    .pdf-code-container {
      margin: 0.9em 0;
      border: 1px solid ${borderColor};
      border-radius: 8px;
      background-color: ${codeBg};
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    .pdf-code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 12px;
      background-color: ${isDark ? "#202026" : isMono ? "#e5e5e5" : "#f1f5f9"};
      border-bottom: 1px solid ${borderColor};
      font-size: 0.72em;
      color: ${mutedColor};
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .pdf-code-dots {
      display: flex;
      gap: 5px;
    }

    .pdf-code-dots .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .pdf-code-dots .red { background-color: #ef4444; }
    .pdf-code-dots .yellow { background-color: #f59e0b; }
    .pdf-code-dots .green { background-color: #10b981; }

    .pdf-code-pre {
      margin: 0;
      padding: 8px 0;
      overflow-x: auto;
      font-size: 0.85em;
      line-height: 1.45;
    }

    .pdf-code-line {
      display: flex;
      padding: 0 12px;
    }

    .pdf-code-line-num {
      width: 32px;
      shrink: 0;
      user-select: none;
      color: ${mutedColor};
      text-align: right;
      padding-right: 12px;
      opacity: 0.5;
    }

    .pdf-code-line-content {
      flex: 1;
      white-space: pre-wrap;
      word-break: break-all;
    }

    /* ASCII Diagrams & Wide Preformatted Blocks: Never wrap, preserve grid alignment */
    .pdf-code-ascii .pdf-code-line-content,
    .pdf-code-wide .pdf-code-line-content {
      white-space: pre !important;
      word-break: normal !important;
      overflow-wrap: normal !important;
    }

    .pdf-code-ascii pre,
    .pdf-code-ascii code,
    .pdf-code-ascii .pdf-code-line-content {
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace !important;
      letter-spacing: 0px !important;
    }

    .pdf-inline-code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.86em;
      padding: 0.12em 0.35em;
      background-color: ${codeBg};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      color: ${isMono ? fgColor : isDark ? "#e2e8f0" : "#0f172a"};
    }

    /* Syntax Highlighting */
    .hljs-keyword,
    .hljs-operator,
    .hljs-selector-tag {
      color: ${isDark ? "#ff7b72" : isMono ? fgColor : "#cf222e"};
      font-weight: 600;
    }
    .hljs-string,
    .hljs-doctag,
    .hljs-regexp {
      color: ${isDark ? "#a5d6ff" : isMono ? fgColor : "#0a3069"};
    }
    .hljs-comment,
    .hljs-quote {
      color: ${isDark ? "#8b949e" : isMono ? "#666" : "#6e7781"};
      font-style: italic;
    }
    .hljs-title,
    .hljs-title.function_,
    .hljs-section {
      color: ${isDark ? "#d2a8ff" : isMono ? fgColor : "#8250df"};
      font-weight: 600;
    }
    .hljs-number,
    .hljs-literal,
    .hljs-type,
    .hljs-built_in {
      color: ${isDark ? "#79c0ff" : isMono ? fgColor : "#0550ae"};
    }
    .hljs-variable,
    .hljs-attr,
    .hljs-property {
      color: ${isDark ? "#ffa657" : isMono ? fgColor : "#953800"};
    }
    .hljs-meta,
    .hljs-subst {
      color: ${isDark ? "#8b949e" : isMono ? "#666" : "#57606a"};
    }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: bold; }

    /* Tables */
    .pdf-table-wrapper {
      margin: 1.1em 0;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9em;
      border: 1px solid ${borderColor};
    }

    .pdf-table thead {
      display: table-header-group !important;
    }

    .pdf-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .pdf-table th {
      background-color: ${isDark ? "#202026" : isMono ? "#e5e5e5" : "#f1f5f9"};
      color: ${fgColor};
      font-weight: 600;
      padding: 7px 11px;
      border: 1px solid ${borderColor};
      text-align: left !important;
    }

    .pdf-table td {
      padding: 7px 11px;
      border: 1px solid ${borderColor};
      text-align: left !important;
      vertical-align: top;
      word-break: normal;
    }

    .pdf-row-zebra td {
      background-color: ${tableZebraBg};
    }

    /* Callouts / Text Boxes */
    .pdf-callout {
      margin: 0.9em 0;
      padding: 10px 14px;
      border-left: 4px solid;
      border-radius: 0 8px 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-callout-header {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
      font-size: 0.85em;
      margin-bottom: 4px;
      letter-spacing: 0.03em;
    }

    .pdf-callout-note { background-color: ${calloutNoteBg}; border-color: #3b82f6; color: ${isDark ? "#93c5fd" : "#1e40af"}; }
    .pdf-callout-info { background-color: ${calloutNoteBg}; border-color: #0284c7; color: ${isDark ? "#7dd3fc" : "#0369a1"}; }
    .pdf-callout-tip { background-color: ${calloutTipBg}; border-color: #10b981; color: ${isDark ? "#86efac" : "#166534"}; }
    .pdf-callout-success { background-color: ${calloutTipBg}; border-color: #16a34a; color: ${isDark ? "#86efac" : "#15803d"}; }
    .pdf-callout-important { background-color: ${isDark ? "#281b38" : "#f5f3ff"}; border-color: #8b5cf6; color: ${isDark ? "#c4b5fd" : "#5b21b6"}; }
    .pdf-callout-warning { background-color: ${calloutWarnBg}; border-color: #f59e0b; color: ${isDark ? "#fde68a" : "#854d0e"}; }
    .pdf-callout-caution, .pdf-callout-danger { background-color: ${calloutDangerBg}; border-color: #ef4444; color: ${isDark ? "#fca5a5" : "#991b1b"}; }
    .pdf-callout-question { background-color: ${isDark ? "#1e1e38" : "#eef2ff"}; border-color: #6366f1; color: ${isDark ? "#a5b4fc" : "#4338ca"}; }
    .pdf-callout-example { background-color: ${isDark ? "#132b2a" : "#f0fdfa"}; border-color: #14b8a6; color: ${isDark ? "#99f6e4" : "#0f766e"}; }
    .pdf-callout-quote { background-color: ${isDark ? "#18181c" : "#f8fafc"}; border-color: ${mutedColor}; color: ${fgColor}; }

    .pdf-callout-body {
      font-size: 0.92em;
      color: ${fgColor};
      line-height: 1.5;
      text-align: left !important;
    }

    /* Blockquotes */
    .pdf-blockquote {
      margin: 0.9em 0;
      padding: 8px 14px;
      border-left: 3.5px solid ${isMono ? fgColor : isDark ? "#6366f1" : "#4f46e5"};
      background-color: ${isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)"};
      border-radius: 0 6px 6px 0;
      color: ${mutedColor};
      font-style: italic;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Lists */
    .pdf-ul, .pdf-ol {
      margin: 0.6em 0;
      padding-left: 1.6em;
    }

    .pdf-li-bullet, .pdf-li-number {
      margin-bottom: 0.25em;
      line-height: 1.45;
    }

    /* Task items */
    .pdf-task-item {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0.25em 0;
    }

    .pdf-checkbox {
      font-size: 1.05em;
      color: ${mutedColor};
    }

    .pdf-task-done {
      color: ${mutedColor};
      text-decoration: line-through;
    }

    /* Divider */
    .pdf-hr {
      border: none;
      border-top: 1px solid ${borderColor};
      margin: 1.6em 0;
    }

    /* Links */
    .pdf-link {
      color: ${isMono ? fgColor : "#4f46e5"};
      text-decoration: underline;
    }

    /* Cover Page */
    .pdf-cover-page {
      min-height: 75vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 30px 0;
      page-break-after: always;
      break-after: page;
    }

    .pdf-cover-badge {
      display: inline-block;
      font-size: 0.75em;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: ${isMono ? fgColor : "#6366f1"};
      margin-bottom: 1em;
    }

    .pdf-cover-title {
      font-size: 2.6em;
      font-weight: 800;
      line-height: 1.15;
      margin: 0 0 0.25em 0;
      color: ${fgColor};
    }

    .pdf-cover-subtitle {
      font-size: 1.2em;
      font-weight: 400;
      color: ${mutedColor};
      margin: 0 0 1.2em 0;
    }

    .pdf-cover-divider {
      height: 3px;
      width: 50px;
      background-color: ${isMono ? fgColor : "#6366f1"};
      margin-bottom: 2em;
    }

    .pdf-cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      max-width: 440px;
      padding-top: 1.2em;
      border-top: 1px solid ${borderColor};
    }

    .pdf-cover-meta-item .label {
      display: block;
      font-size: 0.7em;
      text-transform: uppercase;
      font-weight: 600;
      color: ${mutedColor};
      letter-spacing: 0.05em;
    }

    .pdf-cover-meta-item .val {
      display: block;
      font-size: 0.9em;
      font-weight: 600;
      color: ${fgColor};
      margin-top: 2px;
    }

    /* Table of Contents */
    .pdf-toc-card {
      margin-bottom: 2em;
      padding: 16px 0;
      page-break-after: always;
      break-after: page;
    }

    .pdf-toc-heading {
      font-size: 1.4em;
      font-weight: 700;
      margin-bottom: 0.8em;
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 0.25em;
    }

    .pdf-toc-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .pdf-toc-item {
      display: flex;
      align-items: baseline;
      font-size: 0.9em;
    }

    .pdf-toc-level-1 { font-weight: 600; margin-top: 5px; }
    .pdf-toc-level-2 { padding-left: 14px; color: ${mutedColor}; font-size: 0.88em; }
    .pdf-toc-level-3 { padding-left: 28px; color: ${mutedColor}; font-size: 0.84em; }

    .pdf-toc-item-title {
      white-space: nowrap;
    }

    .pdf-toc-dots {
      flex: 1;
      border-bottom: 1px dotted ${borderColor};
      margin: 0 8px;
      height: 1px;
    }

    .pdf-page-break {
      page-break-after: always;
      break-after: page;
      height: 0;
      visibility: hidden;
    }

    /* Header & Footer on printed sheets */
    .pdf-page-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.72em;
      color: ${mutedColor};
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 4px;
      margin-bottom: 12px;
    }

    .pdf-page-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.72em;
      color: ${mutedColor};
      border-top: 1px solid ${borderColor};
      padding-top: 4px;
      margin-top: 18px;
    }
  `;
}

/**
 * Calculates page breaks by inspecting DOM element boundaries in the document clone,
 * ensuring table rows, headings, code boxes, callouts, and math displays are never bisected.
 */
export function calculateSmartPageBreaks(
  contentEl: HTMLElement,
  maxPageHeightPx: number
): number[] {
  const totalHeightPx = Math.max(contentEl.scrollHeight, contentEl.offsetHeight);
  if (totalHeightPx <= maxPageHeightPx) {
    return [0, totalHeightPx];
  }

  const containerRect = contentEl.getBoundingClientRect();

  // Candidate selectors that should avoid being split or serve as break boundaries
  const candidateSelectors = [
    ".pdf-cover-page",
    ".pdf-toc-card",
    ".pdf-page-break",
    ".pdf-heading",
    "tr",
    ".pdf-code-container",
    ".pdf-code-line",
    ".pdf-callout",
    ".pdf-blockquote",
    ".pdf-math-display",
    ".pdf-diagram-wrapper",
    ".pdf-image-container",
    ".pdf-paragraph",
    "li",
  ];

  const elements = Array.from(
    contentEl.querySelectorAll<HTMLElement>(candidateSelectors.join(", "))
  );

  interface Box {
    el: HTMLElement;
    top: number;
    bottom: number;
    height: number;
    isCover: boolean;
    isToc: boolean;
    isPageBreak: boolean;
    isRow: boolean;
    isHeading: boolean;
    isBlock: boolean;
    isCodeLine: boolean;
  }

  const boxes: Box[] = elements.map((el) => {
    const rect = el.getBoundingClientRect();
    const top = Math.round(rect.top - containerRect.top);
    const height = Math.round(rect.height);
    return {
      el,
      top,
      bottom: top + height,
      height,
      isCover: el.classList.contains("pdf-cover-page"),
      isToc: el.classList.contains("pdf-toc-card"),
      isPageBreak: el.classList.contains("pdf-page-break"),
      isRow: el.tagName.toLowerCase() === "tr",
      isHeading: el.classList.contains("pdf-heading") || /^H[1-6]$/.test(el.tagName),
      isBlock:
        el.classList.contains("pdf-callout") ||
        el.classList.contains("pdf-diagram-wrapper") ||
        el.classList.contains("pdf-image-container") ||
        el.classList.contains("pdf-math-display") ||
        el.classList.contains("pdf-code-container"),
      isCodeLine: el.classList.contains("pdf-code-line"),
    };
  });

  const breaks: number[] = [0];
  let currentY = 0;

  while (currentY < totalHeightPx) {
    const maxTargetY = currentY + maxPageHeightPx;
    if (maxTargetY >= totalHeightPx) {
      breaks.push(totalHeightPx);
      break;
    }

    // 1. Explicit forced page breaks (cover page, toc card, explicit page break)
    const explicit = boxes.find(
      (b) =>
        (b.isCover || b.isToc || b.isPageBreak) &&
        b.bottom > currentY + 60 &&
        b.bottom <= maxTargetY
    );
    if (explicit) {
      currentY = explicit.bottom;
      breaks.push(currentY);
      continue;
    }

    // 2. Find natural break point <= maxTargetY
    let bestCutY = maxTargetY;
    let snapped = false;

    // A. Check for table rows crossing maxTargetY
    const crossingRow = boxes.find(
      (b) => b.isRow && b.top < maxTargetY && b.bottom > maxTargetY
    );
    if (crossingRow && crossingRow.top > currentY + 80) {
      bestCutY = crossingRow.top;
      snapped = true;
    }

    // B. Check for headings crossing or orphan headings within 85px of page bottom
    if (!snapped) {
      const orphanHeading = boxes.find(
        (b) =>
          b.isHeading &&
          b.top > currentY + 80 &&
          b.top < maxTargetY &&
          maxTargetY - b.top < 85
      );
      if (orphanHeading) {
        bestCutY = orphanHeading.top;
        snapped = true;
      }
    }

    // C. Check for blocks (callouts, diagrams, images, math, code blocks)
    if (!snapped) {
      const crossingBlock = boxes.find(
        (b) => b.isBlock && b.top < maxTargetY && b.bottom > maxTargetY
      );
      if (crossingBlock) {
        if (crossingBlock.height <= maxPageHeightPx && crossingBlock.top > currentY + 80) {
          bestCutY = crossingBlock.top;
          snapped = true;
        } else if (crossingBlock.el.classList.contains("pdf-code-container")) {
          // For long code containers, find the code line crossing maxTargetY
          const crossingLine = boxes.find(
            (b) => b.isCodeLine && b.top < maxTargetY && b.bottom > maxTargetY
          );
          if (crossingLine && crossingLine.top > currentY + 80) {
            bestCutY = crossingLine.top;
            snapped = true;
          }
        }
      }
    }

    // D. Check for list items
    if (!snapped) {
      const crossingLi = boxes.find(
        (b) => b.el.tagName.toLowerCase() === "li" && b.top < maxTargetY && b.bottom > maxTargetY
      );
      if (crossingLi && crossingLi.top > currentY + 60) {
        bestCutY = crossingLi.top;
        snapped = true;
      }
    }

    // Ensure progress: never cut less than 120px from currentY
    if (bestCutY <= currentY + 120) {
      bestCutY = maxTargetY;
    }

    currentY = bestCutY;
    breaks.push(currentY);
  }

  return breaks;
}

/**
 * Executes high-performance client-side PDF document generation using jsPDF and html2canvas.
 * Uses element-aware page break snapping, dedicated header/footer margin reservation,
 * and responsive event-loop yielding to maintain 60 FPS without freezing the browser.
 */
export async function generatePdfFile(
  containerEl: HTMLElement,
  config: PdfEngineConfig
): Promise<void> {
  const {
    fileName,
    pageSize = "a4",
    orientation = "portrait",
    margin = "normal",
    onProgress,
  } = config;

  onProgress?.("Preparing publication-grade document layout…");
  await new Promise((r) => setTimeout(r, 16));

  // Page dimensions in mm
  const pageSpec = PAGE_SPECS[pageSize][orientation];
  const marginMm = MARGIN_SPECS[margin];

  // Printable content dimensions in mm
  const contentWidthMm = Math.max(20, pageSpec.widthMm - marginMm.leftMm - marginMm.rightMm);
  const contentHeightMm = Math.max(20, pageSpec.heightMm - marginMm.topMm - marginMm.bottomMm);

  // Target content width in pixels at standard 96 DPI: 1mm ~= 3.7795px
  // We use contentWidthMm * 4.0 for crisp high-DPI font rasterization
  const targetContentWidthPx = Math.round(contentWidthMm * 4.0);
  const maxPageHeightPx = Math.round(
    (targetContentWidthPx * contentHeightMm) / contentWidthMm
  );

  // Initialize jsPDF document
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: pageSize,
    compress: true,
  });

  // Extract the inner compiled document or containerEl
  const compiledContentEl =
    containerEl.querySelector<HTMLElement>(".pdf-compiled-document") ||
    containerEl.querySelector<HTMLElement>("[dangerouslySetInnerHTML]") ||
    containerEl;

  // Create an off-screen clone with exact printable content width, transform: none
  const clone = document.createElement("div");
  clone.className = "pdf-root-container";
  clone.style.width = `${targetContentWidthPx}px`;
  clone.style.minWidth = `${targetContentWidthPx}px`;
  clone.style.maxWidth = `${targetContentWidthPx}px`;
  clone.style.padding = "0";
  clone.style.margin = "0";
  clone.style.position = "fixed";
  clone.style.left = "-9999px";
  clone.style.top = "0";
  clone.style.zIndex = "-999";
  clone.style.pointerEvents = "none";
  clone.style.backgroundColor = config.colorMode === "dark" ? "#121215" : "#ffffff";
  clone.style.color = config.colorMode === "dark" ? "#f4f4f6" : "#1a1a1d";

  const styleEl = document.createElement("style");
  styleEl.id = "pdf-engine-stylesheet";
  styleEl.textContent = buildPdfStylesheet(config);
  clone.appendChild(styleEl);

  const contentClone = compiledContentEl.cloneNode(true) as HTMLElement;
  // Ensure any preview-only header or footer elements are stripped from clone
  contentClone.querySelectorAll(".pdf-page-header, .pdf-page-footer").forEach((el) => el.remove());
  contentClone.style.padding = "0";
  contentClone.style.margin = "0";
  contentClone.style.width = "100%";
  clone.appendChild(contentClone);

  document.body.appendChild(clone);

  try {
    // Allow browser layout engine to paint clone, compute fonts, KaTeX formulas and diagrams
    await new Promise((r) => setTimeout(r, 100));

    onProgress?.("Calculating smart element-aware page boundaries…");
    await new Promise((r) => setTimeout(r, 16));

    const pageBreaks = calculateSmartPageBreaks(contentClone, maxPageHeightPx);
    const totalPages = Math.max(1, pageBreaks.length - 1);

    // Group pages into chunks (~4-5 pages per chunk) to prevent canvas height overflow and memory spikes
    const pagesPerChunk = Math.max(1, Math.floor(5500 / maxPageHeightPx));
    const totalChunks = Math.ceil(totalPages / pagesPerChunk);

    let globalPageIdx = 0;
    const cleanTitle = fileName.replace(/\.[^/.]+$/, "") || "Document";
    const html2canvas = (await import("html2canvas")).default;

    for (let c = 0; c < totalChunks; c++) {
      const startPage = c * pagesPerChunk;
      const endPage = Math.min(totalPages, (c + 1) * pagesPerChunk);
      const chunkStartY = pageBreaks[startPage]!;
      const chunkEndY = pageBreaks[endPage]!;
      const chunkHeight = Math.max(10, chunkEndY - chunkStartY);

      const percent = Math.round((startPage / totalPages) * 100);
      onProgress?.(
        `Synthesizing pages ${startPage + 1}–${endPage} of ${totalPages} (${percent}%)…`
      );
      // Yield to browser event loop to keep UI at 60 FPS
      await new Promise((r) => setTimeout(r, 16));

      const chunkCanvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: config.colorMode === "dark" ? "#121215" : "#ffffff",
        windowWidth: targetContentWidthPx,
        width: targetContentWidthPx,
        x: 0,
        y: chunkStartY,
        height: chunkHeight,
        onclone: (clonedDoc: Document) => {
          // Fast strip of external app stylesheets containing unsupported CSS
          const allStyles = Array.from(
            clonedDoc.querySelectorAll("style, link[rel='stylesheet']")
          );
          allStyles.forEach((el) => {
            const isPdfStyle =
              el.id === "pdf-engine-stylesheet" ||
              el.textContent?.includes(".pdf-compiled-document");
            const isKatex =
              (el as HTMLLinkElement).href?.includes("katex") ||
              el.textContent?.includes(".katex");
            if (!isPdfStyle && !isKatex) {
              el.remove();
            }
          });
        },
      });

      // Render each page slice from this chunk canvas
      for (let p = startPage; p < endPage; p++) {
        if (globalPageIdx > 0) {
          doc.addPage(pageSize, orientation);
        }

        const slicePageStartY = pageBreaks[p]!;
        const slicePageEndY = pageBreaks[p + 1]!;
        const sliceHeightPx = Math.max(1, slicePageEndY - slicePageStartY);

        const canvasSliceStartY = (slicePageStartY - chunkStartY) * 2;
        const canvasSliceHeight = sliceHeightPx * 2;

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = chunkCanvas.width;
        pageCanvas.height = Math.max(1, canvasSliceHeight);
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = config.colorMode === "dark" ? "#121215" : "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            chunkCanvas,
            0,
            canvasSliceStartY,
            chunkCanvas.width,
            canvasSliceHeight,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );
        }

        // Calculate rendered content height in mm on the PDF page
        const renderedHeightMm =
          (sliceHeightPx * contentWidthMm) / targetContentWidthPx;

        // Draw content slice strictly inside printable margins
        doc.addImage(
          pageCanvas,
          "JPEG",
          marginMm.leftMm,
          marginMm.topMm,
          contentWidthMm,
          renderedHeightMm,
          undefined,
          "FAST"
        );

        const isCoverPage = p === 0 && config.includeCoverPage;

        // Running Header (only on non-cover pages, from page 2 onwards or when configured)
        if (config.showHeaderTitle && !isCoverPage && globalPageIdx > 0 && marginMm.topMm >= 8) {
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          const headerY = marginMm.topMm - 4;
          doc.text(cleanTitle, marginMm.leftMm, headerY, { align: "left" });
          if (config.showDate) {
            doc.text(
              new Date().toLocaleDateString(),
              pageSpec.widthMm - marginMm.rightMm,
              headerY,
              { align: "right" }
            );
          }
        }

        // Running Footer (on all non-cover pages when bottom margin allows)
        if (config.showPageNumbers && !isCoverPage && marginMm.bottomMm >= 8) {
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          const footerY = pageSpec.heightMm - marginMm.bottomMm + 5;
          doc.text("Netherite Sovereign Studio", marginMm.leftMm, footerY, { align: "left" });
          doc.text(
            `Page ${globalPageIdx + 1} of ${totalPages}`,
            pageSpec.widthMm - marginMm.rightMm,
            footerY,
            { align: "right" }
          );
        }

        // Yield to event loop to keep browser responsive at 60 FPS
        await new Promise((r) => setTimeout(r, 12));
        globalPageIdx++;
      }
    }

    onProgress?.("Finalizing and saving PDF…");
    await new Promise((r) => setTimeout(r, 16));

    doc.save(`${cleanTitle}.pdf`);
    onProgress?.("Download complete!");
  } finally {
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}
