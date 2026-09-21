"use client";

import React from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Loader2, CloudUpload } from "lucide-react";

export function ImagePlaceholderView({ node }: NodeViewProps) {
  const { tempSrc, fileName, fileSize } = node.attrs as {
    uploadId?: string;
    tempSrc?: string;
    fileName?: string;
    fileSize?: number;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <NodeViewWrapper
      className="my-3 block w-full select-none"
      data-type="image-placeholder"
    >
      <div className="relative mx-auto flex max-w-md flex-col overflow-hidden rounded-xl border border-primary/30 bg-card/80 p-4 shadow-lg backdrop-blur-md transition-all sm:flex-row sm:items-center sm:gap-4">
        {/* Shimmer line on top edge */}
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-primary/20">
          <div className="h-full w-1/3 animate-pulse bg-primary" />
        </div>

        {/* Thumbnail Preview or Icon */}
        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-muted/60">
          {tempSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tempSrc}
              alt="Uploading thumbnail"
              className="h-full w-full object-cover opacity-60 blur-[0.5px]"
            />
          ) : (
            <CloudUpload className="h-7 w-7 text-primary/70 animate-bounce" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Loader2 className="h-6 w-6 animate-spin text-white drop-shadow-md" />
          </div>
        </div>

        {/* Progress & File Metadata */}
        <div className="mt-2 flex-1 min-w-0 sm:mt-0">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 animate-ping rounded-full bg-primary" />
            <span className="text-xs font-semibold text-foreground">
              Uploading to Google Drive…
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground font-mono">
            {fileName || "image.png"}
            {fileSize ? ` • ${formatFileSize(fileSize)}` : ""}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-full origin-left animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
