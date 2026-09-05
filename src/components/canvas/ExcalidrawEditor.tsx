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
import { useTheme } from "~/components/ThemeProvider";

interface ExcalidrawEditorProps {
  initialContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
}

export default function ExcalidrawEditor({
  initialContent = "",
  theme: propTheme,
  onChange,
  onSave,
}: ExcalidrawEditorProps) {
  const { isDark } = useTheme();
  const activeTheme = propTheme ?? (isDark ? "dark" : "light");

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
    const isDarkTheme = activeTheme === "dark";
    const defaultBg = isDarkTheme ? "#09090b" : "#fcfcfc";

    if (!initialContent || initialContent.trim() === "") {
      return {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: defaultBg,
        },
        files: {},
      };
    }

    try {
      const parsed = JSON.parse(initialContent);
      const rawBg = parsed.appState?.viewBackgroundColor?.toLowerCase?.()?.trim();
      const isDefaultBg =
        !rawBg ||
        rawBg === "#121212" ||
        rawBg === "#ffffff" ||
        rawBg === "#fff" ||
        rawBg === "#09090b" ||
        rawBg === "#fcfcfc" ||
        rawBg === "#18181b" ||
        rawBg === "#1e1e1e" ||
        rawBg === "#dedede" ||
        rawBg === "#e5e5e6" ||
        rawBg === "#d3d3d3" ||
        rawBg === "transparent";

      return {
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        appState: {
          ...(parsed.appState || {}),
          theme: isDarkTheme ? "dark" : "light",
          ...(isDefaultBg ? { viewBackgroundColor: defaultBg } : {}),
        },
        files: parsed.files || {},
        scrollToContent: true,
      };
    } catch (err) {
      console.warn("Could not parse drawing JSON content:", err);
      return {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: defaultBg,
        },
        files: {},
      };
    }
  }, [initialContent, activeTheme]);

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
      const isDarkTheme = activeTheme === "dark";
      const targetBg = isDarkTheme ? "#09090b" : "#fcfcfc";
      const current = api.getAppState();

      const rawBg = current.viewBackgroundColor?.toLowerCase?.()?.trim();
      const isDefaultBg =
        !rawBg ||
        rawBg === "#121212" ||
        rawBg === "#ffffff" ||
        rawBg === "#fff" ||
        rawBg === "#09090b" ||
        rawBg === "#fcfcfc" ||
        rawBg === "#18181b" ||
        rawBg === "#1e1e1e" ||
        rawBg === "#dedede" ||
        rawBg === "#e5e5e6" ||
        rawBg === "#d3d3d3" ||
        rawBg === "transparent";

      if (isDefaultBg) {
        api.updateScene({
          appState: {
            theme: activeTheme,
            viewBackgroundColor: targetBg,
          },
        });
      } else {
        api.updateScene({
          appState: {
            theme: activeTheme,
          },
        });
      }
    }
  }, [api, activeTheme]);

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
    <div
      className={`${engineeringStyles.editorShell} ${
        activeTheme === "dark" ? "theme--dark" : ""
      }`}
    >
      <Excalidraw
        autoFocus
        className={activeTheme === "dark" ? "theme--dark" : ""}
        initialData={initialData}
        theme={activeTheme}
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
