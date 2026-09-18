"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// Engineering sidebar and bottom panel - preserved for future use but disabled per user request
// import {
//   ENGINEERING_PALETTE_TAB,
//   ENGINEERING_SIDEBAR_NAME,
//   EngineeringSidebar,
//   EngineeringSidebarTrigger,
// } from "@/features/engineering-canvas/engineering-sidebar";
// import { EngineeringBottomPanel } from "@/features/engineering-canvas/engineering-bottom-panel";
import engineeringStyles from "@/features/engineering-canvas/engineering-sidebar.module.scss";
import { useTheme } from "~/components/ThemeProvider";
import { Sparkles } from "lucide-react";
import { VisualNotesModal } from "./VisualNotesModal";

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
  const elementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const appStateRef = useRef<AppState | null>(null);
  // const [sidebarDocked, setSidebarDocked] = useState(false);
  const [isVisualNotesModalOpen, setIsVisualNotesModalOpen] = useState(false);

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Track the baseline signature to prevent initial mount / layout from dirtying the note
  const initialSignatureRef = useRef<string | null>(null);
  const lastLoadedContentRef = useRef<string>(initialContent);
  const initialDataRef = useRef<ExcalidrawInitialDataState | null>(null);

  const pendingSaveArgsRef = useRef<{
    elements: readonly ExcalidrawElement[];
    appState: AppState;
    files: BinaryFiles;
  } | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fast signature using version numbers and counts instead of 1000+ string allocations
  const getDrawingSignature = (
    nextElements: readonly ExcalidrawElement[],
    nextAppState?: Partial<AppState> | null
  ) => {
    let vSum = 0;
    let count = 0;
    for (let i = 0; i < nextElements.length; i++) {
      const el = nextElements[i];
      if (el && !el.isDeleted) {
        vSum = (vSum + el.version + el.versionNonce) | 0;
        count++;
      }
    }
    const bgSig = nextAppState?.viewBackgroundColor ? `|bg:${nextAppState.viewBackgroundColor}` : "";
    return `${count}:${vSum}${bgSig}`;
  };

  const flushPendingChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingSaveArgsRef.current && onChangeRef.current) {
      const { elements, appState, files } = pendingSaveArgsRef.current;
      pendingSaveArgsRef.current = null;
      try {
        const serialized = serializeAsJSON(elements, appState, files, "local");
        lastLoadedContentRef.current = serialized;
        onChangeRef.current(serialized);
      } catch (e) {
        console.error("Failed to serialize drawing elements:", e);
      }
    }
  }, []);

  // Parse initial content safely with official Excalidraw restoration
  const initialData = useMemo<ExcalidrawInitialDataState>(() => {
    const isDarkTheme = activeTheme === "dark";

    // If cached initialData is already valid for current content, avoid re-parsing
    if (initialDataRef.current && initialContent === lastLoadedContentRef.current) {
      return initialDataRef.current;
    }
    lastLoadedContentRef.current = initialContent;

    if (!initialContent || (typeof initialContent === "string" && initialContent.trim() === "")) {
      initialSignatureRef.current = "";
      const emptyData: ExcalidrawInitialDataState = {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: isDarkTheme ? "#121212" : "#ffffff",
        },
        files: {},
      };
      initialDataRef.current = emptyData;
      return emptyData;
    }

    try {
      let parsed: any;
      if (typeof initialContent === "string") {
        parsed = JSON.parse(initialContent);
      } else {
        parsed = initialContent;
      }

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

      // Establish baseline signature directly from restored data
      initialSignatureRef.current = getDrawingSignature(restoredElements, restoredState);

      const hasCustomCamera =
        typeof rawAppState?.scrollX === "number" &&
        typeof rawAppState?.scrollY === "number" &&
        (rawAppState.scrollX !== 0 ||
          rawAppState.scrollY !== 0 ||
          (rawAppState.zoom && rawAppState.zoom.value !== 1));

      const constructed: ExcalidrawInitialDataState = {
        elements: restoredElements,
        appState: {
          ...restoredState,
          theme: isDarkTheme ? "dark" : "light",
        },
        files: rawFiles,
        scrollToContent: !hasCustomCamera,
      };
      initialDataRef.current = constructed;
      return constructed;
    } catch (err) {
      console.warn("Could not parse drawing JSON content:", err);
      initialSignatureRef.current = "";
      const fallback: ExcalidrawInitialDataState = {
        elements: [],
        appState: {
          theme: isDarkTheme ? "dark" : "light",
          viewBackgroundColor: isDarkTheme ? "#121212" : "#ffffff",
        },
        files: {},
      };
      initialDataRef.current = fallback;
      return fallback;
    }
  }, [initialContent, activeTheme]);

  const handleApi = useCallback((nextApi: ExcalidrawImperativeAPI | null) => {
    setApi(nextApi);
    if (nextApi) {
      appStateRef.current = nextApi.getAppState();
      // Engineering sidebar auto-open disabled per user request
      /*
      requestAnimationFrame(() => {
        if (nextApi.isDestroyed) {
          return;
        }
        const savedPref =
          typeof window !== "undefined"
            ? localStorage.getItem("netherite_eng_sidebar_open")
            : null;
        const shouldOpen = savedPref === "true";
        if (shouldOpen) {
          nextApi.toggleSidebar({
            name: ENGINEERING_SIDEBAR_NAME,
            tab: ENGINEERING_PALETTE_TAB,
            force: true,
          });
        }
      });
      */
    }
  }, []);

  const handleChange = useCallback(
    (
      nextElements: readonly ExcalidrawElement[],
      nextAppState: AppState,
      nextFiles: BinaryFiles
    ) => {
      elementsRef.current = nextElements;
      appStateRef.current = nextAppState;

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

      // Record new signature baseline
      initialSignatureRef.current = currentSig;

      // Queue debounced serialization to eliminate drag lag on large diagrams
      pendingSaveArgsRef.current = {
        elements: nextElements,
        appState: nextAppState,
        files: nextFiles,
      };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingSaveArgsRef.current && onChangeRef.current) {
          const { elements, appState, files } = pendingSaveArgsRef.current;
          pendingSaveArgsRef.current = null;
          try {
            const serialized = serializeAsJSON(
              elements,
              appState,
              files,
              "local"
            );
            lastLoadedContentRef.current = serialized;
            onChangeRef.current(serialized);
          } catch (e) {
            console.error("Failed to serialize drawing elements:", e);
          }
        }
      }, 300);
    },
    []
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

  // Global Ctrl+S handler for sketch canvas (immediately flushes any pending debounced change)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        flushPendingChange();
        if (onSaveRef.current) {
          onSaveRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      flushPendingChange();
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [flushPendingChange]);

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
        renderTopRightUI={() => (
          <div className="flex items-center gap-1.5 mr-1">
            <button
              type="button"
              onClick={() => setIsVisualNotesModalOpen(true)}
              title="Generate Visual Notes from Markdown"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visual Notes</span>
            </button>
            {/* Custom engineering components sidebar trigger commented out per user request */}
            {/* <EngineeringSidebarTrigger /> */}
          </div>
        )}
        UIOptions={{
          canvasActions: {
            loadScene: false, // keep everything native in Netherite
          },
        }}
      >
        {/* Custom engineering components sidebar & bottom panel commented out per user request */}
        {/*
        <EngineeringSidebar
          api={api}
          docked={sidebarDocked}
          onDock={setSidebarDocked}
        />
        <Footer>
          <EngineeringBottomPanel
            api={api}
            elements={elementsRef.current}
            appState={appStateRef.current}
          />
        </Footer>
        */}
      </Excalidraw>
      <VisualNotesModal
        isOpen={isVisualNotesModalOpen}
        onClose={() => setIsVisualNotesModalOpen(false)}
        api={api}
        currentTheme={activeTheme}
      />
    </div>
  );
}
