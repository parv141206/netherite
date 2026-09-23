"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useEffect, useState, useRef } from "react";
import { buildExtensions } from "./extensions";
import {
  preprocessMarkdownMath,
  postprocessMathMarkdown,
  insertMathTextIntoEditor,
  transformMathInEditor,
} from "./MathExtension";
import { useTheme } from "~/components/ThemeProvider";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Sigma,
  Table as TableIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Highlighter,
  Minus,
  Workflow,
  Activity,
} from "lucide-react";

interface Props {
  initialContent?: string;
  title?: string;
  onTitleChange?: (newTitle: string) => void;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onImageUpload?: (file: File) => Promise<string>;
  onEditorReady?: (editor: any) => void;
  onStatsChange?: (stats: { words: number; chars: number }) => void;
  isLoading?: boolean;
  editorFont?: string;
  textOnlyClipboard?: boolean;
}

/**
 * Serializes a ProseMirror Slice into clean plain text,
 * stripping Markdown formatting syntax (# headings, **bold**, *italic*, lists markers, etc.).
 */
export function serializeSliceToPlainText(slice: any): string {
  if (!slice || !slice.content) return "";

  const leafHandler = (node: any) => {
    if (node.type.name === "mathInline" || node.type.name === "mathBlock") {
      return node.attrs?.latex || "";
    }
    if (node.type.name === "image") {
      return node.attrs?.alt || node.attrs?.title || "";
    }
    if (node.type.name === "hardBreak") {
      return "\n";
    }
    return "";
  };

  const serializeNode = (node: any): string => {
    if (node.isText) {
      return node.text || "";
    }
    if (
      node.type.name === "bulletList" ||
      node.type.name === "orderedList" ||
      node.type.name === "taskList"
    ) {
      const items: string[] = [];
      node.forEach((item: any) => {
        const itemText = serializeNode(item);
        if (itemText) items.push(itemText);
      });
      return items.join("\n");
    }
    if (node.type.name === "listItem" || node.type.name === "taskItem") {
      const subParts: string[] = [];
      node.forEach((child: any) => {
        const childText = serializeNode(child);
        if (childText) subParts.push(childText);
      });
      return subParts.join("\n");
    }
    if (node.type.name === "table") {
      const rows: string[] = [];
      node.forEach((row: any) => {
        const cells: string[] = [];
        row.forEach((cell: any) => {
          cells.push(
            cell.content.textBetween(0, cell.content.size, " ", leafHandler).trim()
          );
        });
        rows.push(cells.join("\t"));
      });
      return rows.join("\n");
    }
    return node.textBetween(0, node.content.size, "\n\n", leafHandler);
  };

  const parts: string[] = [];
  slice.content.forEach((node: any) => {
    const s = serializeNode(node);
    if (s !== "") parts.push(s);
  });
  return parts.join("\n\n");
}

function DocumentTitleInput({
  title,
  onTitleChange,
}: {
  title: string;
  onTitleChange?: (newTitle: string) => void;
}) {
  const cleanTitle = title.replace(/\.md$/i, "");
  const [val, setVal] = useState(cleanTitle);

  useEffect(() => {
    setVal(title.replace(/\.md$/i, ""));
  }, [title]);

  const handleCommit = () => {
    const trimmed = val.trim();
    const finalName = trimmed.length > 0 ? (trimmed.endsWith(".md") ? trimmed : `${trimmed}.md`) : "Untitled.md";
    if (onTitleChange && finalName !== title) {
      onTitleChange(finalName);
    }
  };

  return (
    <input
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
      placeholder="Untitled"
      className="w-full text-3xl sm:text-4xl font-bold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-none pb-2 transition-all font-dynamic-editor"
    />
  );
}

function replacePlaceholderWithImage(
  editorInstance: any,
  uploadId: string,
  src: string,
) {
  if (!editorInstance || editorInstance.isDestroyed) return;
  let targetPos: number | null = null;
  let targetNodeSize = 1;

  editorInstance.state.doc.descendants((node: any, pos: number) => {
    if (
      node.type.name === "imagePlaceholder" &&
      node.attrs.uploadId === uploadId
    ) {
      targetPos = pos;
      targetNodeSize = node.nodeSize;
      return false;
    }
  });

  if (targetPos !== null) {
    const nodeType =
      editorInstance.state.schema.nodes.imageResize ||
      editorInstance.state.schema.nodes.image;
    if (nodeType) {
      const replacementNode = nodeType.create({ src });
      editorInstance.view.dispatch(
        editorInstance.state.tr.replaceWith(
          targetPos,
          targetPos + targetNodeSize,
          replacementNode,
        ),
      );
      return;
    }
  }

  // Fallback if placeholder was already cleared or moved
  editorInstance.chain().focus().setImage({ src }).run();
}

