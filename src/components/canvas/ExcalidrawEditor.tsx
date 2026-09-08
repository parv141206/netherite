"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Excalidraw,
  Footer,
  restoreElements,
  restoreAppState,
  serializeAsJSON,
} from "@excalidraw/excalidraw";
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

  // Track the baseline signature to prevent initial mount / layout from dirtying the note
  const initialSignatureRef = useRef<string | null>(null);

  // Parse initial content safely with official Excalidraw restoration
  const initialData = useMemo<ExcalidrawInitialDataState>(() => {
    const isDarkTheme = activeTheme === "dark";

    if (!initialContent || initialContent.trim() === "") {
      return {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: isDarkTheme ? "#121212" : "#ffffff",
        },
        files: {},
      };
    }

    try {
      const parsed = JSON.parse(initialContent);
      let rawElements: any[] = [];
      let rawAppState: any = {};
      let rawFiles: any = {};

      if (Array.isArray(parsed)) {
        rawElements = parsed;
      } else if (parsed && typeof parsed === "object") {
        rawElements = Array.isArray(parsed.elements) ? parsed.elements : [];
        rawAppState = parsed.appState || {};
        rawFiles = parsed.files || {};
      }

      const restoredElements = restoreElements(rawElements, null);
      const restoredState = restoreAppState(
        {
          ...rawAppState,
          theme: isDarkTheme ? "dark" : "light",
        },
        null
      );

      return {
        elements: restoredElements,
        appState: {
          ...restoredState,
          theme: isDarkTheme ? "dark" : "light",
        },
        files: rawFiles,
        scrollToContent: true,
      };
    } catch (err) {
      console.warn("Could not parse drawing JSON content:", err);
      return {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: isDarkTheme ? "#121212" : "#ffffff",
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

  const getDrawingSignature = (
    nextElements: readonly ExcalidrawElement[],
    nextAppState: AppState
  ) => {
    const elemSig = nextElements
      .map((e) => `${e.id}:${e.version}:${e.isDeleted}`)
      .join(";");
    return `${elemSig}|${nextAppState.viewBackgroundColor ?? ""}|${nextAppState.gridSize ?? ""}`;
  };

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

      const currentSig = getDrawingSignature(nextElements, nextAppState);

      // On initial mount / scene setup, establish the baseline signature and do not fire onChange
      if (initialSignatureRef.current === null) {
        initialSignatureRef.current = currentSig;
        return;
      }

      // If nothing has actually changed in document elements or document properties, ignore event
      if (currentSig === initialSignatureRef.current) {
        return;
      }

      if (onChangeRef.current) {
        try {
          const serialized = serializeAsJSON(
            nextElements,
            nextAppState,
            nextFiles,
            "local"
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
      if (current.theme !== activeTheme) {
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
