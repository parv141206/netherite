"use client";

import dynamic from "next/dynamic";
import { MacFileLoader } from "~/components/ui/MacFileLoader";

const UmlEditor = dynamic(() => import("./UmlEditor"), {
  ssr: false,
  loading: () => (
    <MacFileLoader
      fileType="uml"
      fileName="UML Diagram"
      message="Opening UML diagram from Google Drive…"
    />
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
