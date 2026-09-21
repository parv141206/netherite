"use client";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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
  wide: { topMm: 24, bottomMm: 24, leftMm: 28, rightMm: 28 },
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
  const calloutNoteBg = isDark ? "#1e293b" : isMono ? "#f5f5f5" : "#f0f9ff";
  const calloutTipBg = isDark ? "#143328" : isMono ? "#f5f5f5" : "#f0fdf4";
  const calloutWarnBg = isDark ? "#382914" : isMono ? "#f5f5f5" : "#fefce8";
  const calloutDangerBg = isDark ? "#381919" : isMono ? "#f5f5f5" : "#fef2f2";
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

    body, .pdf-root-container {
      margin: 0;
      padding: 0;
      background-color: ${bgColor};
      color: ${fgColor};
      font-family: ${fontFamily};
      font-size: ${baseFontSize};
      line-height: 1.65;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
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
      margin-top: 1.6em;
      margin-bottom: 0.5em;
      page-break-after: avoid;
      break-after: avoid;
    }

    .pdf-heading-num {
      color: ${isMono ? fgColor : "#6366f1"};
      margin-right: 0.35em;
      font-weight: 600;
    }

    .pdf-h1 {
      font-size: 1.85em;
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 0.3em;
      margin-top: 0.8em;
    }

    .pdf-h2 {
      font-size: 1.45em;
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 0.25em;
    }

    .pdf-h3 { font-size: 1.2em; }
    .pdf-h4 { font-size: 1.05em; }
    .pdf-h5 { font-size: 0.95em; }
    .pdf-h6 { font-size: 0.85em; text-transform: uppercase; color: ${mutedColor}; }

    /* Paragraphs & Text */
    .pdf-paragraph {
      margin-top: 0;
      margin-bottom: 1em;
      color: ${fgColor};
      text-align: ${themePreset === "academic" ? "justify" : "left"};
      hyphens: auto;
    }

    /* Mathematical Formulas (KaTeX) */
    .pdf-math-display {
      margin: 1.2em 0;
      padding: 0.8em 0;
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
      font-size: 1.08em;
      color: ${fgColor};
    }

    /* Diagrams & SVGs */
    .pdf-diagram-wrapper {
      margin: 1.5em auto;
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
      margin: 1.5em 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-image {
      max-width: 100%;
      max-height: 480px;
      height: auto;
      border-radius: 8px;
      border: 1px solid ${borderColor};
      display: inline-block;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .pdf-figcaption {
      margin-top: 0.5em;
      font-size: 0.85em;
      color: ${mutedColor};
      font-style: italic;
    }

    /* Code Blocks */
    .pdf-code-container {
      margin: 1.3em 0;
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
      padding: 6px 12px;
      background-color: ${isDark ? "#202026" : isMono ? "#e5e5e5" : "#f1f5f9"};
      border-bottom: 1px solid ${borderColor};
      font-size: 0.75em;
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
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .pdf-code-dots .red { background-color: #ef4444; }
    .pdf-code-dots .yellow { background-color: #f59e0b; }
    .pdf-code-dots .green { background-color: #10b981; }

    .pdf-code-pre {
      margin: 0;
      padding: 10px 0;
      overflow-x: auto;
      font-size: 0.88em;
      line-height: 1.5;
    }

    .pdf-code-line {
      display: flex;
      padding: 0 12px;
    }

    .pdf-code-line-num {
      width: 34px;
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

    .pdf-inline-code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.88em;
      padding: 0.15em 0.4em;
      background-color: ${codeBg};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      color: ${isMono ? fgColor : isDark ? "#e2e8f0" : "#0f172a"};
    }

    /* Tables */
    .pdf-table-wrapper {
      margin: 1.4em 0;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92em;
      border: 1px solid ${borderColor};
    }

    .pdf-table th {
      background-color: ${isDark ? "#202026" : isMono ? "#e5e5e5" : "#f1f5f9"};
      color: ${fgColor};
      font-weight: 600;
      padding: 8px 12px;
      border: 1px solid ${borderColor};
    }

    .pdf-table td {
      padding: 8px 12px;
      border: 1px solid ${borderColor};
    }

    .pdf-row-zebra td {
      background-color: ${tableZebraBg};
    }

    /* Callouts / Alerts */
    .pdf-callout {
      margin: 1.3em 0;
      padding: 12px 16px;
      border-left: 4px solid;
      border-radius: 0 8px 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pdf-callout-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 0.85em;
      margin-bottom: 6px;
      letter-spacing: 0.04em;
    }

    .pdf-callout-note { background-color: ${calloutNoteBg}; border-color: #3b82f6; color: ${isDark ? "#93c5fd" : "#1e40af"}; }
    .pdf-callout-tip { background-color: ${calloutTipBg}; border-color: #10b981; color: ${isDark ? "#86efac" : "#166534"}; }
    .pdf-callout-important { background-color: ${calloutNoteBg}; border-color: #8b5cf6; color: ${isDark ? "#c4b5fd" : "#5b21b6"}; }
    .pdf-callout-warning { background-color: ${calloutWarnBg}; border-color: #f59e0b; color: ${isDark ? "#fde68a" : "#854d0e"}; }
    .pdf-callout-caution { background-color: ${calloutDangerBg}; border-color: #ef4444; color: ${isDark ? "#fca5a5" : "#991b1b"}; }

    .pdf-callout-body {
      font-size: 0.94em;
      color: ${fgColor};
      line-height: 1.55;
    }

    /* Blockquotes */
    .pdf-blockquote {
      margin: 1.2em 0;
      padding: 8px 16px;
      border-left: 3px solid ${borderColor};
      color: ${mutedColor};
      font-style: italic;
    }

    /* Lists */
    .pdf-ul, .pdf-ol {
      margin: 0.8em 0;
      padding-left: 1.8em;
    }

    .pdf-li-bullet, .pdf-li-number {
      margin-bottom: 0.35em;
    }

    /* Task items */
    .pdf-task-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0.35em 0;
    }

    .pdf-checkbox {
      font-size: 1.1em;
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
      margin: 2em 0;
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
      padding: 40px 0;
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
      margin-bottom: 1.2em;
    }

    .pdf-cover-title {
      font-size: 2.8em;
      font-weight: 800;
      line-height: 1.15;
      margin: 0 0 0.3em 0;
      color: ${fgColor};
    }

    .pdf-cover-subtitle {
      font-size: 1.3em;
      font-weight: 400;
      color: ${mutedColor};
      margin: 0 0 1.5em 0;
    }

    .pdf-cover-divider {
      height: 3px;
      width: 60px;
      background-color: ${isMono ? fgColor : "#6366f1"};
      margin-bottom: 2.5em;
    }

    .pdf-cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      max-width: 440px;
      padding-top: 1.5em;
      border-top: 1px solid ${borderColor};
    }

    .pdf-cover-meta-item .label {
      display: block;
      font-size: 0.72em;
      text-transform: uppercase;
      font-weight: 600;
      color: ${mutedColor};
      letter-spacing: 0.05em;
    }

    .pdf-cover-meta-item .val {
      display: block;
      font-size: 0.92em;
      font-weight: 600;
      color: ${fgColor};
      margin-top: 2px;
    }

    /* Table of Contents */
    .pdf-toc-card {
      margin-bottom: 2.5em;
      padding: 20px 0;
      page-break-after: always;
      break-after: page;
    }

    .pdf-toc-heading {
      font-size: 1.5em;
      font-weight: 700;
      margin-bottom: 1em;
      border-bottom: 2px solid ${borderColor};
      padding-bottom: 0.3em;
    }

    .pdf-toc-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .pdf-toc-item {
      display: flex;
      align-items: baseline;
      font-size: 0.92em;
    }

    .pdf-toc-level-1 { font-weight: 600; margin-top: 6px; }
    .pdf-toc-level-2 { padding-left: 16px; color: ${mutedColor}; font-size: 0.88em; }
    .pdf-toc-level-3 { padding-left: 32px; color: ${mutedColor}; font-size: 0.84em; }

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
      font-size: 0.75em;
      color: ${mutedColor};
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 4px;
      margin-bottom: 16px;
    }

    .pdf-page-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.75em;
      color: ${mutedColor};
      border-top: 1px solid ${borderColor};
      padding-top: 4px;
      margin-top: 24px;
    }
  `;
}

/**
 * Executes direct in-house client-side PDF document generation using jsPDF and html2canvas.
 * Downloads the resulting `.pdf` file directly to the user's computer.
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

  onProgress?.("Rendering math, diagrams, and high-resolution typography…");

  // Page dimensions in mm
  const pageSpec = PAGE_SPECS[pageSize][orientation];
  const marginMm = MARGIN_SPECS[margin];

  // Printable area inside margins in mm
  const printWidthMm = pageSpec.widthMm - marginMm.leftMm - marginMm.rightMm;
  const printHeightMm = pageSpec.heightMm - marginMm.topMm - marginMm.bottomMm;

  // Initialize jsPDF document
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: pageSize,
    compress: true,
  });

  onProgress?.("Synthesizing document canvas…");

  // Render container using html2canvas with scale: 2 for sharp retina rendering
  const canvas = await html2canvas(containerEl, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: config.colorMode === "dark" ? "#121215" : "#ffffff",
    windowWidth: containerEl.scrollWidth,
  });

  onProgress?.("Slicing multi-page sheets…");

  const imgWidth = printWidthMm;
  const imgHeight = (canvas.height * printWidthMm) / canvas.width;

  let heightLeft = imgHeight;
  let position = marginMm.topMm;
  let pageNumber = 1;

  // Render first page
  const pageImgData = canvas.toDataURL("image/jpeg", 0.95);
  doc.addImage(
    pageImgData,
    "JPEG",
    marginMm.leftMm,
    position,
    imgWidth,
    imgHeight,
    undefined,
    "FAST"
  );

  // Inset footer on first page
  if (config.showPageNumbers) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${pageNumber}`,
      pageSpec.widthMm - marginMm.rightMm,
      pageSpec.heightMm - 8,
      { align: "right" }
    );
  }

  heightLeft -= printHeightMm;

  // Generate subsequent pages
  while (heightLeft > 0) {
    onProgress?.(`Generating Page ${pageNumber + 1}…`);
    position = heightLeft - imgHeight + marginMm.topMm;
    doc.addPage(pageSize, orientation);
    pageNumber++;

    doc.addImage(
      pageImgData,
      "JPEG",
      marginMm.leftMm,
      position,
      imgWidth,
      imgHeight,
      undefined,
      "FAST"
    );

    // Running Header
    if (config.showHeaderTitle) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        config.fileName.replace(/\.[^/.]+$/, ""),
        marginMm.leftMm,
        8,
        { align: "left" }
      );
    }

    // Running Footer
    if (config.showPageNumbers) {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${pageNumber}`,
        pageSpec.widthMm - marginMm.rightMm,
        pageSpec.heightMm - 8,
        { align: "right" }
      );
    }

    heightLeft -= printHeightMm;
  }

  onProgress?.("Finalizing and saving PDF…");

  const cleanName = fileName.replace(/\.[^/.]+$/, "") || "Document";
  doc.save(`${cleanName}.pdf`);
  onProgress?.("Download complete!");
}
