"use client";

import React from "react";
import { AppleSpinner } from "./AppleSpinner";
import { FileText, Palette, Network, Workflow, Image as ImageIcon } from "lucide-react";

interface MacFileLoaderProps {
  fileName?: string;
  fileType?: "note" | "drawing" | "uml" | "mermaid" | "image";
  message?: string;
}

export function MacFileLoader({
  fileName = "Document",
  fileType = "note",
  message = "Opening from Google Drive…",
}: MacFileLoaderProps) {
  const getIcon = () => {
    switch (fileType) {
      case "drawing":
        return <Palette className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />;
      case "uml":
        return <Network className="w-5 h-5 text-purple-500 dark:text-purple-400" />;
      case "mermaid":
        return <Workflow className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
      case "image":
        return <ImageIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
      default:
        return <FileText className="w-5 h-5 text-foreground/70" />;
    }
  };

  const cleanName = fileName.replace(/\.(md|excalidraw|apollon|uml|mmd|mermaid|png|jpg|jpeg|gif|webp|svg)$/i, "");

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-background text-foreground relative select-none animate-in fade-in duration-150 overflow-hidden">
      {/* Top Edge macOS Progress Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-muted overflow-hidden z-10">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-1/3 rounded-full"
          style={{
            animation: "macProgressGlide 1.4s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes macProgressGlide {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>

      {/* Centered Cupertino Document Loading Card */}
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card/40 border border-border/40 shadow-sm backdrop-blur-md max-w-sm text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-center p-3.5 rounded-2xl bg-muted/60 border border-border/40 shadow-2xs">
          {getIcon()}
        </div>

        <div className="flex flex-col items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-foreground truncate max-w-[260px]">
            {cleanName || "Untitled"}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <AppleSpinner size="xs" className="text-foreground shrink-0" />
            <span>{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
