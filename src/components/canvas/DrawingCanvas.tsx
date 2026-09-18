"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

export interface DrawingCanvasHandle {
  flush: () => string | null;
  getSerializedScene: () => string | null;
}

const ExcalidrawEditor = dynamic(() => import("./ExcalidrawEditor"), {
  ssr: false,
  loading: () => (
    <MacFileLoader
      fileType="drawing"
      fileName="Whiteboard Canvas"
      message="Opening whiteboard from Google Drive…"
    />
  ),
});

interface DrawingCanvasProps {
  fileId?: string;
  initialContent?: string;
  lastSavedContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>(
  function DrawingCanvas(
    { fileId, initialContent, lastSavedContent, theme, onChange, onSave },
    ref
  ) {
    return (
      <section
        className="h-full w-full overflow-hidden"
        aria-label="Drawing canvas"
        data-excalidraw-container="true"
        data-canvas-container="true"
      >
        <ExcalidrawEditor
          editorRef={ref}
          fileId={fileId}
          initialContent={initialContent}
          lastSavedContent={lastSavedContent}
          theme={theme}
          onChange={onChange}
          onSave={onSave}
        />
      </section>
    );
  }
);
