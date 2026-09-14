"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Printer,
  Eye,
  Type,
  Palette,
  Layout,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTheme, type MdThemeId, type GlobalFontId } from "~/components/ThemeProvider";
import { AppleSpinner } from "~/components/ui/AppleSpinner";

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileType?: "markdown" | "mermaid" | "uml" | "drawing" | "image" | "tikz";
  content?: string;
  svgContent?: string;
}

export function PdfExportModal({
  isOpen,
  onClose,
  fileName,
  fileType = "markdown",
  content = "",
  svgContent = "",
}: PdfExportModalProps) {
  const { mdTheme: activeMdTheme, globalFont: activeGlobalFont } = useTheme();

  // Customization Options
  const [themePreset, setThemePreset] = useState<"inherit" | "print-clean" | MdThemeId>("print-clean");
  const [colorMode, setColorMode] = useState<"light" | "dark" | "monochrome">("light");
  const [fontChoice, setFontChoice] = useState<"inherit" | GlobalFontId>("inherit");
  const [baseFontSize, setBaseFontSize] = useState<"13px" | "15px" | "17px">("15px");
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "legal">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    fileType === "mermaid" || fileType === "uml" || fileType === "drawing" || fileType === "tikz" ? "landscape" : "portrait"
  );
  const [margin, setMargin] = useState<"normal" | "compact" | "wide" | "none">("normal");

  // Headers & Footers
  const [showHeaderTitle, setShowHeaderTitle] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [customSubtitle, setCustomSubtitle] = useState("");

  // Content formatting
  const [styleTables, setStyleTables] = useState(true);
  const [avoidPageBreaks, setAvoidPageBreaks] = useState(true);

  // Preview & Print States
  const [previewZoom, setPreviewZoom] = useState<number>(0.85);
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const cleanTitle = fileName.replace(/\.[^/.]+$/, "") || "Document";

  // Capture live rendered HTML if Markdown
  useEffect(() => {
    if (!isOpen) return;

    if (fileType === "markdown") {
      // If editor DOM is live in window, extract clean prose HTML
      const proseEl = document.querySelector(".ProseMirror");
      if (proseEl) {
        // Clone and sanitize
        const clone = proseEl.cloneNode(true) as HTMLElement;
        // Clean out editing helpers
        clone.querySelectorAll(".cm-editor, .ProseMirror-selectednode, [data-bubble-menu]").forEach((el) => el.remove());
        setRenderedHtml(clone.innerHTML);
      } else if (content) {
        // Fallback: simple basic formatting
        setRenderedHtml(
          content
            .split("\n\n")
            .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
            .join("")
        );
      }
    }
  }, [isOpen, fileType, content]);

  if (!isOpen) return null;

  const effectiveFontId = fontChoice === "inherit" ? activeGlobalFont : fontChoice;

  const getFontFamily = (fId: GlobalFontId) => {
    switch (fId) {
      case "crafty-girls":
        return "'Crafty Girls', cursive, sans-serif";
      case "excalifont":
        return "'Excalifont', cursive, sans-serif";
      case "literata":
        return "var(--font-literata), 'Literata', Georgia, serif";
      case "playfair":
        return "'Playfair Display', Georgia, serif";
      case "lora":
        return "'Lora', Georgia, serif";
      case "merriweather":
        return "'Merriweather', Georgia, serif";
      case "outfit":
        return "'Outfit', sans-serif";
      case "inter":
        return "'Inter', sans-serif";
      case "jakarta":
        return "'Plus Jakarta Sans', sans-serif";
      case "dm-sans":
        return "'DM Sans', sans-serif";
      case "jetbrains":
        return "'JetBrains Mono', monospace";
      case "fira":
        return "'Fira Code', monospace";
      case "space-mono":
        return "'Space Mono', monospace";
      default:
        return "var(--font-sans), ui-sans-serif, system-ui, sans-serif";
    }
  };

  const getMarginMm = (m: string) => {
    switch (m) {
      case "compact":
        return "10mm";
      case "wide":
        return "30mm";
      case "none":
        return "5mm";
      default:
        return "20mm";
    }
  };

  const getPageDimensions = () => {
    let w = 210;
    let h = 297;
    if (pageSize === "letter") {
      w = 216;
      h = 279;
    } else if (pageSize === "legal") {
      w = 216;
      h = 356;
    }
    if (orientation === "landscape") {
      return { width: `${h}mm`, height: `${w}mm`, aspectRatio: `${h}/${w}` };
    }
    return { width: `${w}mm`, height: `${h}mm`, aspectRatio: `${w}/${h}` };
  };

  // Build the complete standalone printable HTML document
  const buildPrintDocument = () => {
    const marginMm = getMarginMm(margin);
    const fontCss = getFontFamily(effectiveFontId);
    const isCleanPrint = themePreset === "print-clean";
    const isDarkPdf = colorMode === "dark";
    const isMonochrome = colorMode === "monochrome";

    const bgColor = isDarkPdf ? "#121215" : isCleanPrint || isMonochrome ? "#ffffff" : "#fdfcfc";
    const fgColor = isDarkPdf ? "#f4f4f5" : isMonochrome ? "#000000" : "#18181b";
    const borderColor = isDarkPdf ? "#27272a" : isMonochrome ? "#000000" : "#e4e4e7";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${cleanTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Crafty+Girls&family=Inter:wght@400;600;700&family=Outfit:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,700;1,7..72,400&family=Playfair+Display:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;600&family=Fira+Code:wght@400;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
  <style>
    @font-face {
      font-family: 'Excalifont';
      src: url('/Excalifont-Regular.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }

    @page {
      size: ${pageSize.toUpperCase()} ${orientation};
      margin: ${marginMm};
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: ${fontCss};
      font-size: ${baseFontSize};
      line-height: 1.65;
      color: ${fgColor};
      background-color: ${bgColor};
    }

    .doc-container {
      width: 100%;
      margin: 0 auto;
    }

    /* Running Header & Footer */
    .print-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid ${borderColor};
      font-size: 11px;
      color: ${isDarkPdf ? "#a1a1aa" : "#71717a"};
    }
    .print-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      margin-top: 32px;
      border-top: 1px solid ${borderColor};
      font-size: 10px;
      color: ${isDarkPdf ? "#a1a1aa" : "#71717a"};
    }

    h1, h2, h3, h4, h5, h6 {
      color: ${fgColor};
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      font-weight: 700;
      line-height: 1.25;
      ${avoidPageBreaks ? "page-break-after: avoid; break-after: avoid;" : ""}
    }
    h1 { font-size: 2em; border-bottom: 1px solid ${borderColor}; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }

    p { margin-top: 0; margin-bottom: 1em; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      ${avoidPageBreaks ? "page-break-inside: avoid; break-inside: avoid;" : ""}
    }
    th, td {
      border: 1px solid ${borderColor};
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background-color: ${isDarkPdf ? "#27272a" : isMonochrome ? "#f4f4f5" : "#f1f5f9"};
      font-weight: 600;
    }
    ${styleTables && !isMonochrome ? `tr:nth-child(even) td { background-color: ${isDarkPdf ? "#1a1a1e" : "#fafafa"}; }` : ""}

    blockquote {
      margin: 1.5em 0;
      padding: 8px 16px;
      border-left: 4px solid ${borderColor};
      background: ${isDarkPdf ? "#1e1e24" : "#f9fafb"};
      color: ${isDarkPdf ? "#d4d4d8" : "#4b5563"};
      ${avoidPageBreaks ? "page-break-inside: avoid; break-inside: avoid;" : ""}
    }

    pre, code {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.9em;
    }
    pre {
      background-color: ${isDarkPdf ? "#18181b" : "#f4f4f5"};
      border: 1px solid ${borderColor};
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      margin: 1.2em 0;
      ${avoidPageBreaks ? "page-break-inside: avoid; break-inside: avoid;" : ""}
    }
    code:not(pre code) {
      background-color: ${isDarkPdf ? "#27272a" : "#f4f4f5"};
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid ${borderColor};
    }

    .mermaid-viewport, svg {
      max-width: 100%;
      height: auto;
      margin: 1.5em auto;
      display: block;
      ${avoidPageBreaks ? "page-break-inside: avoid; break-inside: avoid;" : ""}
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 1em;
      padding-left: 2em;
    }
    li { margin-bottom: 0.3em; }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      ${avoidPageBreaks ? "page-break-inside: avoid; break-inside: avoid;" : ""}
    }
  </style>
</head>
<body>
  <div class="doc-container">
    ${
      showHeaderTitle || showDate
        ? `<div class="print-header">
            <span>${showHeaderTitle ? cleanTitle : ""} ${customSubtitle ? `— ${customSubtitle}` : ""}</span>
            <span>${showDate ? new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}</span>
          </div>`
        : ""
    }

    ${
      fileType === "markdown"
        ? renderedHtml || `<div style="white-space: pre-wrap;">${content}</div>`
        : svgContent
        ? `<div style="display: flex; justify-content: center; align-items: center; min-height: 80vh;">
            ${svgContent}
          </div>`
        : `<div style="text-align: center; padding: 40px;">No printable content available.</div>`
    }

    ${
      showPageNumbers
        ? `<div class="print-footer">
            <span>Generated with Netherite Sovereign Studio</span>
            <span>Netherite Sovereign Drive Document</span>
          </div>`
        : ""
    }
  </div>
</body>
</html>
    `;
  };

  // Trigger Native High-DPI Browser Print to PDF
  const handlePrint = () => {
    setIsGenerating(true);
    const docHtml = buildPrintDocument();

    let iframe = iframeRef.current;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      iframeRef.current = iframe;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      setIsGenerating(false);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(docHtml);
    iframeDoc.close();

    // Allow fonts, math, and SVGs to layout before triggering print dialog
    setTimeout(() => {
      setIsGenerating(false);
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Print invocation error:", err);
      }
    }, 500);
  };

  const pageDims = getPageDimensions();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[860px] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-foreground truncate max-w-[240px] sm:max-w-md">
                  Export PDF Document
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-semibold">
                  {fileType}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Print, format and save vector PDF to your device or Google Drive
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile Tab Switcher */}
            <div className="flex sm:hidden items-center border border-border rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-2.5 py-1 ${activeTab === "preview" ? "bg-accent font-medium text-foreground" : "text-muted-foreground"}`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-2.5 py-1 ${activeTab === "settings" ? "bg-accent font-medium text-foreground" : "text-muted-foreground"}`}
              >
                Options
              </button>
            </div>

            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isGenerating ? "Preparing..." : "Print / Save PDF"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (2 Columns on desktop) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Comprehensive PDF Settings */}
          <div
            className={`w-full sm:w-[340px] lg:w-[380px] border-r border-border p-4 space-y-5 overflow-y-auto shrink-0 bg-background/50 ${
              activeTab === "preview" ? "hidden sm:block" : "block"
            }`}
          >
            {/* 1. Theme & Appearance */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span>Theme & Palette</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "print-clean", label: "Clean Print (B&W)" },
                  { id: "inherit", label: "Current Workspace" },
                  { id: "netherite", label: "Netherite" },
                  { id: "pookie", label: "Pookie Mode" },
                  { id: "nord", label: "Nordic Frost" },
                  { id: "solarized", label: "Amber Parchment" },
                  { id: "dracula", label: "Vampire Gothic" },
                  { id: "forest", label: "Botanical Sage" },
                  { id: "cyber", label: "Cyber Neon" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemePreset(t.id as any)}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium text-left truncate transition-all cursor-pointer ${
                      themePreset === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Color Mode */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Color Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "light", label: "Light (Print)" },
                  { id: "dark", label: "Dark (Digital)" },
                  { id: "monochrome", label: "Monochrome" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setColorMode(m.id as any)}
                    className={`py-1.5 text-center rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      colorMode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/70 hover:bg-accent/50 text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Typography Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-primary" />
                <span>Font Typography</span>
              </label>
              <select
                value={fontChoice}
                onChange={(e) => setFontChoice(e.target.value as any)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="inherit">Inherit Current Note Font</option>
                <optgroup label="Cursive & Handwritten">
                  <option value="crafty-girls">Girly</option>
                  <option value="excalifont">Excalifont</option>
                </optgroup>
                <optgroup label="Modern Sans">
                  <option value="inter">Inter (Clean)</option>
                  <option value="outfit">Outfit (Editorial)</option>
                  <option value="jakarta">Plus Jakarta Sans</option>
                  <option value="dm-sans">DM Sans</option>
                </optgroup>
                <optgroup label="Serif">
                  <option value="literata">Literata (Warm Serif)</option>
                  <option value="playfair">Playfair Display (Luxury)</option>
                  <option value="lora">Lora</option>
                  <option value="merriweather">Merriweather</option>
                </optgroup>
                <optgroup label="Monospace">
                  <option value="jetbrains">JetBrains Mono</option>
                  <option value="fira">Fira Code</option>
                </optgroup>
              </select>
            </div>

            {/* 4. Page Setup (Paper size, Orientation, Margins) */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-primary" />
                <span>Page Layout & Margins</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Page Size</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter (8.5 × 11 in)</option>
                    <option value="legal">Legal (8.5 × 14 in)</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1">Orientation</span>
                  <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as any)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block mb-1">Page Margins</span>
                <div className="grid grid-cols-4 gap-1 text-center">
                  {[
                    { id: "compact", label: "10mm" },
                    { id: "normal", label: "20mm" },
                    { id: "wide", label: "30mm" },
                    { id: "none", label: "5mm" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMargin(m.id as any)}
                      className={`py-1 rounded border text-[11px] font-mono transition-all cursor-pointer ${
                        margin === m.id
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Headers & Footers Toggles */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Headers & Footers
              </label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeaderTitle}
                    onChange={(e) => setShowHeaderTitle(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Include Document Title in Header</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDate}
                    onChange={(e) => setShowDate(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Include Current Date Timestamp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPageNumbers}
                    onChange={(e) => setShowPageNumbers(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Include Page Footer & Attribution</span>
                </label>
              </div>
              <input
                type="text"
                placeholder="Optional author / subtitle note..."
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary mt-1"
              />
            </div>

            {/* 6. Formatting & Inclusions */}
            {fileType === "markdown" && (
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Formatting Controls
                </label>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={avoidPageBreaks}
                      onChange={(e) => setAvoidPageBreaks(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Avoid breaks inside tables & diagrams</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={styleTables}
                      onChange={(e) => setStyleTables(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Alternating striped table rows</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Interactive Print & PDF Preview */}
          <div
            className={`flex-1 flex flex-col bg-muted/30 overflow-hidden ${
              activeTab === "settings" ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Preview Toolbar */}
            <div className="p-2 border-b border-border/60 flex items-center justify-between text-xs text-muted-foreground shrink-0 bg-background/40">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">Live PDF Sheet Preview</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                  {pageSize.toUpperCase()} • {orientation}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewZoom((z) => Math.max(0.4, z - 0.1))}
                  className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono w-10 text-center">{Math.round(previewZoom * 100)}%</span>
                <button
                  onClick={() => setPreviewZoom((z) => Math.min(1.4, z + 0.1))}
                  className="p-1 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewZoom(0.85)}
                  className="px-2 py-0.5 text-[10px] hover:bg-accent rounded text-muted-foreground hover:text-foreground ml-1 font-medium"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Simulated Paper Viewport */}
            <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
              <div
                style={{
                  width: pageDims.width,
                  minHeight: pageDims.height,
                  transform: `scale(${previewZoom})`,
                  transformOrigin: "top center",
                  backgroundColor: colorMode === "dark" ? "#121215" : "#ffffff",
                  color: colorMode === "dark" ? "#f4f4f5" : "#18181b",
                  fontFamily: getFontFamily(effectiveFontId),
                  fontSize: baseFontSize,
                  padding: getMarginMm(margin),
                  transition: "transform 0.15s ease-out",
                }}
                className="shadow-2xl border border-border/80 rounded-sm flex flex-col shrink-0 select-text overflow-hidden"
              >
                {/* Header in Preview */}
                {(showHeaderTitle || showDate) && (
                  <div className="flex justify-between items-center text-[11px] text-muted-foreground pb-2 mb-4 border-b border-border/60">
                    <span className="font-medium text-foreground truncate">
                      {showHeaderTitle ? cleanTitle : ""} {customSubtitle ? `— ${customSubtitle}` : ""}
                    </span>
                    <span className="font-mono text-[10px]">{showDate ? new Date().toLocaleDateString() : ""}</span>
                  </div>
                )}

                {/* Content in Preview */}
                <div className="flex-1 space-y-3">
                  {fileType === "markdown" ? (
                    renderedHtml ? (
                      <div
                        className="prose-pdf [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:border-b [&>h1]:border-border/60 [&>h1]:pb-2 [&>h2]:text-xl [&>h2]:font-semibold [&>p]:leading-relaxed [&>table]:w-full [&>table]:border-collapse [&>table_th]:border [&>table_th]:p-2 [&>table_td]:border [&>table_td]:p-2"
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">{content}</div>
                    )
                  ) : svgContent ? (
                    <div
                      className="w-full flex items-center justify-center py-6 [&>svg]:max-w-full [&>svg]:h-auto"
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Ready to format document.
                    </div>
                  )}
                </div>

                {/* Footer in Preview */}
                {showPageNumbers && (
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 mt-6 border-t border-border/60">
                    <span>Generated with Netherite Sovereign Studio</span>
                    <span>Page 1 of 1</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between shrink-0 bg-muted/20">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Uses native browser vector print pipeline for crisp 600+ DPI PDF generation
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <AppleSpinner size="xs" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              <span>{isGenerating ? "Preparing..." : "Print / Save as PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