export function Editor({
  initialContent = "",
  title = "Untitled",
  onTitleChange,
  onChange,
  onSave,
  onImageUpload,
  onEditorReady,
  onStatsChange,
  isLoading = false,
  editorFont = "sans",
  textOnlyClipboard: propTextOnlyClipboard,
}: Props) {
  const themeContext = useTheme();
  const modernUi = themeContext?.modernUi ?? false;
  const textOnlyClipboard = propTextOnlyClipboard ?? themeContext?.textOnlyClipboard ?? false;
  const textOnlyClipboardRef = useRef(textOnlyClipboard);
  useEffect(() => {
    textOnlyClipboardRef.current = textOnlyClipboard;
  }, [textOnlyClipboard]);

  const [mounted, setMounted] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Editor Font Size State (Zoom & Pinch-to-zoom)
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("netherite_editor_font_size");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 11 && parsed <= 32) return parsed;
      }
    }
    return 15;
  });
  const [showZoomBadge, setShowZoomBadge] = useState(false);
  const zoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fontClass = `font-dynamic-editor ${
    editorFont === "serif"
      ? "font-serif"
      : editorFont === "mono"
      ? "font-mono"
      : "font-sans"
  }`;

  const isInternalUpdateRef = useRef(false);
  const lastLoadedContentRef = useRef<string>(initialContent);

  const editor = useEditor({
    extensions: buildExtensions(),
    content: preprocessMarkdownMath(initialContent),
    editorProps: {
      attributes: {
        class: `prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[500px] text-foreground text-sm leading-relaxed ${fontClass}`,
        spellcheck: "true",
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));
        if (imageFile && editor) {
          event.preventDefault();
          const uploadId = `up-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });

          const reader = new FileReader();
          reader.onload = () => {
            const tempSrc = reader.result as string;
            const placeholderType = view.state.schema.nodes.imagePlaceholder;
            if (placeholderType) {
              const node = placeholderType.create({
                uploadId,
                tempSrc,
                fileName: imageFile.name,
                fileSize: imageFile.size,
              });
              const insertPos = coords ? coords.pos : view.state.selection.from;
              view.dispatch(view.state.tr.insert(insertPos, node));
            }

            if (onImageUpload) {
              onImageUpload(imageFile)
                .then((src) => {
                  if (src) {
                    replacePlaceholderWithImage(editor, uploadId, src);
                  } else if (tempSrc) {
                    replacePlaceholderWithImage(editor, uploadId, tempSrc);
                  }
                })
                .catch(() => {
                  if (tempSrc) {
                    replacePlaceholderWithImage(editor, uploadId, tempSrc);
                  }
                });
            } else if (tempSrc) {
              replacePlaceholderWithImage(editor, uploadId, tempSrc);
            }
          };
          reader.readAsDataURL(imageFile);
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));

        if (imageFile && editor) {
          event.preventDefault();
          const uploadId = `up-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          const reader = new FileReader();
          reader.onload = () => {
            const tempSrc = reader.result as string;
            const placeholderType = view.state.schema.nodes.imagePlaceholder;
            if (placeholderType) {
              const node = placeholderType.create({
                uploadId,
                tempSrc,
                fileName: imageFile.name || "pasted-image.png",
                fileSize: imageFile.size,
              });
              const insertPos = view.state.selection.from;
              view.dispatch(view.state.tr.insert(insertPos, node));
            }

            if (onImageUpload) {
              onImageUpload(imageFile)
                .then((src) => {
                  if (src) {
                    replacePlaceholderWithImage(editor, uploadId, src);
                  } else if (tempSrc) {
                    replacePlaceholderWithImage(editor, uploadId, tempSrc);
                  }
                })
                .catch(() => {
                  if (tempSrc) {
                    replacePlaceholderWithImage(editor, uploadId, tempSrc);
                  }
                });
            } else if (tempSrc) {
              replacePlaceholderWithImage(editor, uploadId, tempSrc);
            }
          };
          reader.readAsDataURL(imageFile);
          return true;
        }

        const text = event.clipboardData?.getData("text/plain");
        const html = event.clipboardData?.getData("text/html");

        if (editor && (text || html)) {
          // If cursor is inside a code block, insert raw text directly to preserve all indentation and whitespace
          if (editor.isActive("codeBlock")) {
            event.preventDefault();
            const rawText = text || "";
            if (rawText) {
              view.dispatch(view.state.tr.insertText(rawText));
            }
            return true;
          }

          event.preventDefault();

          if (html && (html.includes("katex") || html.includes("annotation"))) {
            editor.commands.insertContent(html);
            transformMathInEditor(editor);
            return true;
          }

          const rawInput = text || "";
          const processedText = preprocessMarkdownMath(rawInput);

          try {
            const markdownParser = (editor.storage as any).markdown?.parser;
            if (markdownParser && typeof markdownParser.parse === "function") {
              const parsedDoc = markdownParser.parse(processedText);
              if (parsedDoc) {
                editor.commands.insertContent(parsedDoc);
                transformMathInEditor(editor);
                return true;
              }
            }
          } catch (err) {
            console.warn("Markdown parser error on paste, falling back to insertContent:", err);
          }

          editor.commands.insertContent(processedText);
          transformMathInEditor(editor);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        copy(view, event) {
          if (!textOnlyClipboardRef.current) return false;
          const sel = view.state.selection;
          if (sel.empty) return false;
          const plainText = serializeSliceToPlainText(sel.content());
          if (event.clipboardData) {
            event.preventDefault();
            event.clipboardData.clearData();
            event.clipboardData.setData("text/plain", plainText);
            return true;
          }
          return false;
        },
        cut(view, event) {
          if (!textOnlyClipboardRef.current) return false;
          const sel = view.state.selection;
          if (sel.empty) return false;
          const plainText = serializeSliceToPlainText(sel.content());
          if (event.clipboardData) {
            event.preventDefault();
            event.clipboardData.clearData();
            event.clipboardData.setData("text/plain", plainText);
            view.dispatch(
              view.state.tr
                .deleteSelection()
                .scrollIntoView()
                .setMeta("uiEvent", "cut")
            );
            return true;
          }
          return false;
        },
      },
    },
    onUpdate({ editor, transaction }) {
      if (!transaction.docChanged) return;

      const rawMarkdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
      const formattedMarkdown = postprocessMathMarkdown(rawMarkdown);

      isInternalUpdateRef.current = true;
      lastLoadedContentRef.current = formattedMarkdown;

      if (onChange) {
        onChange(formattedMarkdown);
      }

      // Check stats
      const words = editor.storage.characterCount?.words() || 0;
      const chars = editor.storage.characterCount?.characters() || 0;
      if (onStatsChange) {
        onStatsChange({ words, chars });
      }

      // Check slash menu trigger
      const { selection } = editor.state;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, selection.from - 20),
        selection.from,
        "\n"
      );

      if (textBefore.endsWith("/")) {
        setShowSlashMenu(true);
      } else if (showSlashMenu && !textBefore.includes("/")) {
        setShowSlashMenu(false);
      }
    },
    onCreate({ editor }) {
      transformMathInEditor(editor);
      const rawMarkdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
      const formattedMarkdown = postprocessMathMarkdown(rawMarkdown);
      lastLoadedContentRef.current = formattedMarkdown;
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update content and transform math when note changes from outside
  useEffect(() => {
    if (!editor || initialContent === undefined) return;

    // If the content is identical to what the editor already loaded, do nothing
    if (initialContent === lastLoadedContentRef.current) {
      return;
    }

    // If the change came from user typing in this editor, update reference and skip
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      lastLoadedContentRef.current = initialContent;
      return;
    }

    // External content change (e.g. note fetched from Drive / switched tab)
    lastLoadedContentRef.current = initialContent;
    const processed = preprocessMarkdownMath(initialContent);
    editor.commands.setContent(processed, { emitUpdate: false });
    transformMathInEditor(editor);
  }, [editor, initialContent]);

  // Expose editor instance via onEditorReady
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
    return () => {
      if (onEditorReady) {
        onEditorReady(null);
      }
    };
  }, [editor, onEditorReady]);

  // Jump, scroll, and luminous flash-highlight search term if opened from Global Search
  useEffect(() => {
    if (!editor || isLoading) return;

    const checkSearchJump = () => {
      try {
        const jumpTerm = sessionStorage.getItem("netherite_search_jump");
        if (!jumpTerm) return;
        sessionStorage.removeItem("netherite_search_jump");

        const term = jumpTerm.trim().toLowerCase();
        if (!term) return;

        // 1. Traverse ProseMirror document to select the matched text
        let targetPos: number | null = null;
        let matchLength = jumpTerm.length;

        editor.state.doc.descendants((node, pos) => {
          if (targetPos !== null) return false;
          if (node.isText && node.text) {
            const idx = node.text.toLowerCase().indexOf(term);
            if (idx !== -1) {
              targetPos = pos + idx;
              matchLength = term.length;
              return false;
            }
          }
        });

        if (targetPos !== null) {
          editor.commands.setTextSelection({
            from: targetPos,
            to: targetPos + matchLength,
          });
          editor.commands.scrollIntoView();
        }

        // 2. Locate DOM element for glowing visual flash
        setTimeout(() => {
          const editorDom = editor.view.dom;
          const walker = document.createTreeWalker(editorDom, NodeFilter.SHOW_TEXT);
          let targetDomNode: Node | null = null;
          while (walker.nextNode()) {
            if (walker.currentNode.nodeValue?.toLowerCase().includes(term)) {
              targetDomNode = walker.currentNode;
              break;
            }
          }

          if (targetDomNode && targetDomNode.parentElement) {
            const el = targetDomNode.parentElement;
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add(
              "ring-2",
              "ring-yellow-400",
              "bg-yellow-200/40",
              "dark:bg-yellow-900/40",
              "rounded-md",
              "transition-all",
              "duration-500"
            );
            setTimeout(() => {
              el.classList.remove(
                "ring-2",
                "ring-yellow-400",
                "bg-yellow-200/40",
                "dark:bg-yellow-900/40"
              );
            }, 3000);
          }
        }, 150);
      } catch (err) {
        console.warn("Search jump error:", err);
      }
    };

    const timer = setTimeout(checkSearchJump, 250);
    return () => clearTimeout(timer);
  }, [editor, initialContent, isLoading]);

  // Keyboard shortcut Ctrl+S / Cmd+S for save (isolated to active editor)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        const activeEl = document.activeElement;
        const target = e.target as HTMLElement | null;
        const isContained =
          (activeEl && editorContainerRef.current?.contains(activeEl)) ||
          (target && editorContainerRef.current?.contains(target));
        if (!isContained) return;

        e.preventDefault();
        if (onSave) onSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave]);

  // Touchpad pinch-to-zoom & Ctrl + MouseWheel font size scaling
  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    let wheelAcc = 0;
    let initialDist = 0;
    let initialSize = fontSize;

    const applyFontSize = (updater: (prev: number) => number) => {
      setFontSize((prev) => {
        const next = updater(prev);
        if (typeof window !== "undefined") {
          localStorage.setItem("netherite_editor_font_size", next.toString());
        }
        return next;
      });
      setShowZoomBadge(true);
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = setTimeout(() => setShowZoomBadge(false), 1500);
    };

    const isCanvasOrEmbedded = (target: HTMLElement | null) =>
      !!target?.closest?.(
        "[data-mermaid-container], [data-excalidraw-container], .excalidraw, [data-canvas-container], [data-tikz-container], [data-uml-container]"
      );

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      // If the event target is not within this editor's container, completely ignore it
      if (!target || !container.contains(target)) {
        return;
      }

      if (isCanvasOrEmbedded(target)) {
        // Allow event to reach canvas/diagram container's listener without adjusting editor font size
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        // ALWAYS prevent Chrome's native browser zoom inside the editor container
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (Math.abs(e.deltaY) >= 40) {
          // Discrete mouse wheel notch (typically +/- 100 or 120)
          const delta = e.deltaY < 0 ? 1 : -1;
          applyFontSize((prev) => Math.min(32, Math.max(11, prev + delta)));
          wheelAcc = 0;
        } else {
          // Continuous trackpad pinch delta
          wheelAcc += e.deltaY;
          if (Math.abs(wheelAcc) >= 15) {
            const delta = wheelAcc < 0 ? 1 : -1;
            applyFontSize((prev) => Math.min(32, Math.max(11, prev + delta)));
            wheelAcc = 0;
          }
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target) || isCanvasOrEmbedded(target)) {
        return;
      }

      if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialSize = fontSize;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target) || isCanvasOrEmbedded(target)) {
        return;
      }
      if (e.touches.length === 2 && initialDist > 0 && e.touches[0] && e.touches[1]) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / initialDist;
        const next = Math.min(32, Math.max(11, Math.round(initialSize * ratio)));
        applyFontSize(() => next);
      }
    };

    const handleGestureStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target) || isCanvasOrEmbedded(target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const handleGestureChange = (e: any) => {
      const target = e.target as HTMLElement | null;
      if (!target || !container.contains(target) || isCanvasOrEmbedded(target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.scale && e.scale !== 1) {
        const delta = e.scale > 1 ? 1 : -1;
        applyFontSize((prev) => Math.min(32, Math.max(11, prev + delta)));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const activeEl = document.activeElement;
        const target = e.target as HTMLElement | null;
        const isContained =
          (activeEl && container.contains(activeEl)) ||
          (target && container.contains(target));
        if (!isContained) return;

        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          e.stopPropagation();
          applyFontSize((prev) => Math.min(32, prev + 1));
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          e.stopPropagation();
          applyFontSize((prev) => Math.max(11, prev - 1));
        } else if (e.key === "0") {
          e.preventDefault();
          e.stopPropagation();
          applyFontSize(() => 15);
        }
      }
    };

    // Attach capture-phase listeners to prevent WebKit/browser native page zoom
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    document.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    container.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    container.addEventListener("touchstart", handleTouchStart, { passive: true, capture: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false, capture: true });

    window.addEventListener("gesturestart", handleGestureStart, { passive: false, capture: true });
    window.addEventListener("gesturechange", handleGestureChange, { passive: false, capture: true });
    window.addEventListener("gestureend", handleGestureStart, { passive: false, capture: true });

    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener("wheel", handleWheel, { capture: true });
      document.removeEventListener("wheel", handleWheel, { capture: true });
      container.removeEventListener("wheel", handleWheel, { capture: true });

      container.removeEventListener("touchstart", handleTouchStart, { capture: true });
      container.removeEventListener("touchmove", handleTouchMove, { capture: true });

      window.removeEventListener("gesturestart", handleGestureStart, { capture: true });
      window.removeEventListener("gesturechange", handleGestureChange, { capture: true });
      window.removeEventListener("gestureend", handleGestureStart, { capture: true });

      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, [fontSize, mounted, isLoading, editor]);

  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const uploadId = `up-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const reader = new FileReader();
      reader.onload = () => {
        const tempSrc = reader.result as string;
        const placeholderType = editor.state.schema.nodes.imagePlaceholder;
        if (placeholderType) {
          const node = placeholderType.create({
            uploadId,
            tempSrc,
            fileName: file.name,
            fileSize: file.size,
          });
          editor.view.dispatch(
            editor.state.tr.insert(editor.state.selection.from, node),
          );
        }

        if (onImageUpload) {
          onImageUpload(file)
            .then((src) => {
              if (src) {
                replacePlaceholderWithImage(editor, uploadId, src);
              } else if (tempSrc) {
                replacePlaceholderWithImage(editor, uploadId, tempSrc);
              }
            })
            .catch(() => {
              if (tempSrc) {
                replacePlaceholderWithImage(editor, uploadId, tempSrc);
              }
            });
        } else if (tempSrc) {
          replacePlaceholderWithImage(editor, uploadId, tempSrc);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const insertInlineMath = (defaultLatex?: string) => {
    if (!editor) return;
    const latex = defaultLatex !== undefined ? defaultLatex : prompt("Enter Inline LaTeX Formula (e.g. \\sigma or E=mc^2):", "\\sigma");
    if (latex) {
      editor
        .chain()
        .focus()
        .insertContent(`<span data-type="math-inline" data-latex="${encodeURIComponent(latex)}"></span> `)
        .run();
    }
  };

  const insertBlockMath = (defaultLatex?: string) => {
    if (!editor) return;
    const latex = defaultLatex !== undefined ? defaultLatex : prompt(
      "Enter Display Block LaTeX (e.g. \\text{Range} = 55 - 26 = 29):",
      "\\text{Range} = 55 - 26 = 29"
    );
    if (latex) {
      editor
        .chain()
        .focus()
        .insertContent(`\n<div data-type="math-block" data-latex="${encodeURIComponent(latex)}"></div>\n`)
        .run();
    }
  };

  useEffect(() => {
    const handleCommand = (e: any) => {
      if (!editor) return;
      const cmd = e.detail?.command;
      if (cmd === "math-inline") {
        insertInlineMath(e.detail?.payload);
      } else if (cmd === "math-block") {
        insertBlockMath(e.detail?.payload);
      } else if (cmd === "bold") {
        editor.chain().focus().toggleBold().run();
      } else if (cmd === "italic") {
        editor.chain().focus().toggleItalic().run();
      } else if (cmd === "h1") {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      } else if (cmd === "h2") {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      } else if (cmd === "bullet") {
        editor.chain().focus().toggleBulletList().run();
      } else if (cmd === "task") {
        editor.chain().focus().toggleTaskList().run();
      } else if (cmd === "ordered") {
        editor.chain().focus().toggleOrderedList().run();
      } else if (cmd === "quote") {
        editor.chain().focus().toggleBlockquote().run();
      } else if (cmd === "code") {
        editor.chain().focus().toggleCodeBlock().run();
      } else if (cmd === "undo") {
        editor.chain().focus().undo().run();
      } else if (cmd === "redo") {
        editor.chain().focus().redo().run();
      }
    };
    window.addEventListener("netherite:editor-command" as any, handleCommand);
    return () => window.removeEventListener("netherite:editor-command" as any, handleCommand);
  }, [editor]);

  const insertTable = () => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const executeSlashCommand = (command: () => void) => {
    if (!editor) return;
    const { selection } = editor.state;
    editor.commands.deleteRange({ from: selection.from - 1, to: selection.from });
    command();
    setShowSlashMenu(false);
  };

  if (!mounted || !editor || isLoading) {
    return (
      <div
        data-editor-container="true"
        style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties}
        className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative select-none"
      >
        {/* Placeholder toolbar to prevent layout shift */}
        <div className="hidden sm:flex px-4 py-1.5 border-b border-border/40 bg-background/80 items-center gap-1 text-xs shrink-0 opacity-40">
          <div className="h-6 w-24 bg-muted/50 rounded" />
          <div className="h-4 w-[1px] bg-border mx-1" />
          <div className="h-6 w-32 bg-muted/40 rounded" />
        </div>

        {/* Seamless Document Skeleton */}
        <div className="flex-1 w-full overflow-y-auto px-4 sm:px-12 py-8 sm:py-12 max-w-4xl mx-auto flex flex-col gap-6">
          <div className="w-full">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground/80 font-dynamic-editor pb-2">
              {title.replace(/\.md$/i, "") || "Untitled"}
            </h1>
          </div>
          <div className="space-y-3.5 pt-2 animate-pulse opacity-60">
            <div className="h-4 bg-muted/70 rounded-md w-11/12" />
            <div className="h-4 bg-muted/60 rounded-md w-full" />
            <div className="h-4 bg-muted/60 rounded-md w-4/5" />
            <div className="h-4 bg-muted/50 rounded-md w-9/12" />
            <div className="h-8 bg-muted/30 rounded-lg w-full mt-4" />
            <div className="h-4 bg-muted/60 rounded-md w-5/6" />
            <div className="h-4 bg-muted/50 rounded-md w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const slashCommands = [
    {
      title: "Heading 1",
      sub: "Large section heading",
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      title: "Heading 2",
      sub: "Medium section heading",
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      title: "Heading 3",
      sub: "Small section heading",
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      title: "Inline Math Formula",
      sub: "LaTeX math inline equation (\\( ... \\))",
      icon: Sigma,
      action: insertInlineMath,
    },
    {
      title: "Display Math Block",
      sub: "LaTeX centered math block (\\[ ... \\])",
      icon: Sigma,
      action: insertBlockMath,
    },
    {
      title: "Bullet List",
      sub: "Create a bulleted list",
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      sub: "Create an ordered list",
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Task Checklist",
      sub: "Track tasks with checkable items",
      icon: CheckSquare,
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      title: "Quote Block",
      sub: "Capture a blockquote",
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      title: "Code Block",
      sub: "Syntax-highlighted code snippet (e.g. ```java)",
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      title: "Mermaid Diagram",
      sub: "Interactive diagram (flowchart, sequence, class, state)",
      icon: Workflow,
      action: () =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: "codeBlock",
            attrs: { language: "mermaid" },
            content: [
              {
                type: "text",
                text: "graph TD\n    Start([Start]) --> Process[Process Data]\n    Process --> Done([Done])",
              },
            ],
          })
          .run(),
    },
    {
      title: "TikZ LaTeX Diagram",
      sub: "Vector LaTeX TikZ diagram (neural nets, FSM, trees, geometry)",
      icon: Activity,
      action: () =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: "codeBlock",
            attrs: { language: "tikz" },
            content: [
              {
                type: "text",
                text: "\\begin{tikzpicture}[node distance=2cm, auto, >=stealth]\n  \\node [circle, draw=blue!80, fill=blue!10, thick] (A) {Input};\n  \\node [rectangle, draw=purple!80, fill=purple!10, thick, right of=A, node distance=3cm] (B) {Processing};\n  \\node [circle, draw=green!80, fill=green!10, thick, right of=B, node distance=3cm] (C) {Output};\n  \\path [->, thick] (A) edge node {x} (B);\n  \\path [->, thick] (B) edge node {f(x)} (C);\n\\end{tikzpicture}",
              },
            ],
          })
          .run(),
    },
    {
      title: "Insert Table",
      sub: "Add a grid table",
      icon: TableIcon,
      action: insertTable,
    },
    {
      title: "Upload Image to Drive",
      sub: "Upload image to Netherite/assets folder",
      icon: ImageIcon,
      action: () => fileInputRef.current?.click(),
    },
    {
      title: "Divider",
      sub: "Horizontal rule separator",
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  const highlightColors = [
    { name: "Yellow", color: "var(--highlight-yellow)" },
    { name: "Green", color: "var(--highlight-green)" },
    { name: "Blue", color: "var(--highlight-blue)" },
    { name: "Pink", color: "var(--highlight-pink)" },
    { name: "Purple", color: "var(--highlight-purple)" },
  ];

  return (
    <div
      ref={editorContainerRef}
      data-editor-container="true"
      style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties}
      className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden relative"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Editor Formatting Toolbar Header (Desktop only; mobile uses dedicated Obsidian ribbon) */}
      {modernUi ? (
        <div className="hidden sm:flex px-4 py-1.5 border-b border-border/30 bg-background/70 backdrop-blur-md items-center overflow-x-auto scrollbar-none gap-2 text-xs sticky top-0 z-20 select-none shrink-0">
          {/* Group 1: Text Styles */}
          <div className="flex items-center gap-0.5 bg-accent/25 p-0.5 rounded-lg border border-border/25">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("bold") ? "bg-accent text-foreground font-bold shadow-2xs" : "text-muted-foreground"
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("italic") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("underline") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("strike") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("highlight") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Highlight"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 2: Headings & Blockquote */}
          <div className="flex items-center gap-0.5 bg-accent/25 p-0.5 rounded-lg border border-border/25">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("heading", { level: 1 }) ? "bg-accent text-foreground font-bold shadow-2xs" : "text-muted-foreground"
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("heading", { level: 2 }) ? "bg-accent text-foreground font-bold shadow-2xs" : "text-muted-foreground"
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("heading", { level: 3 }) ? "bg-accent text-foreground font-bold shadow-2xs" : "text-muted-foreground"
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("blockquote") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 3: Lists */}
          <div className="flex items-center gap-0.5 bg-accent/25 p-0.5 rounded-lg border border-border/25">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("bulletList") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("orderedList") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded-md hover:bg-accent/80 transition-colors ${
                editor.isActive("taskList") ? "bg-accent text-foreground shadow-2xs" : "text-muted-foreground"
              }`}
              title="Task List"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 4: Inserts & Media */}
          <div className="flex items-center gap-0.5 bg-accent/25 p-0.5 rounded-lg border border-border/25">
            <button
              onClick={() => insertInlineMath()}
              className="px-2 py-1 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground font-mono text-[11px] flex items-center gap-1 transition-colors"
              title="Inline Math \( ... \)"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>Inline</span>
            </button>
            <button
              onClick={() => insertBlockMath()}
              className="px-2 py-1 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground font-mono text-[11px] flex items-center gap-1 transition-colors"
              title="Display Math Block \[ ... \]"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
            <button
              onClick={insertTable}
              className="p-1.5 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Insert Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Upload Image to Assets"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Group 5: History */}
          <div className="ml-auto flex items-center gap-0.5 bg-accent/25 p-0.5 rounded-lg border border-border/25">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded-md hover:bg-accent/80 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex px-4 py-1.5 border-b border-border/40 bg-background/80 backdrop-blur-md items-center overflow-x-auto scrollbar-none gap-1 text-xs sticky top-0 z-20 select-none shrink-0">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("bold") ? "bg-accent text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("italic") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("underline") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("strike") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("highlight") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("heading", { level: 1 }) ? "bg-accent text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("heading", { level: 2 }) ? "bg-accent text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("heading", { level: 3 }) ? "bg-accent text-foreground font-bold" : "text-muted-foreground"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("bulletList") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("orderedList") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("taskList") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Task List"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded hover:bg-accent ${
              editor.isActive("blockquote") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
            title="Quote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-border mx-1" />

          <button
            onClick={() => insertInlineMath()}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground font-mono text-xs flex items-center gap-1"
            title="Inline Math \( ... \)"
          >
            <Sigma className="w-3.5 h-3.5" /> Inline
          </button>

          <button
            onClick={() => insertBlockMath()}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground font-mono text-xs flex items-center gap-1"
            title="Display Math Block \[ ... \]"
          >
            <Sigma className="w-3.5 h-3.5" /> Block
          </button>

          <button
            onClick={insertTable}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Upload Image to Google Drive Assets"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:opacity-30"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Selection Bubble Menu with Color Highlighting */}
      {editor && (
        <BubbleMenu
          editor={editor}
          className="flex items-center gap-1 p-1 bg-card border border-border rounded-xl shadow-xl z-50 text-xs backdrop-blur-md"
        >
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded hover:bg-accent ${
              editor.isActive("bold") ? "bg-accent text-foreground font-bold" : "text-muted-foreground"
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded hover:bg-accent ${
              editor.isActive("italic") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded hover:bg-accent ${
              editor.isActive("underline") ? "bg-accent text-foreground" : "text-muted-foreground"
            }`}
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-[1px] bg-border mx-0.5" />

          {/* Color Highlight Options */}
          {highlightColors.map((hc) => (
            <button
              key={hc.name}
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHighlight({ color: hc.color })
                  .run()
              }
              className="w-4 h-4 rounded-full border border-border/80 hover:scale-110 transition-transform"
              style={{ backgroundColor: hc.color }}
              title={`Highlight ${hc.name}`}
            />
          ))}

          <button
            onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="text-[10px] text-muted-foreground hover:text-foreground px-1"
            title="Clear Highlight"
          >
            Clear
          </button>

          <div className="h-3 w-[1px] bg-border mx-0.5" />

          <button
            onClick={() => insertInlineMath()}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
            title="Inline Math"
          >
            <Sigma className="w-3.5 h-3.5" />
          </button>
        </BubbleMenu>
      )}

      {/* Floating Slash Menu Popover */}
      {showSlashMenu && (
        <div className="absolute left-12 top-24 w-64 max-h-72 bg-card border border-border rounded-xl shadow-2xl overflow-y-auto p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            Insert Block
          </div>
          {slashCommands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.title}
                onClick={() => executeSlashCommand(cmd.action)}
                className="w-full text-left px-3 py-2 hover:bg-accent rounded-lg flex items-center gap-2.5 transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-muted group-hover:bg-background text-foreground border border-border">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-xs text-foreground">{cmd.title}</div>
                  <div className="text-[10px] text-muted-foreground">{cmd.sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Full-width scroll container so scrollbar docks at window/card edge */}
      <div
        className="flex-1 w-full overflow-y-auto transition-colors duration-200"
        style={{ filter: "var(--editor-filter, none)" }}
      >
        <div
          className={`${
            modernUi
              ? "max-w-4xl lg:max-w-5xl mx-auto px-6 sm:px-12 py-8 sm:py-12"
              : "max-w-7xl mx-auto px-4 sm:px-16 py-6 sm:py-12"
          } min-h-full`}
        >
          {/* Editable Title without .md extension */}
          <div className="mb-6">
            <DocumentTitleInput title={title} onTitleChange={onTitleChange} />
          </div>

          {/* TipTap Document Area */}
          <EditorContent editor={editor} className={`w-full ${fontClass}`} />
        </div>
      </div>

      {/* Floating Zoom Indicator Badge (Only shown briefly on zoom) */}
      {showZoomBadge && (
        <div className="absolute bottom-12 right-6 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-mono font-semibold shadow-2xl border border-border/40 backdrop-blur-md z-40 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-2 select-none pointer-events-none">
          <span>Zoom: {Math.round((fontSize / 15) * 100)}%</span>
          <span className="text-[10px] opacity-70">({fontSize}px)</span>
        </div>
      )}

      {/* Document Footer (Desktop only) */}
      {modernUi ? (
        <div className="hidden sm:flex px-6 py-1.5 border-t border-border/20 bg-background/40 backdrop-blur-xs text-[11px] text-muted-foreground/80 justify-between items-center select-none">
          <div className="flex items-center gap-2.5">
            <span>{editor.storage.characterCount?.words() || 0} words</span>
            <span className="text-border">•</span>
            <span>{editor.storage.characterCount?.characters() || 0} characters</span>
            <span className="text-border">•</span>
            <span>
              {Math.max(
                1,
                Math.ceil((editor.storage.characterCount?.words() || 0) / 200),
              )}{" "}
              min read
            </span>
          </div>
          <div className="flex items-center gap-2.5 font-mono text-[10px]">
            <button
              onClick={() => {
                setFontSize(15);
                if (typeof window !== "undefined") {
                  localStorage.setItem("netherite_editor_font_size", "15");
                }
                setShowZoomBadge(true);
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = setTimeout(
                  () => setShowZoomBadge(false),
                  1500,
                );
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
              title="Reset font zoom (Ctrl + Scroll or Pinch to adjust)"
            >
              Zoom: {Math.round((fontSize / 15) * 100)}%
            </button>
            <span className="text-border">•</span>
            <span className="text-muted-foreground/60">Markdown + KaTeX</span>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex px-6 py-2 border-t border-border/30 bg-background/50 text-[11px] text-muted-foreground justify-between items-center select-none">
          <div className="flex items-center gap-3">
            <span>{editor.storage.characterCount?.words() || 0} words</span>
            <span>•</span>
            <span>{editor.storage.characterCount?.characters() || 0} characters</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <button
              onClick={() => {
                setFontSize(15);
                if (typeof window !== "undefined") {
                  localStorage.setItem("netherite_editor_font_size", "15");
                }
                setShowZoomBadge(true);
                if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
                zoomTimeoutRef.current = setTimeout(
                  () => setShowZoomBadge(false),
                  1500,
                );
              }}
              className="hover:text-foreground transition-colors cursor-pointer"
              title="Reset font zoom (Ctrl + Scroll or Pinch to adjust)"
            >
              Zoom: {Math.round((fontSize / 15) * 100)}%
            </button>
            <span>•</span>
            <span>Markdown + LaTeX KaTeX</span>
          </div>
        </div>
      )}
    </div>
  );
}
