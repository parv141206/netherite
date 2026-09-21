"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Printer,
  Eye,
  Type,
  Layout,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  FileText,
  BookOpen,
  ListOrdered,
  Sparkles,
  Check,
} from "lucide-react";
import {
  compileMarkdownForPdf,
  type HeadingItem,
} from "~/lib/pdf/mdToPdfCompiler";
import {
  generatePdfFile,
  buildPdfStylesheet,
  PAGE_SPECS,
  MARGIN_SPECS,
  type PdfEngineConfig,
} from "~/lib/pdf/pdfEngine";

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  authorName?: string;
  fileType?: "markdown" | "mermaid" | "uml" | "drawing" | "image" | "tikz";
  content?: string;
  svgContent?: string;
}

export function PdfExportModal({
  isOpen,
  onClose,
  fileName,
  authorName = "Netherite Sovereign Author",
  fileType = "markdown",
  content = "",
  svgContent = "",
}: PdfExportModalProps) {
  // Document Presets & Design
  const [themePreset, setThemePreset] = useState<
    "academic" | "engineering" | "executive" | "monochrome"
  >("academic");
  const [colorMode, setColorMode] = useState<"light" | "dark" | "monochrome">(
    "light"
  );
  const [fontChoice, setFontChoice] = useState<string>("inter");
  const [baseFontSize, setBaseFontSize] = useState<
    "13px" | "14px" | "15px" | "16px"
  >("14px");
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "legal">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    fileType === "mermaid" ||
      fileType === "uml" ||
      fileType === "drawing" ||
      fileType === "tikz"
      ? "landscape"
      : "portrait"
  );
  const [margin, setMargin] = useState<"normal" | "compact" | "wide" | "none">(
    "normal"
  );

  // Document Structure Toggles
  const [includeCoverPage, setIncludeCoverPage] = useState(false);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(false);
  const [sectionNumbering, setSectionNumbering] = useState(true);
  const [showHeaderTitle, setShowHeaderTitle] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [customSubtitle, setCustomSubtitle] = useState("");

  // Compilation & Generation States
  const [isCompiling, setIsCompiling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [compiledHtml, setCompiledHtml] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [headings, setHeadings] = useState<HeadingItem[]>([]);

  // Preview & Viewport States
  const [previewZoom, setPreviewZoom] = useState<number>(0.8);
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");

  const previewSheetRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const cleanTitle = fileName.replace(/\.[^/.]+$/, "") || "Document";

  // Re-compile markdown into rich structured document whenever content or structural toggles change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsCompiling(true);

    if (fileType === "markdown") {
      void compileMarkdownForPdf(content, {
        title: cleanTitle,
        subtitle: customSubtitle,
        author: authorName,
        includeCoverPage,
        includeTableOfContents,
        sectionNumbering,
        isDark: colorMode === "dark",
      })
        .then((result) => {
          if (!isMounted) return;
          setCompiledHtml(result.html);
          setWordCount(result.wordCount);
          setReadingTime(result.readingTimeMinutes);
          setHeadings(result.headings);
          setIsCompiling(false);
        })
        .catch((err) => {
          console.error("PDF Markdown compilation failed:", err);
          if (isMounted) setIsCompiling(false);
        });
    } else {
      // Non-markdown diagrams (SVG, Excalidraw, TikZ)
      const rawSvg = svgContent || content || "";
      const diagramHtml = `
        <div class="pdf-compiled-document">
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 80vh; text-align: center;">
            <h1 class="pdf-heading pdf-h1" style="margin-bottom: 20px;">${cleanTitle}</h1>
            <div class="pdf-diagram-wrapper" style="width: 100%; max-width: 95%;">
              ${rawSvg}
            </div>
          </div>
        </div>
      `;
      setCompiledHtml(diagramHtml);
      setIsCompiling(false);
    }

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    content,
    svgContent,
    fileType,
    cleanTitle,
    customSubtitle,
    includeCoverPage,
    includeTableOfContents,
    sectionNumbering,
    colorMode,
    authorName,
  ]);

  if (!isOpen) return null;

  const fontOptions = [
    {
      id: "inter",
      label: "Inter (Modern Sans)",
      family: "'Inter', -apple-system, sans-serif",
    },
    {
      id: "jakarta",
      label: "Plus Jakarta Sans",
      family: "'Plus Jakarta Sans', sans-serif",
    },
    { id: "outfit", label: "Outfit (Editorial)", family: "'Outfit', sans-serif" },
    {
      id: "literata",
      label: "Literata (Academic Serif)",
      family: "'Literata', Georgia, serif",
    },
    {
      id: "playfair",
      label: "Playfair Display",
      family: "'Playfair Display', Georgia, serif",
    },
    { id: "lora", label: "Lora (Book Serif)", family: "'Lora', Georgia, serif" },
    {
      id: "jetbrains",
      label: "JetBrains Mono (Technical)",
      family: "'JetBrains Mono', monospace",
    },
    {
      id: "dm-sans",
      label: "DM Sans (Minimal)",
      family: "'DM Sans', sans-serif",
    },
  ];

  const currentFontFamily =
    fontOptions.find((f) => f.id === fontChoice)?.family ||
    fontOptions[0]!.family;

  const engineConfig: PdfEngineConfig = {
    fileName,
    pageSize,
    orientation,
    margin,
    colorMode,
    themePreset,
    fontFamily: currentFontFamily,
    baseFontSize,
    showHeaderTitle,
    showDate,
    showPageNumbers,
    customSubtitle,
  };

  const dynamicStylesheet = buildPdfStylesheet(engineConfig);

  // Trigger Direct Client-Side PDF Generation and File Download
  const handleDownloadPdf = async () => {
    if (!previewSheetRef.current || isExporting) return;
    setIsExporting(true);
    setExportProgress("Preparing document pages…");

    try {
      await generatePdfFile(previewSheetRef.current, {
        ...engineConfig,
        onProgress: (msg) => setExportProgress(msg),
      });
    } catch (err) {
      console.error("PDF Export generation failed:", err);
      alert("Could not generate PDF. Please try again or use Native Print.");
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };

  // Trigger High-DPI Native Print Spooler (for physical printer devices)
  const handleNativePrint = () => {
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
    if (!iframeDoc) return;

    const fullPrintDoc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${cleanTitle}</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
          <style>${dynamicStylesheet}</style>
        </head>
        <body class="pdf-root-container">
          <div style="padding: 10px;">
            ${compiledHtml}
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(fullPrintDoc);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (err) {
        console.error("Print spooler error:", err);
      }
    }, 400);
  };

  // Dimensions of a single sheet in preview
  const spec = PAGE_SPECS[pageSize][orientation];
  const sheetWidthPx = Math.round(spec.widthMm * 3.7795); // 1mm ~= 3.7795px at 96 DPI
  const sheetMinHeightPx = Math.round(spec.heightMm * 3.7795);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 backdrop-blur-md sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex h-[95vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl">
        {/* Header Bar */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-card/80 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground truncate max-w-[220px] sm:max-w-xs">
                  {cleanTitle}
                </h2>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  In-House PDF
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {wordCount} words • ~{readingTime} min read • {headings.length}{" "}
                sections
              </p>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-2">
            {/* Primary Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isCompiling || isExporting}
              className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>{exportProgress || "Generating PDF…"}</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Secondary Native Print */}
            <button
              onClick={handleNativePrint}
              disabled={isCompiling || isExporting}
              title="Send directly to physical printer spooler"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-accent cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Native Print</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Sidebar Controls + Live Sheet Preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Controls Sidebar */}
          <div className="w-80 shrink-0 overflow-y-auto border-r border-border/70 bg-card/40 p-4 space-y-5 custom-scrollbar text-xs">
            {/* 1. Publication Preset */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Document Preset</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  {
                    id: "academic",
                    label: "Academic Paper",
                    font: "literata",
                    desc: "Formal serif, justified",
                  },
                  {
                    id: "engineering",
                    label: "Engineering Spec",
                    font: "inter",
                    desc: "Clean sans, code badges",
                  },
                  {
                    id: "executive",
                    label: "Executive Brief",
                    font: "outfit",
                    desc: "Modern editorial",
                  },
                  {
                    id: "monochrome",
                    label: "Ink-Saver Mono",
                    font: "inter",
                    desc: "Pure 100% black/white",
                  },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setThemePreset(p.id as any);
                      setFontChoice(p.font);
                      if (p.id === "monochrome") {
                        setColorMode("monochrome");
                      } else if (colorMode === "monochrome") {
                        setColorMode("light");
                      }
                    }}
                    className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      themePreset === p.id
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 hover:bg-accent/40 text-foreground"
                    }`}
                  >
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Color Palette */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Color Palette
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "monochrome", label: "Monochrome" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setColorMode(m.id as any)}
                    className={`rounded-lg border py-1.5 text-center font-medium transition-all cursor-pointer ${
                      colorMode === m.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Typography & Size */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-primary" />
                <span>Typography</span>
              </label>
              <select
                value={fontChoice}
                onChange={(e) => setFontChoice(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
              >
                {fontOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-4 gap-1 pt-1">
                {(["13px", "14px", "15px", "16px"] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setBaseFontSize(sz)}
                    className={`rounded border py-1 text-center font-mono text-[11px] transition-all cursor-pointer ${
                      baseFontSize === sz
                        ? "border-primary bg-primary/10 text-primary font-bold"
                        : "border-border/60 hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Page Layout & Margins */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layout className="h-3.5 w-3.5 text-primary" />
                <span>Page Layout</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["a4", "letter", "legal"] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setPageSize(sz)}
                    className={`rounded-lg border py-1 text-center uppercase font-semibold transition-all cursor-pointer ${
                      pageSize === sz
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {(["portrait", "landscape"] as const).map((ori) => (
                  <button
                    key={ori}
                    onClick={() => setOrientation(ori)}
                    className={`rounded-lg border py-1 text-center capitalize font-medium transition-all cursor-pointer ${
                      orientation === ori
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {ori}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1">
                {(["compact", "normal", "wide"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMargin(m)}
                    className={`rounded border py-1 text-center capitalize text-[11px] transition-all cursor-pointer ${
                      margin === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Document Structure Options */}
            <div className="space-y-2.5 pt-1 border-t border-border/60">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>Document Structure</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={(e) => setIncludeCoverPage(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Include Cover / Title Page</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={includeTableOfContents}
                  onChange={(e) => setIncludeTableOfContents(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Include Table of Contents</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={sectionNumbering}
                  onChange={(e) => setSectionNumbering(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Section Numbering (1.0, 1.1)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Page Numbers (Page X)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-foreground">
                <input
                  type="checkbox"
                  checked={showHeaderTitle}
                  onChange={(e) => setShowHeaderTitle(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span>Running Header Title</span>
              </label>
            </div>

            {/* Subtitle Input */}
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-medium text-muted-foreground">
                Custom Subtitle
              </label>
              <input
                type="text"
                value={customSubtitle}
                onChange={(e) => setCustomSubtitle(e.target.value)}
                placeholder="e.g. Technical Architecture Specification"
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Right Pane: Interactive Live Sheet Preview */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-muted/40">
            {/* Preview Toolbar */}
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/70 bg-card/60 px-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="font-semibold text-foreground uppercase">
                  {pageSize}
                </span>
                <span>•</span>
                <span>
                  {spec.widthMm} × {spec.heightMm} mm
                </span>
                <span>•</span>
                <span>{orientation}</span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setPreviewZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(1))))
                  }
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[42px] text-center font-mono text-xs text-foreground">
                  {Math.round(previewZoom * 100)}%
                </span>
                <button
                  onClick={() =>
                    setPreviewZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(1))))
                  }
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPreviewZoom(0.8)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Scrollable Canvas for Sheets */}
            <div className="flex-1 overflow-auto p-6 flex justify-center custom-scrollbar">
              {isCompiling ? (
                <div className="flex flex-col items-center justify-center gap-3 my-auto">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Compiling Markdown, KaTeX math & Mermaid diagrams…
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${previewZoom})`,
                    transformOrigin: "top center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="shrink-0"
                >
                  {/* Style injection for the preview sheet */}
                  <style>{dynamicStylesheet}</style>

                  {/* Physical Paper Sheet Representation */}
                  <div
                    ref={previewSheetRef}
                    style={{
                      width: `${sheetWidthPx}px`,
                      minHeight: `${sheetMinHeightPx}px`,
                    }}
                    className={`pdf-root-container relative rounded-sm shadow-2xl transition-all ${
                      colorMode === "dark"
                        ? "bg-[#121215] text-[#f4f4f6] ring-1 ring-white/10"
                        : "bg-white text-[#1a1a1d] ring-1 ring-black/10"
                    }`}
                  >
                    {/* Running Header on Preview */}
                    {showHeaderTitle && (
                      <div className="pdf-page-header" style={{ padding: "16px 24px 0 24px" }}>
                        <span className="font-semibold">{cleanTitle}</span>
                        <span>{showDate ? new Date().toLocaleDateString() : ""}</span>
                      </div>
                    )}

                    {/* Compiled Document Content */}
                    <div
                      style={{
                        padding: `${MARGIN_SPECS[margin].topMm * 3.78}px ${
                          MARGIN_SPECS[margin].rightMm * 3.78
                        }px ${MARGIN_SPECS[margin].bottomMm * 3.78}px ${
                          MARGIN_SPECS[margin].leftMm * 3.78
                        }px`,
                      }}
                      dangerouslySetInnerHTML={{ __html: compiledHtml }}
                    />

                    {/* Running Footer on Preview */}
                    {showPageNumbers && (
                      <div
                        className="pdf-page-footer"
                        style={{
                          padding: "0 24px 16px 24px",
                          position: "absolute",
                          bottom: 0,
                          left: 0,
                          right: 0,
                        }}
                      >
                        <span>Netherite Sovereign Studio</span>
                        <span className="font-mono">Page 1</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
