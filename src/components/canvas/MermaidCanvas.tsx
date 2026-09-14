"use client";

import dynamic from "next/dynamic";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

const MermaidEditor = dynamic(() => import("./MermaidEditor"), {
  ssr: false,
  loading: () => (
    <MacFileLoader
      fileType="mermaid"
      fileName="Mermaid Diagram"
      message="Opening Mermaid chart from Google Drive…"
    />
  ),
});

interface MermaidCanvasProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
  title?: string;
}

export function MermaidCanvas({
  initialContent,
  theme,
  onChange,
  onSave,
  title,
}: MermaidCanvasProps) {
  return (
    <section className="h-full w-full overflow-hidden" aria-label="Mermaid diagram studio">
      <MermaidEditor
        initialContent={initialContent}
        theme={theme}
        onChange={onChange}
        onSave={onSave}
        title={title}
      />
    </section>
  );
}

export default MermaidCanvas;
