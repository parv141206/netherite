"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  Terminal,
} from "lucide-react";
import { mermaidToAscii } from "~/lib/mermaidToAscii";

interface MermaidExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  svgContent: string;
  mermaidCode: string;
  diagramTitle: string;
  isDark: boolean;
}

export function MermaidExportModal({
  isOpen,
  onClose,
  svgContent,
  mermaidCode,
  diagramTitle,
  isDark,
}: MermaidExportModalProps) {
  const [copiedType, setCopiedType] = useState<"svg" | "code" | "ascii" | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  if (!isOpen) return null;

  const cleanTitle = diagramTitle.replace(/\.(mmd|mermaid)$/i, "") || "diagram";

  // Download SVG
  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanTitle}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  // Download PNG (via Canvas rasterization)
  const handleDownloadPng = async () => {
    if (!svgContent) return;
    setIsExportingPng(true);
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, "image/svg+xml");
      const svgEl = doc.querySelector("svg");
      if (!svgEl) return;

      const viewBox = svgEl.viewBox.baseVal;
      let width = viewBox ? viewBox.width : svgEl.width.baseVal.value;
      let height = viewBox ? viewBox.height : svgEl.height.baseVal.value;

      if (!width || width === 0) width = 1200;
      if (!height || height === 0) height = 800;

      const scale = 2; // High-DPI 2x
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.scale(scale, scale);

      // Background fill matching current theme
      ctx.fillStyle = isDark ? "#121212" : "#ffffff";
      ctx.fillRect(0, 0, width, height);

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = pngUrl;
          a.download = `${cleanTitle}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(pngUrl);
          setIsExportingPng(false);
          onClose();
        }, "image/png");
      };

      img.onerror = () => {
        setIsExportingPng(false);
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (err) {
      console.error("Failed to export PNG:", err);
      setIsExportingPng(false);
    }
  };

  // Copy SVG to clipboard
  const handleCopySvg = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setCopiedType("svg");
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error("Failed to copy SVG:", err);
    }
  };

  // Copy Code to clipboard
  const handleCopyCode = async () => {
    if (!mermaidCode) return;
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopiedType("code");
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Copy ASCII Diagram
  const handleCopyAscii = async () => {
    if (!mermaidCode) return;
    try {
      const ascii = mermaidToAscii(mermaidCode);
      await navigator.clipboard.writeText(ascii);
      setCopiedType("ascii");
      setTimeout(() => setCopiedType(null), 2500);
    } catch (err) {
      console.error("Failed to copy ascii:", err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Export Mermaid Diagram</h3>
              <p className="text-[11px] text-muted-foreground">{cleanTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Options Body */}
        <div className="p-6 space-y-3 bg-background">
          {/* Download SVG */}
          <button
            onClick={handleDownloadSvg}
            className="w-full p-3.5 rounded-xl border border-border/70 hover:border-foreground/40 bg-card hover:bg-muted/40 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Download Scalable SVG</div>
                <div className="text-[11px] text-muted-foreground">
                  Crisp, resolution-independent vector graphic
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          {/* Download PNG */}
          <button
            onClick={handleDownloadPng}
            disabled={isExportingPng}
            className="w-full p-3.5 rounded-xl border border-border/70 hover:border-foreground/40 bg-card hover:bg-muted/40 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {isExportingPng ? "Rendering High-DPI PNG..." : "Download High-Res PNG (2x)"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Ideal for documentation, slides, and sharing
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>

          <div className="pt-2 border-t border-border/40 grid grid-cols-3 gap-2">
            {/* Copy SVG */}
            <button
              onClick={handleCopySvg}
              className="px-2.5 py-2.5 rounded-xl border border-border/60 hover:bg-muted/40 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer"
            >
              {copiedType === "svg" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>SVG</span>
                </>
              )}
            </button>

            {/* Copy Code */}
            <button
              onClick={handleCopyCode}
              className="px-2.5 py-2.5 rounded-xl border border-border/60 hover:bg-muted/40 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer"
            >
              {copiedType === "code" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Code</span>
                </>
              )}
            </button>

            {/* Copy ASCII */}
            <button
              onClick={handleCopyAscii}
              className="px-2.5 py-2.5 rounded-xl border border-border/60 hover:bg-muted/40 flex items-center justify-center gap-1.5 text-xs font-medium text-foreground transition-all cursor-pointer"
              title="Copy clean ASCII art diagram"
            >
              {copiedType === "ascii" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>ASCII</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/60 bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
