"use client";

import React, { useState, useCallback } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  RotateCw,
  AlertCircle,
} from "lucide-react";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

interface PdfViewerProps {
  fileId: string;
  fileName: string;
}

export function PdfViewer({ fileId, fileName }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const pdfUrl = `/api/notes/pdf?id=${encodeURIComponent(fileId)}`;
  const viewerUrl = `${pdfUrl}#toolbar=1&navpanes=1`;

  const handleReload = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    setReloadKey((k) => k + 1);
  }, []);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = `${pdfUrl}&download=1`;
    a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfUrl, fileName]);

  const handleOpenExternal = useCallback(() => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }, [pdfUrl]);

  return (
    <div className="relative flex h-full w-full flex-col bg-background select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-3.5 bg-muted/20 backdrop-blur-md z-10 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center rounded-md bg-rose-500/10 p-1 text-rose-500 dark:text-rose-400">
            <FileText className="h-4 w-4 shrink-0" />
          </div>
          <span
            className="text-sm font-medium truncate text-foreground max-w-[240px] sm:max-w-md"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            PDF
          </span>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Reload PDF"
            aria-label="Reload PDF"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Download PDF"
            aria-label="Download PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Open in New Tab"
            aria-label="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main PDF Viewport */}
      <div className="relative flex-1 w-full h-full bg-muted/10 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-xs flex items-center justify-center">
            <MacFileLoader
              fileName={fileName}
              fileType="pdf"
              message="Opening PDF document from Google Drive…"
            />
          </div>
        )}

        {isError ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Unable to load PDF
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              We encountered an issue streaming this document from Google Drive.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleReload}
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
        ) : (
          <iframe
            key={`${fileId}-${reloadKey}`}
            src={viewerUrl}
            title={fileName}
            className="w-full h-full border-0 bg-background"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setIsError(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
