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
  editorFont?: "sans" | "serif" | "mono";
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
          e.preventDefault();
          handleCommit();
        }
      }}
      placeholder="Untitled"
      className="w-full text-3xl sm:text-4xl font-bold tracking-tight bg-transparent text-foreground placeholder:text-muted-foreground/30 focus:outline-none border-none pb-2 transition-all font-sans"
    />
  );
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
}: Props) {
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

  const fontClass =
    editorFont === "serif"
      ? "font-serif"
      : editorFont === "mono"
      ? "font-mono"
      : "font-sans";

  const isInternalUpdateRef = useRef(false);
  const lastLoadedContentRef = useRef<string>(initialContent);

  const editor = useEditor({
    extensions: buildExtensions(async (file: File) => {
      if (onImageUpload) {
        await onImageUpload(file);
      }
    }),
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
          if (onImageUpload) {
            onImageUpload(imageFile).then((src) => {
              const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coords) {
                const node = view.state.schema.nodes.image?.create({ src });
                if (node) {
                  view.dispatch(view.state.tr.insert(coords.pos, node));
                  return;
                }
              }
              editor.chain().focus().setImage({ src }).run();
            });
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(imageFile);
          }
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files || []);
        const imageFile = files.find((f) => f.type.startsWith("image/"));

        if (imageFile && editor) {
          event.preventDefault();
          if (onImageUpload) {
            onImageUpload(imageFile).then((src) => {
              editor.chain().focus().setImage({ src }).run();
            });
          } else {
            const reader = new FileReader();
            reader.onload = () => {
              const src = reader.result as string;
              editor.chain().focus().setImage({ src }).run();
            };
            reader.readAsDataURL(imageFile);
          }
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
      isInternalUpdateRef.current = true;
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
    if (!editor) return;

    // If the change came from our own editor actions, ignore it
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    // Only update if initialContent actually changed from what the editor currently holds
    if (initialContent !== undefined && initialContent !== lastLoadedContentRef.current) {
      // If user is focused and actively typing, do not overwrite
      if (editor.isFocused && editor.getText().trim().length > 0) {
        return;
      }

      lastLoadedContentRef.current = initialContent;
      const processed = preprocessMarkdownMath(initialContent);
      editor.commands.setContent(processed, { emitUpdate: false });
      isInternalUpdateRef.current = true;
      transformMathInEditor(editor);
    }
  }, [editor, initialContent]);

  // Expose editor instance via onEditorReady
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Keyboard shortcut Ctrl+S / Cmd+S for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
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

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        setFontSize((prev) => {
          const next = Math.min(32, Math.max(11, prev + delta));
          if (typeof window !== "undefined") {
            localStorage.setItem("netherite_editor_font_size", next.toString());
          }
          return next;
        });
        setShowZoomBadge(true);
        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => setShowZoomBadge(false), 1500);
      }
    };

    let initialDist = 0;
    let initialSize = 15;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
        initialDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialSize = fontSize;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0 && e.touches[0] && e.touches[1]) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / initialDist;
        const next = Math.min(32, Math.max(11, Math.round(initialSize * ratio)));
        setFontSize(next);
        if (typeof window !== "undefined") {
          localStorage.setItem("netherite_editor_font_size", next.toString());
        }
        setShowZoomBadge(true);
        if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
        zoomTimeoutRef.current = setTimeout(() => setShowZoomBadge(false), 1500);
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      if (zoomTimeoutRef.current) clearTimeout(zoomTimeoutRef.current);
    };
  }, [fontSize, mounted, isLoading, editor]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      if (onImageUpload) {
        try {
          const src = await onImageUpload(file);
          editor.chain().focus().setImage({ src }).run();
        } catch (err) {
          console.error("Image upload failed:", err);
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
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
      <div className="w-full h-full flex flex-col p-8 sm:p-12 space-y-6 bg-card border border-border rounded-xl animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3" />
        <div className="space-y-3">
          <div className="h-4 bg-muted/60 rounded w-full" />
          <div className="h-4 bg-muted/60 rounded w-5/6" />
          <div className="h-4 bg-muted/60 rounded w-4/6" />
        </div>
        <div className="h-28 bg-muted/40 rounded-xl w-full border border-border/50" />
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
        <div className="max-w-7xl  mx-auto px-4 sm:px-16 py-6 sm:py-12 min-h-full">
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
              zoomTimeoutRef.current = setTimeout(() => setShowZoomBadge(false), 1500);
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
    </div>
  );
}
