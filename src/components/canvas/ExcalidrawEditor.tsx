"use client";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Excalidraw,
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
import type { DrawingCanvasHandle } from "./DrawingCanvas";
import engineeringStyles from "@/features/engineering-canvas/engineering-sidebar.module.scss";
import { useTheme } from "~/components/ThemeProvider";
import { areExcalidrawScenesEquivalent } from "~/components/workspace/diffUtils";
import {
  safeLocalStorageSet,
  idbSetDoc,
  idbDeleteDoc,
  idbSaveSnapshot,
} from "~/lib/storageEngine";
import { Sparkles } from "lucide-react";
import { VisualNotesModal } from "./VisualNotesModal";

interface ExcalidrawEditorProps {
  fileId?: string;
  initialContent?: string;
  lastSavedContent?: string;
  theme?: "light" | "dark";
  onChange?: (content: string) => void;
  onSave?: () => void;
  editorRef?: React.Ref<DrawingCanvasHandle>;
}

export default function ExcalidrawEditor({
  fileId,
  initialContent = "",
  lastSavedContent,
  theme: propTheme,
  onChange,
  onSave,
  editorRef,
}: ExcalidrawEditorProps) {
  const { isDark } = useTheme();
  const activeTheme = propTheme ?? (isDark ? "dark" : "light");

  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const elementsRef = useRef<readonly ExcalidrawElement[]>([]);
  const appStateRef = useRef<AppState | null>(null);
  const filesRef = useRef<BinaryFiles>({});
  const [isVisualNotesModalOpen, setIsVisualNotesModalOpen] = useState(false);

  const fileIdRef = useRef<string | undefined>(fileId);
  fileIdRef.current = fileId;

  const lastSavedContentRef = useRef<string | undefined>(lastSavedContent);
  lastSavedContentRef.current = lastSavedContent;

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
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Fast signature using version numbers, counts, and update timestamps
  const getDrawingSignature = (
    nextElements: readonly ExcalidrawElement[],
    nextAppState?: Partial<AppState> | null
  ) => {
    let vSum = 0;
    let count = 0;
    let lastModified = 0;
    for (let i = 0; i < nextElements.length; i++) {
      const el = nextElements[i];
      if (el && !el.isDeleted) {
        vSum = (vSum * 31 + el.version + el.versionNonce) | 0;
        if (el.updated && el.updated > lastModified) {
          lastModified = el.updated;
        }
        count++;
      }
    }
    const bgSig = nextAppState?.viewBackgroundColor ? `|bg:${nextAppState.viewBackgroundColor}` : "";
    return `${count}:${vSum}:${lastModified}${bgSig}`;
  };

  const serializeCurrentScene = useCallback(() => {
    let elements: readonly ExcalidrawElement[] = elementsRef.current;
    let appState: AppState | null = appStateRef.current;
    let files: BinaryFiles = filesRef.current;

    if (api && !api.isDestroyed) {
      try {
        const liveElements = api.getSceneElements();
        if (liveElements && liveElements.length > 0) {
          elements = liveElements;
        }
        const liveState = api.getAppState();
        if (liveState) {
          appState = liveState;
        }
        const liveFiles = api.getFiles();
        if (liveFiles) {
          files = liveFiles;
        }
      } catch (e) {
        console.warn("Failed to read live scene from Excalidraw API:", e);
      }
    }

    if (pendingSaveArgsRef.current) {
      if (pendingSaveArgsRef.current.elements?.length) {
        elements = pendingSaveArgsRef.current.elements;
      }
      if (pendingSaveArgsRef.current.appState) {
        appState = pendingSaveArgsRef.current.appState;
      }
      if (pendingSaveArgsRef.current.files) {
        files = pendingSaveArgsRef.current.files;
      }
    }

    if ((!elements || elements.length === 0) && initialDataRef.current?.elements?.length) {
      elements = initialDataRef.current.elements;
    }

    if (!appState) {
      appState = {
        theme: activeTheme,
        viewBackgroundColor: activeTheme === "dark" ? "#121212" : "#ffffff",
      } as AppState;
    }

    try {
      return serializeAsJSON(elements || [], appState, files || {}, "local");
    } catch (e) {
      console.error("Failed to serialize Excalidraw scene:", e);
      return null;
    }
  }, [api, activeTheme]);

  // Synchronous flush that writes directly to localStorage draft and snapshot history
  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingSaveArgsRef.current = null;

    const serialized = serializeCurrentScene();
    if (!serialized) return null;

    lastLoadedContentRef.current = serialized;

    const id = fileIdRef.current;
    if (id && typeof window !== "undefined") {
      const baseline = lastSavedContentRef.current || "";
      const isEquivalent = areExcalidrawScenesEquivalent(baseline, serialized);

      if (isEquivalent) {
        // Document is clean and matches saved baseline: ensure no phantom draft exists
        try {
          localStorage.removeItem(`netherite_draft_${id}`);
        } catch {}
        void idbDeleteDoc(`netherite_draft_${id}`);
      } else {
        // Document actually has unsaved modifications: persist draft + snapshot safely
        try {
          safeLocalStorageSet(`netherite_draft_${id}`, serialized);
          void idbSetDoc(`netherite_draft_${id}`, serialized);
          void idbSaveSnapshot(id, serialized);
        } catch (err) {
          console.warn("Failed to write Excalidraw draft:", err);
        }
      }
    }

    if (onChangeRef.current) {
      onChangeRef.current(serialized);
    }
    return serialized;
  }, [serializeCurrentScene]);

  // Expose imperative handle to parent (WorkspaceLayout)
  useImperativeHandle(
    editorRef,
    () => ({
      flush,
      getSerializedScene: serializeCurrentScene,
    }),
    [flush, serializeCurrentScene]
  );

  // Parse initial content safely with official Excalidraw restoration
  const initialData = useMemo<ExcalidrawInitialDataState>(() => {
    const isDarkTheme = activeTheme === "dark";

    // If cached initialData is already valid for current content, avoid re-parsing
    if (initialDataRef.current && initialContent === lastLoadedContentRef.current) {
      return initialDataRef.current;
    }
    lastLoadedContentRef.current = initialContent;

    if (!initialContent || (typeof initialContent === "string" && initialContent.trim() === "")) {
      initialSignatureRef.current = "0:0:0";
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
      initialSignatureRef.current = "0:0:0";
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
      const state = nextApi.getAppState();
      appStateRef.current = state;
      if (typeof window !== "undefined" && state?.activeTool?.type) {
        window.dispatchEvent(
          new CustomEvent("netherite:excalidraw-active-tool", {
            detail: { tool: state.activeTool.type },
          })
        );
      }
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
      filesRef.current = nextFiles;

      if (typeof window !== "undefined" && nextAppState.activeTool?.type) {
        window.dispatchEvent(
          new CustomEvent("netherite:excalidraw-active-tool", {
            detail: { tool: nextAppState.activeTool.type },
          })
        );
      }

      const currentSig = getDrawingSignature(nextElements, nextAppState);

      // On initial mount / scene setup, establish baseline signature
      if (initialSignatureRef.current === null) {
        initialSignatureRef.current = currentSig;
        return;
      }

      // If nothing has actually changed in document elements or properties, ignore event
      if (currentSig === initialSignatureRef.current) {
        return;
      }

      // Record new signature baseline
      initialSignatureRef.current = currentSig;

      pendingSaveArgsRef.current = {
        elements: nextElements,
        appState: nextAppState,
        files: nextFiles,
      };

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Fast 150ms debounce for UI responsiveness + local draft persistence
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        if (pendingSaveArgsRef.current) {
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

            // Manage draft storage: only store if actually modified from baseline
            const id = fileIdRef.current;
            if (id && typeof window !== "undefined") {
              const baseline = lastSavedContentRef.current || "";
              if (areExcalidrawScenesEquivalent(baseline, serialized)) {
                try {
                  localStorage.removeItem(`netherite_draft_${id}`);
                } catch {}
                void idbDeleteDoc(`netherite_draft_${id}`);
              } else {
                safeLocalStorageSet(`netherite_draft_${id}`, serialized);
                void idbSetDoc(`netherite_draft_${id}`, serialized);
              }
            }

            if (onChangeRef.current) {
              onChangeRef.current(serialized);
            }
          } catch (e) {
            console.error("Failed to serialize drawing elements:", e);
          }
        }
      }, 150);
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

  // Flush immediately on pointer release (mouse up / finger lift after drawing a stroke or moving a shape)
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const handlePointerRelease = () => {
      if (pendingSaveArgsRef.current) {
        flush();
      }
    };

    shell.addEventListener("pointerup", handlePointerRelease, { passive: true });
    shell.addEventListener("touchend", handlePointerRelease, { passive: true });

    return () => {
      shell.removeEventListener("pointerup", handlePointerRelease);
      shell.removeEventListener("touchend", handlePointerRelease);
    };
  }, [flush]);

  // Synchronous flush on unmount: write directly to localStorage for this specific fileId ONLY if modified!
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const serialized = serializeCurrentScene();
      const id = fileIdRef.current;
      if (serialized && id && typeof window !== "undefined") {
        const baseline = lastSavedContentRef.current || "";
        if (areExcalidrawScenesEquivalent(baseline, serialized)) {
          try {
            localStorage.removeItem(`netherite_draft_${id}`);
          } catch {}
          void idbDeleteDoc(`netherite_draft_${id}`);
        } else {
          try {
            safeLocalStorageSet(`netherite_draft_${id}`, serialized);
            void idbSetDoc(`netherite_draft_${id}`, serialized);
            void idbSaveSnapshot(id, serialized);
          } catch {}
        }
      }
    };
  }, [serializeCurrentScene]);

  // Flush on beforeunload and visibility change (page hidden)
  useEffect(() => {
    const handleBeforeUnload = () => {
      flush();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flush]);

  // Global Ctrl+S handler for sketch canvas (scoped to when canvas is focused/hovered)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        const activeEl = document.activeElement;
        const target = e.target as HTMLElement | null;
        const isInside =
          (target && shellRef.current?.contains(target)) ||
          (activeEl && shellRef.current?.contains(activeEl));
        if (!isInside) return;

        e.preventDefault();
        e.stopPropagation();
        flush();
        if (onSaveRef.current) {
          onSaveRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [flush]);

  // Mobile / Native custom event command bridge
  useEffect(() => {
    const handleExcalidrawCommand = (e: Event) => {
      const customEvent = e as CustomEvent<{ tool?: string; action?: string }>;
      const { tool, action } = customEvent.detail || {};

      if (action === "undo") {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "z",
            code: "KeyZ",
            ctrlKey: true,
            bubbles: true,
          })
        );
      } else if (action === "redo") {
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "z",
            code: "KeyZ",
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
          })
        );
      } else if (tool && api && !api.isDestroyed) {
        try {
          api.setActiveTool({ type: tool as any });
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("netherite:excalidraw-active-tool", {
                detail: { tool },
              })
            );
          }
        } catch (err) {
          console.warn("Failed to set active tool:", err);
        }
      }
    };

    window.addEventListener("netherite:excalidraw-command", handleExcalidrawCommand);
    return () => {
      window.removeEventListener("netherite:excalidraw-command", handleExcalidrawCommand);
    };
  }, [api]);

  return (
    <div
      ref={shellRef}
      data-excalidraw-container="true"
      data-canvas-container="true"
      className={`${engineeringStyles.editorShell} mobile-canvas-container ${
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
        renderCustomToolbarButton={() => (
          <button
            type="button"
            onClick={() => setIsVisualNotesModalOpen(true)}
            title="Generate Visual Notes from Markdown"
            aria-label="Visual Notes"
            className="ToolIcon_type_button flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-500 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}
        UIOptions={{
          canvasActions: {
            loadScene: false, // keep everything native in Netherite
          },
        }}
      />
      <VisualNotesModal
        isOpen={isVisualNotesModalOpen}
        onClose={() => setIsVisualNotesModalOpen(false)}
        api={api}
        currentTheme={activeTheme}
      />
    </div>
  );
}
