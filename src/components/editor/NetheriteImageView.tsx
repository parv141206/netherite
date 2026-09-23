"use client";

import React, { useState, useRef, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Crop as CropIcon,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  WrapText,
  Spline,
} from "lucide-react";
import { ImageCropModal } from "./ImageCropModal";

export function NetheriteImageView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const {
    src,
    alt = "",
    title = "",
    width = "100%",
    height = "auto",
    layout = "break",
  } = node.attrs;

  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Resize handler via dragging bottom-right corner handle
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const initialWidth = imageRef.current
      ? imageRef.current.getBoundingClientRect().width
      : 300;
    const parentWidth =
      containerRef.current?.parentElement?.getBoundingClientRect().width || 800;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidthPx = Math.max(100, Math.min(parentWidth, initialWidth + deltaX));
      const percentage = Math.round((newWidthPx / parentWidth) * 100);
      updateAttributes({ width: `${percentage}%` });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const handleCropComplete = useCallback(
    (croppedDataUrl: string) => {
      updateAttributes({ src: croppedDataUrl });
    },
    [updateAttributes],
  );

  // Layout styles
  let wrapperStyle: React.CSSProperties = {
    display: "block",
    clear: "both",
    width: "100%",
    marginTop: "1.25rem",
    marginBottom: "1.25rem",
  };

  let alignStyle: React.CSSProperties = {};

  if (layout === "break") {
    wrapperStyle = {
      display: "block",
      clear: "both",
      width: "100%",
      marginTop: "1.25rem",
      marginBottom: "1.25rem",
    };
    alignStyle = {
      display: "block",
      width: width || "100%",
      margin: "0 auto",
    };
  } else if (layout === "left") {
    wrapperStyle = {
      float: "left",
      marginRight: "1.5rem",
      marginBottom: "1rem",
      marginTop: "0.5rem",
      maxWidth: "50%",
    };
    alignStyle = {
      width: width && width !== "100%" ? width : "100%",
    };
  } else if (layout === "right") {
    wrapperStyle = {
      float: "right",
      marginLeft: "1.5rem",
      marginBottom: "1rem",
      marginTop: "0.5rem",
      maxWidth: "50%",
    };
    alignStyle = {
      width: width && width !== "100%" ? width : "100%",
    };
  } else if (layout === "center") {
    wrapperStyle = {
      display: "block",
      clear: "both",
      width: "100%",
      textAlign: "center",
      marginTop: "1.25rem",
      marginBottom: "1.25rem",
    };
    alignStyle = {
      display: "inline-block",
      width: width || "100%",
      margin: "0 auto",
    };
  } else if (layout === "inline") {
    wrapperStyle = {
      display: "inline-block",
      verticalAlign: "middle",
      margin: "0 0.5rem",
    };
    alignStyle = {
      width: width || "auto",
    };
  }

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`netherite-image-wrapper relative my-2 select-none group ${
        layout === "break" ? "w-full block clear-both" : ""
      }`}
      style={wrapperStyle}
    >
      <div
        style={alignStyle}
        className={`relative inline-block transition-shadow ${
          selected
            ? "ring-2 ring-primary/80 ring-offset-2 ring-offset-background rounded-lg"
            : ""
        }`}
      >
        {/* Floating Toolbar when selected or hovering */}
        <div
          className={`absolute -top-11 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-lg border border-border/80 bg-card/95 px-1 py-0.5 text-xs shadow-xl backdrop-blur-md transition-opacity duration-150 ${
            selected
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Wrap / Layout Buttons */}
          <button
            type="button"
            onClick={() => updateAttributes({ layout: "break", width: "100%" })}
            className={`p-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${
              layout === "break" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Break text (Full Width)"
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ layout: "inline", width: width === "100%" ? "50%" : width })}
            className={`p-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${
              layout === "inline" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Inline with text"
          >
            <Spline className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ layout: "left", width: width === "100%" ? "40%" : width })}
            className={`p-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${
              layout === "left" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Wrap text: Float left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ layout: "center" })}
            className={`p-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${
              layout === "center" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ layout: "right", width: width === "100%" ? "40%" : width })}
            className={`p-1.5 rounded hover:bg-accent cursor-pointer transition-colors ${
              layout === "right" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Wrap text: Float right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-3.5 w-px bg-border/60" />

          {/* Size Presets */}
          <button
            type="button"
            onClick={() => updateAttributes({ width: "25%" })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-accent cursor-pointer ${
              width === "25%" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ width: "50%" })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-accent cursor-pointer ${
              width === "50%" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => updateAttributes({ width: "100%" })}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-accent cursor-pointer ${
              width === "100%" ? "bg-accent text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            100%
          </button>

          <div className="mx-1 h-3.5 w-px bg-border/60" />

          {/* Crop Button */}
          <button
            type="button"
            onClick={() => setIsCropModalOpen(true)}
            className="flex items-center gap-1 p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors"
            title="Crop Image"
          >
            <CropIcon className="h-3.5 w-3.5" />
            <span className="text-[11px] font-medium hidden sm:inline">Crop</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => deleteNode()}
            className="p-1.5 rounded text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
            title="Delete Image"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* The Rendered Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          title={title}
          style={{
            width: width || "100%",
            height: height || "auto",
            maxWidth: "100%",
            display: "block",
          }}
          className="rounded-lg shadow-xs transition-all object-contain"
        />

        {/* Corner Drag Resize Handle */}
        {selected && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary border-2 border-background cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
            title="Drag to resize"
          />
        )}
      </div>

      {/* Image Crop Dialog Modal */}
      {isCropModalOpen && (
        <ImageCropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageSrc={src}
          onCropComplete={handleCropComplete}
        />
      )}
    </NodeViewWrapper>
  );
}
