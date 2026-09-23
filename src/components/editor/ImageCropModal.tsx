"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Check,
  RotateCw,
  Crop as CropIcon,
  Maximize2,
  Square,
  RectangleHorizontal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
}: ImageCropModalProps) {
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null); // null = free
  const [crop, setCrop] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const [imageSize, setImageSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; crop: typeof crop }>({
    x: 0,
    y: 0,
    crop: { x: 0, y: 0, width: 100, height: 100 },
  });

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setRotation(0);
      setAspectRatio(null);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImageSize({ width: nw, height: nh });

    // Initial crop: center 85%
    const initialWidth = Math.round(nw * 0.85);
    const initialHeight = Math.round(nh * 0.85);
    setCrop({
      x: Math.round((nw - initialWidth) / 2),
      y: Math.round((nh - initialHeight) / 2),
      width: initialWidth,
      height: initialHeight,
    });
  };

  const handleSetAspectRatio = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (!ratio || imageSize.width === 0 || imageSize.height === 0) return;

    let newWidth = crop.width;
    let newHeight = Math.round(crop.width / ratio);

    if (newHeight > imageSize.height) {
      newHeight = imageSize.height;
      newWidth = Math.round(newHeight * ratio);
    }

    let newX = crop.x;
    let newY = crop.y;

    if (newX + newWidth > imageSize.width) {
      newX = Math.max(0, imageSize.width - newWidth);
    }
    if (newY + newHeight > imageSize.height) {
      newY = Math.max(0, imageSize.height - newHeight);
    }

    setCrop({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  const startDrag = (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingRef.current = handle;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop },
    };
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !imageRef.current || imageSize.width === 0) return;

      const clientRect = imageRef.current.getBoundingClientRect();
      const scaleX = imageSize.width / clientRect.width;
      const scaleY = imageSize.height / clientRect.height;

      const deltaX = (e.clientX - dragStartPos.current.x) * scaleX;
      const deltaY = (e.clientY - dragStartPos.current.y) * scaleY;
      const initialCrop = dragStartPos.current.crop;

      let nextX = initialCrop.x;
      let nextY = initialCrop.y;
      let nextW = initialCrop.width;
      let nextH = initialCrop.height;

      const handle = isDraggingRef.current;

      if (handle === "move") {
        nextX = Math.max(0, Math.min(imageSize.width - nextW, initialCrop.x + deltaX));
        nextY = Math.max(0, Math.min(imageSize.height - nextH, initialCrop.y + deltaY));
      } else {
        if (handle.includes("e")) {
          nextW = Math.max(40, Math.min(imageSize.width - initialCrop.x, initialCrop.width + deltaX));
          if (aspectRatio) nextH = Math.round(nextW / aspectRatio);
        }
        if (handle.includes("s")) {
          nextH = Math.max(40, Math.min(imageSize.height - initialCrop.y, initialCrop.height + deltaY));
          if (aspectRatio) nextW = Math.round(nextH * aspectRatio);
        }
        if (handle.includes("w")) {
          const maxDeltaLeft = initialCrop.x;
          const validDeltaX = Math.max(-maxDeltaLeft, Math.min(initialCrop.width - 40, deltaX));
          nextX = initialCrop.x + validDeltaX;
          nextW = initialCrop.width - validDeltaX;
          if (aspectRatio) nextH = Math.round(nextW / aspectRatio);
        }
        if (handle.includes("n")) {
          const maxDeltaTop = initialCrop.y;
          const validDeltaY = Math.max(-maxDeltaTop, Math.min(initialCrop.height - 40, deltaY));
          nextY = initialCrop.y + validDeltaY;
          nextH = initialCrop.height - validDeltaY;
          if (aspectRatio) nextW = Math.round(nextH * aspectRatio);
        }

        // Clamp boundaries
        if (nextX + nextW > imageSize.width) nextW = imageSize.width - nextX;
        if (nextY + nextH > imageSize.height) nextH = imageSize.height - nextY;
      }

      setCrop({
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextW),
        height: Math.round(nextH),
      });
    },
    [aspectRatio, imageSize],
  );

  const onMouseUp = useCallback(() => {
    isDraggingRef.current = null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [isOpen, onMouseMove, onMouseUp]);

  const handleApplyCrop = () => {
    if (!imageRef.current) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle rotation if any
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const rotatedCanvas = document.createElement("canvas");
    const rotatedCtx = rotatedCanvas.getContext("2d");
    if (!rotatedCtx) return;

    if (rotation === 0) {
      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.drawImage(
        imageRef.current,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
    } else {
      const origW = imageRef.current.naturalWidth;
      const origH = imageRef.current.naturalHeight;
      rotatedCanvas.width = isRotated90or270 ? origH : origW;
      rotatedCanvas.height = isRotated90or270 ? origW : origH;

      rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotatedCtx.rotate((rotation * Math.PI) / 180);
      rotatedCtx.drawImage(imageRef.current, -origW / 2, -origH / 2);

      canvas.width = crop.width;
      canvas.height = crop.height;
      ctx.drawImage(
        rotatedCanvas,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
    }

    const croppedDataUrl = canvas.toDataURL("image/png");
    onCropComplete(croppedDataUrl);
    onClose();
  };

  // Normalized percentages for the crop overlay box relative to natural image dimensions
  const cropPercent = {
    left: imageSize.width > 0 ? (crop.x / imageSize.width) * 100 : 0,
    top: imageSize.height > 0 ? (crop.y / imageSize.height) * 100 : 0,
    width: imageSize.width > 0 ? (crop.width / imageSize.width) * 100 : 100,
    height: imageSize.height > 0 ? (crop.height / imageSize.height) * 100 : 100,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="bg-card border-border flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
          >
            {/* Header */}
        <div className="border-border/60 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CropIcon className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Crop & Adjust Image</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-accent/60 rounded-md p-1.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-2.5 text-xs">
          {/* Aspect Ratios */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground mr-1 text-[11px] font-medium">Aspect:</span>
            <button
              onClick={() => handleSetAspectRatio(null)}
              className={`rounded px-2.5 py-1 transition-colors cursor-pointer font-medium ${
                aspectRatio === null
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              Free
            </button>
            <button
              onClick={() => handleSetAspectRatio(1)}
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors cursor-pointer font-medium ${
                aspectRatio === 1
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Square className="h-3 w-3" />
              1:1
            </button>
            <button
              onClick={() => handleSetAspectRatio(4 / 3)}
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors cursor-pointer font-medium ${
                aspectRatio === 4 / 3
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              4:3
            </button>
            <button
              onClick={() => handleSetAspectRatio(16 / 9)}
              className={`flex items-center gap-1 rounded px-2.5 py-1 transition-colors cursor-pointer font-medium ${
                aspectRatio === 16 / 9
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <RectangleHorizontal className="h-3 w-3" />
              16:9
            </button>
          </div>

          {/* Transform Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="flex items-center gap-1.5 rounded-md hover:bg-accent px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Rotate 90° clockwise"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Rotate</span>
            </button>
            <button
              onClick={() => {
                if (imageSize.width > 0) {
                  setCrop({
                    x: 0,
                    y: 0,
                    width: imageSize.width,
                    height: imageSize.height,
                  });
                  setAspectRatio(null);
                }
              }}
              className="flex items-center gap-1.5 rounded-md hover:bg-accent px-2.5 py-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div
          ref={containerRef}
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-950/80 p-6 select-none min-h-[360px]"
        >
          <div className="relative inline-block max-h-[60vh] max-w-full">
            {/* The Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              style={{
                transform: `rotate(${rotation}deg)`,
                maxHeight: "56vh",
                maxWidth: "100%",
                objectFit: "contain",
                display: "block",
              }}
              className="pointer-events-none rounded select-none shadow-md"
            />

            {/* Dimmed backdrop mask over non-cropped areas */}
            {imageSize.width > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.65)`,
                  left: `${cropPercent.left}%`,
                  top: `${cropPercent.top}%`,
                  width: `${cropPercent.width}%`,
                  height: `${cropPercent.height}%`,
                }}
              />
            )}

            {/* Crop Overlay Box */}
            {imageSize.width > 0 && (
              <div
                style={{
                  left: `${cropPercent.left}%`,
                  top: `${cropPercent.top}%`,
                  width: `${cropPercent.width}%`,
                  height: `${cropPercent.height}%`,
                }}
                className="absolute border-2 border-primary shadow-2xl cursor-move touch-none"
                onMouseDown={(e) => startDrag("move", e)}
              >
                {/* 3x3 Grid Lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div className="border-r border-b border-primary/50" />
                  <div />
                </div>

                {/* Handles: Corners */}
                <div
                  onMouseDown={(e) => startDrag("nw", e)}
                  className="absolute -top-1.5 -left-1.5 h-3.5 w-3.5 bg-primary rounded-xs border-2 border-background cursor-nwse-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => startDrag("ne", e)}
                  className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-primary rounded-xs border-2 border-background cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => startDrag("sw", e)}
                  className="absolute -bottom-1.5 -left-1.5 h-3.5 w-3.5 bg-primary rounded-xs border-2 border-background cursor-nesw-resize shadow-md"
                />
                <div
                  onMouseDown={(e) => startDrag("se", e)}
                  className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 bg-primary rounded-xs border-2 border-background cursor-nwse-resize shadow-md"
                />

                {/* Handles: Edges */}
                <div
                  onMouseDown={(e) => startDrag("n", e)}
                  className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-5 bg-primary rounded-full border border-background cursor-ns-resize shadow-xs"
                />
                <div
                  onMouseDown={(e) => startDrag("s", e)}
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-5 bg-primary rounded-full border border-background cursor-ns-resize shadow-xs"
                />
                <div
                  onMouseDown={(e) => startDrag("w", e)}
                  className="absolute top-1/2 -left-1 -translate-y-1/2 h-5 w-2 bg-primary rounded-full border border-background cursor-ew-resize shadow-xs"
                />
                <div
                  onMouseDown={(e) => startDrag("e", e)}
                  className="absolute top-1/2 -right-1 -translate-y-1/2 h-5 w-2 bg-primary rounded-full border border-background cursor-ew-resize shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border/60 flex items-center justify-between border-t px-5 py-3">
          <div className="text-muted-foreground text-xs font-mono">
            {crop.width} × {crop.height} px
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="hover:bg-accent/80 rounded-lg px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyCrop}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold shadow-xs cursor-pointer transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
);
}
