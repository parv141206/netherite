"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Apollon,
  createApollonTheme,
  UMLDiagramType,
  type ApollonEditor,
  type UMLModel,
} from "@tumaet/apollon";
import { ExternalLink, Download, FileJson, Sparkles } from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

interface UmlEditorProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

const DEFAULT_MODEL_VERSION = "4.0.0";

export function createDefaultModel(title = "UML Diagram"): UMLModel {
  return {
    version: DEFAULT_MODEL_VERSION as any,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `model-${Date.now()}`,
    title,
    type: UMLDiagramType.ClassDiagram,
    nodes: [],
    edges: [],
    assessments: {},
  };
}

export default function UmlEditor({
  initialContent = "",
  theme: propTheme,
  onChange,
  onSave,
}: UmlEditorProps) {
  const { isDark } = useTheme();
  const activeTheme = propTheme ?? (isDark ? "dark" : "light");

  const [editorInstance, setEditorInstance] = useState<ApollonEditor | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Baseline signature to prevent initial mount from dirtying note
  const initialSignatureRef = useRef<string | null>(null);

  const getModelSignature = (model: UMLModel): string => {
    const nodeSig = (model.nodes || [])
      .map((n: any) => `${n.id}:${n.type}:${Math.round(n.bounds?.x ?? 0)}:${Math.round(n.bounds?.y ?? 0)}:${n.name ?? ""}`)
      .join(";");
    const edgeSig = (model.edges || [])
      .map((e: any) => `${e.id}:${e.type}:${e.source?.id ?? ""}:${e.target?.id ?? ""}`)
      .join(";");
    return `${model.type || ""}|${nodeSig}|${edgeSig}`;
  };

  const parsedModel = useMemo<UMLModel>(() => {
    if (!initialContent || (typeof initialContent === "string" && initialContent.trim() === "")) {
      const def = createDefaultModel();
      initialSignatureRef.current = getModelSignature(def);
      return def;
    }

    try {
      let data: any = typeof initialContent === "string" ? JSON.parse(initialContent) : initialContent;
      // If wrapped in a .model field (older format compatibility)
      if (data && typeof data === "object" && data.model && typeof data.model === "object") {
        data = data.model;
      }

      if (data && typeof data === "object" && (data.nodes || data.edges || data.type)) {
        const validated: UMLModel = {
          version: data.version || DEFAULT_MODEL_VERSION,
          id: data.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `model-${Date.now()}`),
          title: data.title || "UML Diagram",
          type: data.type || UMLDiagramType.ClassDiagram,
          nodes: Array.isArray(data.nodes) ? data.nodes : [],
          edges: Array.isArray(data.edges) ? data.edges : [],
          assessments: data.assessments || {},
        };
        initialSignatureRef.current = getModelSignature(validated);
        return validated;
      }
    } catch (err) {
      console.warn("Could not parse UML diagram JSON content:", err);
    }

    const fallback = createDefaultModel();
    initialSignatureRef.current = getModelSignature(fallback);
    return fallback;
  }, [initialContent]);

  // Handle Ctrl+S / Cmd+S save shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (onSaveRef.current) {
          onSaveRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);

  // Theme configuration tailored to Netherite's zinc / dark mode aesthetic
  const themeConfig = useMemo(() => {
    if (activeTheme === "dark") {
      return createApollonTheme({
        primary: "#6366f1", // Indigo accent
        primaryForeground: "#ffffff",
        background: "#09090b", // Netherite dark background
        backgroundVariant: "#121215", // Netherite card/sidebar background
        surface: "#18181b", // Raised popover surface
        surfaceSunken: "#0e0e11",
        foreground: "#fafafa", // Netherite dark foreground
        secondary: "#27272a",
        border: "#27272a", // Netherite border
        borderSubtle: "#1f1f23",
        grid: "rgba(255, 255, 255, 0.04)",
        radius: "0.5rem",
      });
    } else {
      return createApollonTheme({
        primary: "#4f46e5",
        primaryForeground: "#ffffff",
        background: "#fcfcfc", // Netherite light background
        backgroundVariant: "#f4f4f5",
        surface: "#ffffff",
        surfaceSunken: "#f4f4f5",
        foreground: "#09090b", // Netherite light foreground
        secondary: "#e4e4e7",
        border: "#e4e4e7", // Netherite border
        borderSubtle: "#ebebef",
        grid: "rgba(0, 0, 0, 0.04)",
        radius: "0.5rem",
      });
    }
  }, [activeTheme]);

  const handleExportSvg = useCallback(async () => {
    if (!editorInstance) return;
    try {
      const res = await editorInstance.exportAsSVG();
      if (res && res.svg) {
        const blob = new Blob([res.svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${parsedModel.title || "diagram"}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Failed to export SVG:", err);
    }
  }, [editorInstance, parsedModel.title]);

  const handleExportJson = useCallback(() => {
    if (!editorInstance) return;
    try {
      const model = editorInstance.model;
      const json = JSON.stringify(model, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${parsedModel.title || "diagram"}.apollon`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON:", err);
    }
  }, [editorInstance, parsedModel.title]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none font-sans bg-background ${
        activeTheme === "dark" ? "dark" : ""
      }`}
    >
      <Apollon
        style={{ height: "100%", width: "100%" }}
        defaultModel={parsedModel}
        dataTheme={activeTheme}
        theme={themeConfig}
        onMount={(editor) => {
          setEditorInstance(editor);

          // Subscribe to live model mutations
          const subId = editor.subscribeToModelChange((nextModel) => {
            const currentSig = getModelSignature(nextModel);

            // Establish baseline on mount
            if (initialSignatureRef.current === null) {
              initialSignatureRef.current = currentSig;
              return;
            }

            // Skip if no true structural modification occurred
            if (currentSig === initialSignatureRef.current) {
              return;
            }

            initialSignatureRef.current = currentSig;

            if (onChangeRef.current) {
              try {
                const serialized = JSON.stringify(nextModel, null, 2);
                onChangeRef.current(serialized);
              } catch (e) {
                console.error("Failed to serialize Apollon model:", e);
              }
            }
          });

          return () => {
            editor.unsubscribe(subId);
          };
        }}
      />

      {/* Floating Netherite Top-Right Quick Actions */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto">
        <button
          onClick={handleExportSvg}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg backdrop-blur-md bg-card/85 hover:bg-accent/80 border border-border/60 text-muted-foreground hover:text-foreground shadow-sm transition-all cursor-pointer"
          title="Export Diagram as Vector SVG"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">SVG</span>
        </button>
        <button
          onClick={handleExportJson}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg backdrop-blur-md bg-card/85 hover:bg-accent/80 border border-border/60 text-muted-foreground hover:text-foreground shadow-sm transition-all cursor-pointer"
          title="Export Raw .apollon JSON file"
        >
          <FileJson className="w-3 h-3" />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>

      {/* Floating Bottom-Left Official Attribution Pill in Netherite's Signature Aesthetic */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2 pointer-events-auto">
        <a
          href="https://github.com/ls1intum/Apollon"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium backdrop-blur-md bg-card/85 hover:bg-accent/80 border border-border/60 text-muted-foreground hover:text-foreground shadow-sm transition-all select-none group"
          title="Apollon UML Modeling Engine — Open Source by TUM LS1"
        >
          <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Powered by Apollon</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
        </a>
      </div>
    </div>
  );
}
