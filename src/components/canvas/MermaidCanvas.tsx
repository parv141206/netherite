"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const MermaidEditor = dynamic(() => import("./MermaidEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-background text-muted-foreground gap-2 select-none"
      role="status"
    >
      <Loader2 className="w-5 h-5 animate-spin text-foreground/70" />
      <span className="text-xs font-mono">Loading Mermaid Studio…</span>
    </div>
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
