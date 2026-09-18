"use client";

import dynamic from "next/dynamic";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

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
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export function DrawingCanvas({
  initialContent,
  theme,
  onChange,
  onSave,
}: DrawingCanvasProps) {
  return (
    <section
      className="h-full w-full overflow-hidden"
      aria-label="Drawing canvas"
      data-excalidraw-container="true"
      data-canvas-container="true"
    >
      <ExcalidrawEditor
        initialContent={initialContent}
        theme={theme}
        onChange={onChange}
        onSave={onSave}
      />
    </section>
  );
}
