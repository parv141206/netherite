"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const UmlEditor = dynamic(() => import("./UmlEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-background text-muted-foreground gap-2 select-none"
      role="status"
    >
      <Loader2 className="w-5 h-5 animate-spin text-foreground/70" />
      <span className="text-xs font-mono">Loading Apollon UML Studio…</span>
    </div>
  ),
});

interface UmlCanvasProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export function UmlCanvas({
  initialContent,
  theme,
  onChange,
  onSave,
}: UmlCanvasProps) {
  return (
    <section className="h-full w-full overflow-hidden" aria-label="UML diagram canvas">
      <UmlEditor
        initialContent={initialContent}
        theme={theme}
        onChange={onChange}
        onSave={onSave}
      />
    </section>
  );
}
