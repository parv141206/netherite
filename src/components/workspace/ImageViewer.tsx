"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Loader2,
  Maximize2,
  ImageIcon,
  AlertCircle,
} from "lucide-react";
import { api } from "~/trpc/react";

interface ImageViewerProps {
  fileId: string;
  fileName: string;
  mimeType?: string;
}

export function ImageViewer({ fileId, fileName, mimeType }: ImageViewerProps) {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data: imageData,
    isLoading,
    isError,
    refetch,
  } = api.notes.getImage.useQuery(
    { id: fileId },
    {
      enabled: !!fileId && !fileId.startsWith("temp-"),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    }
  );

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.25, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.25, 0.2));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleFitScreen = () => {
    setScale(0.9);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 && position.x === 0 && position.y === 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev * 1.1, 5));
    } else {
      setScale((prev) => Math.max(prev / 1.1, 0.2));
    }
  };

  const handleDownload = () => {
    if (!imageData?.dataUrl) return;
    const a = document.createElement("a");
    a.href = imageData.dataUrl;
    a.download = fileName || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-background/95 overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="flex h-12 items-center justify-between border-b border-border/40 px-4 bg-muted/20 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 min-w-0">
          <ImageIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate text-foreground" title={fileName}>
            {fileName}
          </span>
          {imageData?.mimeType && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {imageData.mimeType.split("/")[1]}
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/50">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom Out (Scroll Down)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium px-1 text-muted-foreground min-w-[3rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom In (Scroll Up)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-border/60 mx-1" />
          <button
            onClick={handleResetZoom}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Original Size (100%)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitScreen}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Fit to Window"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          {imageData?.dataUrl && (
            <>
              <div className="w-[1px] h-4 bg-border/60 mx-1" />
              <button
                onClick={handleDownload}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className={`relative flex-1 flex items-center justify-center overflow-hidden checkerboard-bg ${
          isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-mono">Loading image from Google Drive…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-3 text-destructive max-w-sm text-center p-4">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm font-medium">Failed to load image</p>
            <p className="text-xs text-muted-foreground">
              We couldn't download this image from Drive. Ensure you have proper network connection.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {imageData?.dataUrl && !isLoading && (
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="max-h-[85vh] max-w-[85vw] flex items-center justify-center pointer-events-none drop-shadow-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData.dataUrl}
              alt={fileName}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded select-none pointer-events-none"
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
