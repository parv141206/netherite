"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  FileImage,
  FileText,
  Code2,
  FileJson,
  Check,
  Layers,
} from "lucide-react";
import { AppleSpinner } from "~/components/ui/AppleSpinner";
import { jsPDF } from "jspdf";

interface UmlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editorInstance: any;
  diagramTitle?: string;
  isDark?: boolean;
}

type ExportFormat = "png" | "jpeg" | "pdf" | "svg" | "json";
type PaddingOption = 0 | 16 | 32 | 64;
type ScaleOption = 1 | 2 | 3;
type BgOption = "theme" | "transparent" | "white" | "dark";

export function UmlExportModal({
  isOpen,
  onClose,
  editorInstance,
  diagramTitle = "diagram",
  isDark = false,
}: UmlExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ScaleOption>(2);
  const [padding, setPadding] = useState<PaddingOption>(32);
  const [bgChoice, setBgChoice] = useState<BgOption>("theme");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const cleanTitle = diagramTitle.replace(/\.(apollon|uml|json)$/i, "") || "diagram";

  const executeExport = async () => {
    if (!editorInstance) return;
    setIsExporting(true);

    try {
      if (format === "json") {
        const model = editorInstance.model;
        const jsonStr = JSON.stringify(model, null, 2);
        const blob = new Blob([jsonStr], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanTitle}.apollon`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onClose();
        return;
      }

      // Export base SVG with margin
      const svgRes = await editorInstance.exportAsSVG({
        margin: padding,
      });

      if (!svgRes || !svgRes.svg) {
        throw new Error("Failed to generate SVG from diagram");
      }

      let svgString: string = svgRes.svg;

      // Handle SVG direct download
      if (format === "svg") {
        const blob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cleanTitle}.svg`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        onClose();
        return;
      }

      // Convert SVG to Canvas for PNG / JPEG / PDF
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
      const svgEl = svgDoc.documentElement;

      let viewBox = svgEl.getAttribute("viewBox");
      let width = parseFloat(svgEl.getAttribute("width") || "800");
      let height = parseFloat(svgEl.getAttribute("height") || "600");

      if (viewBox) {
        const parts = viewBox.split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] && parts[3]) {
          width = parts[2];
          height = parts[3];
        }
      }

      const img = new Image();
      const svgBlob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
        img.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      const dpr = scale;
      canvas.width = width * dpr;
      canvas.height = height * dpr;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire 2D canvas context");

      // Scale resolution
      ctx.scale(dpr, dpr);

      // Determine background fill
      let resolvedBg: string | null = null;
      if (bgChoice === "theme") {
        resolvedBg = isDark ? "#09090b" : "#ffffff";
      } else if (bgChoice === "white") {
        resolvedBg = "#ffffff";
      } else if (bgChoice === "dark") {
        resolvedBg = "#09090b";
      } else if (bgChoice === "transparent") {
        resolvedBg = format === "jpeg" ? "#ffffff" : null;
      }

      if (resolvedBg) {
        ctx.fillStyle = resolvedBg;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(svgUrl);

      if (format === "png" || format === "jpeg") {
        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const quality = format === "jpeg" ? 0.95 : undefined;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${cleanTitle}.${format}`;
              a.click();
              URL.revokeObjectURL(url);
            }
            setIsExporting(false);
            onClose();
          },
          mimeType,
          quality
        );
      } else if (format === "pdf") {
        const imgData = canvas.toDataURL("image/png");
        const orientation = width > height ? "landscape" : "portrait";
        const pdf = new jsPDF({
          orientation,
          unit: "pt",
          format: [width, height],
        });

        pdf.addImage(imgData, "PNG", 0, 0, width, height);
        pdf.save(`${cleanTitle}.pdf`);
        setIsExporting(false);
        onClose();
      }
    } catch (error) {
      console.error("Diagram export error:", error);
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isExporting) onClose();
      }}
    >
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
        {/* Apple Modal Header */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-accent text-foreground">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Export UML Diagram
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Render at maximum quality with custom resolution and padding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-7 h-7 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Format Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">
              Export Format
            </label>
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-muted/60 rounded-xl">
              {[
                { id: "png", label: "PNG", icon: FileImage },
                { id: "jpeg", label: "JPEG", icon: FileImage },
                { id: "pdf", label: "PDF", icon: FileText },
                { id: "svg", label: "SVG", icon: Code2 },
                { id: "json", label: "JSON", icon: FileJson },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = format === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setFormat(item.id as ExportFormat)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {format !== "json" && (
            <>
              {/* Scale / Resolution (for PNG, JPEG, PDF) */}
              {format !== "svg" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">
                      Resolution / Scale
                    </label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {scale === 1
                        ? "Standard (1x)"
                        : scale === 2
                        ? "Retina HD (2x)"
                        : "Ultra-Print (3x)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: "1x Standard" },
                      { val: 2, label: "2x Retina HD" },
                      { val: 3, label: "3x Ultra Print" },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        onClick={() => setScale(opt.val as ScaleOption)}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                          scale === opt.val
                            ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                            : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background Color */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Background
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "theme", label: isDark ? "Dark Theme" : "Light Theme" },
                    { id: "white", label: "Pure White" },
                    { id: "dark", label: "Dark Zinc" },
                    {
                      id: "transparent",
                      label: "Transparent",
                      disabled: format === "jpeg",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      disabled={opt.disabled}
                      onClick={() => setBgChoice(opt.id as BgOption)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-medium transition-all cursor-pointer truncate ${
                        bgChoice === opt.id
                          ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                          : opt.disabled
                          ? "opacity-40 cursor-not-allowed border-border/40 text-muted-foreground"
                          : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Padding */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Canvas Padding
                  </label>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {padding}px
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 0, label: "Tight (0px)" },
                    { val: 16, label: "16px" },
                    { val: 32, label: "32px" },
                    { val: 64, label: "64px" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      onClick={() => setPadding(opt.val as PaddingOption)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                        padding === opt.val
                          ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                          : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={executeExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <AppleSpinner size="xs" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
