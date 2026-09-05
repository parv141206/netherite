"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Excalidraw, Footer } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";

import {
  ENGINEERING_PALETTE_TAB,
  ENGINEERING_SIDEBAR_NAME,
  EngineeringSidebar,
  EngineeringSidebarTrigger,
} from "@/features/engineering-canvas/engineering-sidebar";
import { EngineeringBottomPanel } from "@/features/engineering-canvas/engineering-bottom-panel";
import engineeringStyles from "@/features/engineering-canvas/engineering-sidebar.module.scss";

interface ExcalidrawEditorProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export default function ExcalidrawEditor({
  initialContent = "",
  theme = "dark",
  onChange,
  onSave,
}: ExcalidrawEditorProps) {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [elements, setElements] = useState<readonly ExcalidrawElement[]>([]);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [sidebarDocked, setSidebarDocked] = useState(false);
  const [, startSidebarTransition] = useTransition();

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Parse initial content safely
  const initialData = useMemo<ExcalidrawInitialDataState>(() => {
    if (!initialContent || initialContent.trim() === "") {
      return {
        elements: [],
        appState: {
          theme: theme === "dark" ? "dark" : "light",
          viewBackgroundColor: theme === "dark" ? "#121212" : "#ffffff",
        },
        files: {},
      };
    }

    try {
      const parsed = JSON.parse(initialContent);
      return {
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        appState: {
          ...(parsed.appState || {}),
          theme: theme === "dark" ? "dark" : "light",
        },
        files: parsed.files || {},
        scrollToContent: true,
      };
    } catch (err) {
      console.warn("Could not parse drawing JSON content:", err);
      return {
        elements: [],
        appState: {
          theme: theme === "dark" ? "dark" : "light",
        },
        files: {},
      };
    }
  }, [initialContent, theme]);

  const handleApi = useCallback((nextApi: ExcalidrawImperativeAPI | null) => {
    setApi(nextApi);
    if (nextApi) {
      setAppState(nextApi.getAppState());
      requestAnimationFrame(() => {
        if (nextApi.isDestroyed) {
          return;
        }
        nextApi.toggleSidebar({
          name: ENGINEERING_SIDEBAR_NAME,
          tab: ENGINEERING_PALETTE_TAB,
          force: true,
        });
      });
    }
  }, []);

  const handleChange = useCallback(
    (
      nextElements: readonly ExcalidrawElement[],
      nextAppState: AppState,
      nextFiles: BinaryFiles
    ) => {
      startSidebarTransition(() => {
        setElements(nextElements);
        setAppState(nextAppState);
      });

      if (onChangeRef.current) {
        try {
          const serialized = JSON.stringify(
            {
              type: "excalidraw",
              version: 2,
              source: "netherite",
              elements: nextElements,
              appState: {
                viewBackgroundColor: nextAppState.viewBackgroundColor,
                currentItemFontFamily: nextAppState.currentItemFontFamily,
                theme: nextAppState.theme,
                gridSize: nextAppState.gridSize,
                zoom: nextAppState.zoom,
                scrollX: nextAppState.scrollX,
                scrollY: nextAppState.scrollY,
              },
              files: nextFiles,
            },
            null,
            2
          );
          onChangeRef.current(serialized);
        } catch (e) {
          console.error("Failed to serialize drawing elements:", e);
        }
      }
    },
    [startSidebarTransition]
  );

  // Sync theme changes to Excalidraw appState when user toggles dark/light mode
  useEffect(() => {
    if (api && !api.isDestroyed) {
      const current = api.getAppState();
      const targetTheme = theme === "dark" ? "dark" : "light";
      if (current.theme !== targetTheme) {
        api.updateScene({
          appState: {
            theme: targetTheme,
          },
        });
      }
    }
  }, [api, theme]);

  // Global Ctrl+S handler for sketch canvas
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

  return (
    <div className={engineeringStyles.editorShell}>
      <Excalidraw
        autoFocus
        initialData={initialData}
        theme={theme === "dark" ? "dark" : "light"}
        onExcalidrawAPI={handleApi}
        onChange={handleChange}
        renderTopRightUI={() => <EngineeringSidebarTrigger />}
        UIOptions={{
          canvasActions: {
            loadScene: false, // keep everything native in Netherite
          },
        }}
      >
        <EngineeringSidebar
          api={api}
          docked={sidebarDocked}
          onDock={setSidebarDocked}
        />
        <Footer>
          <EngineeringBottomPanel
            api={api}
            elements={elements}
            appState={appState}
          />
        </Footer>
      </Excalidraw>
    </div>
  );
}
